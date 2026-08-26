import pool from "../config/db.config.js";

const nextJobNumber = async (connection) => {
  const year = new Date().getFullYear();
  const [rows] = await connection.query(
    "SELECT job_number FROM jobs WHERE job_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`JOB-${year}-%`],
  );
  const lastNumber = rows[0]?.job_number?.match(/(\d+)$/)?.[1] || "0";
  return `JOB-${year}-${String(Number(lastNumber) + 1).padStart(4, "0")}`;
};

export const getJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.*, c.name AS client_name, sb.model_name AS smartboard_model,
             om.model_name AS ops_model, d.name AS district_name
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      JOIN ops_models om ON om.id = j.ops_model_id
      JOIN districts d ON d.id = j.district_id
      ORDER BY j.id DESC
    `);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const createJob = async (req, res) => {
  const {
    client_id,
    job_type = "both",
    smartboard_model_id,
    smartboard_count,
    ops_model_id,
    ram_ddr_version,
    ram_capacity_gb,
    storage_requirements = [],
    main_software_ids = [],
    additional_software_ids = [],
  } = req.body;

  const needsOps = job_type === "ops" || job_type === "both";
  const needsSmartboard = job_type === "smartboard" || job_type === "both";
  if (
    !client_id ||
    (needsOps && (!ops_model_id || !ram_ddr_version || !ram_capacity_gb)) ||
    (needsSmartboard && !smartboard_model_id)
  )
    return res.status(400).json({
      Status: false,
      Error: "Complete the requirements for the selected job scope",
    });
  if (!["smartboard", "ops", "both"].includes(job_type))
    return res.status(400).json({ Status: false, Error: "Invalid job type" });
  if (
    !Array.isArray(storage_requirements) ||
    !Array.isArray(main_software_ids) ||
    !Array.isArray(additional_software_ids)
  )
    return res
      .status(400)
      .json({ Status: false, Error: "Invalid requirement format" });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[client]] = await connection.query(
      "SELECT district_id FROM clients WHERE id=?",
      [client_id],
    );
    if (!client) throw new Error("Client not found");

    const jobNumber = await nextJobNumber(connection);
    const [jobResult] = await connection.query(
      `INSERT INTO jobs (job_number, job_type, client_id, district_id, smartboard_model_id, smartboard_count, ops_model_id, ram_ddr_version, ram_capacity_gb, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        jobNumber,
        job_type,
        client_id,
        client.district_id,
        smartboard_model_id || null,
        smartboard_model_id ? smartboard_count || 1 : 0,
        ops_model_id || null,
        ram_ddr_version || null,
        ram_capacity_gb || null,
        req.user.id,
      ],
    );
    const jobId = jobResult.insertId;

    for (const requirement of storage_requirements) {
      if (!requirement.role || !requirement.storage_spec_id)
        throw new Error(
          "Each storage requirement needs a role and specification",
        );
      await connection.query(
        "INSERT INTO job_storage_requirements (job_id, storage_spec_id, role) VALUES (?,?,?)",
        [jobId, requirement.storage_spec_id, requirement.role],
      );
    }
    for (const softwareId of main_software_ids) {
      await connection.query(
        "INSERT INTO job_main_software_requirements (job_id, software_catalog_id) VALUES (?,?)",
        [jobId, softwareId],
      );
    }
    for (const softwareId of additional_software_ids) {
      await connection.query(
        "INSERT INTO job_additional_software (job_id, software_id) VALUES (?,?)",
        [jobId, softwareId],
      );
    }

    await connection.commit();
    res.json({ Status: true, id: jobId, job_number: jobNumber });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    connection.release();
  }
};
