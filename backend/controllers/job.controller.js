import pool from "../config/db.config.js";
import { logAction } from "../utils/audit.js";

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
             om.model_name AS ops_model, d.name AS district_name,
             u.full_name AS created_by_name
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      LEFT JOIN ops_models om ON om.id = j.ops_model_id
      JOIN districts d ON d.id = j.district_id
      LEFT JOIN users u ON u.id = j.created_by
      ORDER BY j.id DESC
    `);

    const jobIds = rows.map((r) => r.id);
    if (jobIds.length === 0) return res.json({ Status: true, data: [] });

    const [storage] = await pool.query(
      `SELECT jsr.job_id, jsr.storage_spec_id, jsr.role, ss.storage_type, ss.form_factor, ss.interface, ss.capacity_gb
       FROM job_storage_requirements jsr
       JOIN storage_specs ss ON ss.id = jsr.storage_spec_id
       WHERE jsr.job_id IN (?)`,
      [jobIds],
    );
    const [mainSw] = await pool.query(
      `SELECT jms.job_id, jms.software_catalog_id, msc.name, msc.version, msc.software_type
       FROM job_main_software_requirements jms
       JOIN main_software_catalog msc ON msc.id = jms.software_catalog_id
       WHERE jms.job_id IN (?)`,
      [jobIds],
    );
    const [addSw] = await pool.query(
      `SELECT jas.job_id, jas.software_id, asc2.name, asc2.version
       FROM job_additional_software jas
       JOIN additional_software_catalog asc2 ON asc2.id = jas.software_id
       WHERE jas.job_id IN (?)`,
      [jobIds],
    );

    const storageMap = {};
    const mainSwMap = {};
    const addSwMap = {};
    for (const row of storage) (storageMap[row.job_id] ??= []).push(row);
    for (const row of mainSw) (mainSwMap[row.job_id] ??= []).push(row);
    for (const row of addSw) (addSwMap[row.job_id] ??= []).push(row);

    const data = rows.map((job) => ({
      ...job,
      storage_requirements: storageMap[job.id] || [],
      main_software: mainSwMap[job.id] || [],
      additional_software: addSwMap[job.id] || [],
    }));

    res.json({ Status: true, data });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const createJob = async (req, res) => {
  const {
    client_id,
    job_type = "both",
    job_date,
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
    !job_date ||
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
      `INSERT INTO jobs (job_number, job_type, client_id, district_id, smartboard_model_id, smartboard_count, ops_model_id, ram_ddr_version, ram_capacity_gb, required_date, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
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
        job_date,
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
    void logAction({ userId: req.user.id, action: "job.created", entityType: "job", entityId: jobId, details: { job_number: jobNumber, job_type, client_id }, req });
    res.json({ Status: true, id: jobId, job_number: jobNumber });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    connection.release();
  }
};

// PATCH /jobs/:id — requirements can only change before assembly starts.
export const updateJob = async (req, res) => {
  const {
    client_id, job_type, job_date, smartboard_model_id, smartboard_count,
    ops_model_id, ram_ddr_version, ram_capacity_gb,
    storage_requirements = [], main_software_ids = [], additional_software_ids = [],
  } = req.body;
  const needsOps = job_type === "ops" || job_type === "both";
  const needsSmartboard = job_type === "smartboard" || job_type === "both";
  if (!client_id || !job_date || !["smartboard", "ops", "both"].includes(job_type)
    || (needsOps && (!ops_model_id || !ram_ddr_version || !ram_capacity_gb))
    || (needsSmartboard && !smartboard_model_id))
    return res.status(400).json({ Status: false, Error: "Complete the requirements for the selected job scope" });
  if (![storage_requirements, main_software_ids, additional_software_ids].every(Array.isArray))
    return res.status(400).json({ Status: false, Error: "Invalid requirement format" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[job]] = await conn.query("SELECT id, job_number, status FROM jobs WHERE id=? FOR UPDATE", [req.params.id]);
    if (!job) throw new Error("Job not found");
    const [[unitCount]] = await conn.query("SELECT COUNT(*) AS count FROM assembled_units WHERE job_id=?", [job.id]);
    if (job.status !== "created" || unitCount.count > 0)
      throw new Error("Only jobs that have not entered assembly can be edited");
    const [[client]] = await conn.query("SELECT district_id FROM clients WHERE id=?", [client_id]);
    if (!client) throw new Error("Client not found");
    const roles = new Set();
    for (const requirement of storage_requirements) {
      if (!requirement.role || !requirement.storage_spec_id) throw new Error("Each storage requirement needs a role and specification");
      if (roles.has(requirement.role)) throw new Error("Storage roles must be unique");
      roles.add(requirement.role);
    }
    await conn.query(`
      UPDATE jobs SET job_type=?, client_id=?, district_id=?, smartboard_model_id=?, smartboard_count=?,
        ops_model_id=?, ram_ddr_version=?, ram_capacity_gb=?, required_date=? WHERE id=?`, [
      job_type, client_id, client.district_id, smartboard_model_id || null,
      needsSmartboard ? smartboard_count || 1 : 0, ops_model_id || null,
      ram_ddr_version || null, ram_capacity_gb || null, job_date, job.id,
    ]);
    await conn.query("DELETE FROM job_storage_requirements WHERE job_id=?", [job.id]);
    await conn.query("DELETE FROM job_main_software_requirements WHERE job_id=?", [job.id]);
    await conn.query("DELETE FROM job_additional_software WHERE job_id=?", [job.id]);
    for (const requirement of storage_requirements)
      await conn.query("INSERT INTO job_storage_requirements (job_id, storage_spec_id, role) VALUES (?,?,?)", [job.id, requirement.storage_spec_id, requirement.role]);
    for (const softwareId of [...new Set(main_software_ids)])
      await conn.query("INSERT INTO job_main_software_requirements (job_id, software_catalog_id) VALUES (?,?)", [job.id, softwareId]);
    for (const softwareId of [...new Set(additional_software_ids)])
      await conn.query("INSERT INTO job_additional_software (job_id, software_id) VALUES (?,?)", [job.id, softwareId]);
    await conn.commit();
    void logAction({ userId: req.user.id, action: "job.updated", entityType: "job", entityId: job.id, details: { job_number: job.job_number }, req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally { conn.release(); }
};

// DELETE /jobs/:id — preserve work already begun.
export const deleteJob = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[job]] = await conn.query("SELECT id, job_number, status FROM jobs WHERE id=? FOR UPDATE", [req.params.id]);
    if (!job) throw new Error("Job not found");
    const [[unitCount]] = await conn.query("SELECT COUNT(*) AS count FROM assembled_units WHERE job_id=?", [job.id]);
    if (job.status !== "created" || unitCount.count > 0)
      throw new Error("Only jobs that have not entered assembly can be deleted");
    await conn.query("DELETE FROM jobs WHERE id=?", [job.id]);
    await conn.commit();
    void logAction({ userId: req.user.id, action: "job.deleted", entityType: "job", entityId: job.id, details: { job_number: job.job_number }, req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally { conn.release(); }
};
