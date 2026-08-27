import pool from "../config/db.config.js";

// GET /delivery/jobs — jobs that are ready to leave the workshop
export const getDeliveryJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.id, j.job_number, j.job_type, j.required_date,
             c.name AS client_name, d.name AS district_name,
             om.model_name AS ops_model, sb.model_name AS smartboard_model,
             COUNT(au.id) AS unit_count,
             SUM(CASE WHEN au.status = 'assembled' THEN 1 ELSE 0 END) AS awaiting_delivery
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      JOIN districts d ON d.id = j.district_id
      LEFT JOIN ops_models om ON om.id = j.ops_model_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      LEFT JOIN assembled_units au ON au.job_id = j.id
      WHERE j.status = 'ready_for_delivery'
      GROUP BY j.id
      ORDER BY j.required_date ASC, j.id DESC`);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// GET /delivery/jobs/:jobId — units that can be confirmed as delivered
export const getDeliveryJobDetail = async (req, res) => {
  try {
    const [[job]] = await pool.query(`
      SELECT j.id, j.job_number, j.job_type, j.status, j.required_date,
             c.name AS client_name, c.phone AS client_phone,
             d.name AS district_name, om.model_name AS ops_model,
             sb.model_name AS smartboard_model, j.smartboard_count
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      JOIN districts d ON d.id = j.district_id
      LEFT JOIN ops_models om ON om.id = j.ops_model_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      WHERE j.id = ?`, [req.params.jobId]);
    if (!job) return res.status(404).json({ Status: false, Error: "Job not found" });

    const [units] = await pool.query(`
      SELECT au.id, au.status, au.assembly_completed_at, au.delivered_at,
             io.serial_number AS ops_serial, om.model_name AS ops_model
      FROM assembled_units au
      JOIN inventory_ops io ON io.id = au.ops_inventory_id
      JOIN ops_models om ON om.id = io.ops_model_id
      WHERE au.job_id = ?
      ORDER BY au.id`, [job.id]);

    res.json({ Status: true, data: { ...job, units } });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// POST /delivery/jobs/:jobId — deliver selected OPS units, or a smartboard-only job
export const confirmDelivery = async (req, res) => {
  const { unit_ids = [], delivered_at } = req.body;
  if (!Array.isArray(unit_ids))
    return res.status(400).json({ Status: false, Error: "unit_ids must be an array" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[job]] = await conn.query(
      "SELECT id, job_type, status FROM jobs WHERE id=? FOR UPDATE",
      [req.params.jobId],
    );
    if (!job) throw new Error("Job not found");
    if (job.status !== "ready_for_delivery") throw new Error("Job is not ready for delivery");

    if (job.job_type === "smartboard") {
      await conn.query("UPDATE jobs SET status='completed' WHERE id=?", [job.id]);
      await conn.commit();
      return res.json({ Status: true, delivered_count: 0, job_completed: true });
    }

    const ids = [...new Set(unit_ids.map(Number).filter(Number.isInteger))];
    if (ids.length === 0) throw new Error("Select at least one assembled unit");

    const [units] = await conn.query(
      "SELECT id, status FROM assembled_units WHERE job_id=? AND id IN (?) FOR UPDATE",
      [job.id, ids],
    );
    if (units.length !== ids.length) throw new Error("One or more selected units do not belong to this job");
    if (units.some((unit) => unit.status !== "assembled"))
      throw new Error("Only assembled units can be delivered");

    const deliveryTimestamp = delivered_at ? `${delivered_at} 00:00:00` : new Date();
    await conn.query(
      "UPDATE assembled_units SET status='delivered', delivered_at=? WHERE job_id=? AND id IN (?)",
      [deliveryTimestamp, job.id, ids],
    );

    const [[remaining]] = await conn.query(
      "SELECT COUNT(*) AS count FROM assembled_units WHERE job_id=? AND status != 'delivered'",
      [job.id],
    );
    const jobCompleted = remaining.count === 0;
    if (jobCompleted) await conn.query("UPDATE jobs SET status='completed' WHERE id=?", [job.id]);

    await conn.commit();
    res.json({ Status: true, delivered_count: ids.length, job_completed: jobCompleted });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};
