import pool from "../config/db.config.js";
import { logAction } from "../utils/audit.js";

// ── GET /assembly/jobs ────────────────────────────────────────────────────────
export const getAssemblyJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.id, j.job_number, j.job_type, j.status, j.smartboard_count,
             j.ops_model_id, j.ram_ddr_version, j.ram_capacity_gb, j.required_date,
             c.name AS client_name, d.name AS district_name,
             om.model_name AS ops_model,
             sb.model_name AS smartboard_model,
             u.full_name AS created_by_name,
             COUNT(au.id) AS units_assembled
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      JOIN districts d ON d.id = j.district_id
      LEFT JOIN ops_models om ON om.id = j.ops_model_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      LEFT JOIN users u ON u.id = j.created_by
      LEFT JOIN assembled_units au ON au.job_id = j.id
      WHERE j.status IN ('created','assembly_in_progress')
      GROUP BY j.id
      ORDER BY j.required_date ASC, j.id DESC
    `);

    const jobIds = rows.map((r) => r.id);
    if (jobIds.length === 0) return res.json({ Status: true, data: [] });

    const [storage] = await pool.query(
      `SELECT jsr.job_id, jsr.role, ss.storage_type, ss.form_factor, ss.interface, ss.capacity_gb
       FROM job_storage_requirements jsr
       JOIN storage_specs ss ON ss.id = jsr.storage_spec_id
       WHERE jsr.job_id IN (?)`,
      [jobIds]
    );
    const storageMap = {};
    for (const row of storage) (storageMap[row.job_id] ??= []).push(row);

    const data = rows.map((job) => ({ ...job, storage_requirements: storageMap[job.id] || [] }));
    res.json({ Status: true, data });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /assembly/jobs/:jobId ─────────────────────────────────────────────────
export const getJobDetail = async (req, res) => {
  try {
    const [[job]] = await pool.query(`
      SELECT j.*, c.name AS client_name, d.name AS district_name,
             om.model_name AS ops_model, sb.model_name AS smartboard_model
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      JOIN districts d ON d.id = j.district_id
      LEFT JOIN ops_models om ON om.id = j.ops_model_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      WHERE j.id = ?`, [req.params.jobId]);
    if (!job) return res.status(404).json({ Status: false, Error: "Job not found" });

    const [storageReqs] = await pool.query(
      `SELECT jsr.*, ss.storage_type, ss.form_factor, ss.interface, ss.capacity_gb
       FROM job_storage_requirements jsr
       JOIN storage_specs ss ON ss.id = jsr.storage_spec_id
       WHERE jsr.job_id = ?`, [job.id]);

    const [mainSwReqs] = await pool.query(
      `SELECT jms.software_catalog_id, msc.name, msc.software_type, msc.version
       FROM job_main_software_requirements jms
       JOIN main_software_catalog msc ON msc.id = jms.software_catalog_id
       WHERE jms.job_id = ?`, [job.id]);

    const [addSwReqs] = await pool.query(
      `SELECT jas.software_id, asc2.name, asc2.version
       FROM job_additional_software jas
       JOIN additional_software_catalog asc2 ON asc2.id = jas.software_id
       WHERE jas.job_id = ?`, [job.id]);

    const [units] = await pool.query(
      `SELECT au.*, io.serial_number AS ops_serial, io.motherboard_serial,
              om.model_name AS ops_model,
              nc.serial_number AS wifi_serial, ncm.model_name AS wifi_model,
              u.full_name AS technician_name
       FROM assembled_units au
       JOIN inventory_ops io ON io.id = au.ops_inventory_id
       JOIN ops_models om ON om.id = io.ops_model_id
       LEFT JOIN inventory_network_cards nc ON nc.id = au.wifi_card_inventory_id
       LEFT JOIN network_card_models ncm ON ncm.id = nc.model_id
       LEFT JOIN users u ON u.id = au.technician_id
       WHERE au.job_id = ?
       ORDER BY au.id ASC`, [job.id]);

    for (const unit of units) {
      const [rams] = await pool.query(
        `SELECT ar.ram_inventory_id, ir.serial_number, ir.brand,
                rs.ddr_version, rs.capacity_gb
         FROM assembly_rams ar
         JOIN inventory_rams ir ON ir.id = ar.ram_inventory_id
         JOIN ram_specs rs ON rs.id = ir.ram_spec_id
         WHERE ar.assembled_unit_id = ?`, [unit.id]);
      const [storages] = await pool.query(
        `SELECT ast.storage_inventory_id, ast.role, ist.serial_number, ist.brand,
                ss.storage_type, ss.form_factor, ss.interface, ss.capacity_gb
         FROM assembly_storage ast
         JOIN inventory_storage ist ON ist.id = ast.storage_inventory_id
         JOIN storage_specs ss ON ss.id = ist.storage_spec_id
         WHERE ast.assembled_unit_id = ?`, [unit.id]);
      const [software] = await pool.query(
        `SELECT ams.software_catalog_id, ams.software_key_id, ams.is_active,
                msc.name, msc.software_type, msc.version,
                msk.license_key, msk.license_type,
                msk.subscription_start_date, msk.subscription_end_date
         FROM assembly_main_software ams
         JOIN main_software_catalog msc ON msc.id = ams.software_catalog_id
         JOIN main_software_keys msk ON msk.id = ams.software_key_id
         WHERE ams.assembled_unit_id = ? AND ams.is_active = 1`, [unit.id]);
      unit.rams = rams;
      unit.storages = storages;
      unit.software = software;
    }

    res.json({
      Status: true,
      data: { ...job, storage_requirements: storageReqs, main_software_requirements: mainSwReqs, additional_software_requirements: addSwReqs, units },
    });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /assembly/available-ops/:jobId ────────────────────────────────────────
export const getAvailableOps = async (req, res) => {
  try {
    const [[job]] = await pool.query("SELECT ops_model_id FROM jobs WHERE id=?", [req.params.jobId]);
    if (!job) return res.status(404).json({ Status: false, Error: "Job not found" });

    const [rows] = await pool.query(`
      SELECT io.id, io.serial_number, io.motherboard_serial, io.batch_id,
             om.model_name, om.processor_core, om.id AS model_id
      FROM inventory_ops io
      JOIN ops_models om ON om.id = io.ops_model_id
      WHERE io.status = 'in_stock'
      ORDER BY (io.ops_model_id = ?) DESC, om.model_name ASC`, [job.ops_model_id]);

    const data = rows.map((r) => ({
      ...r,
      matched: r.model_id === job.ops_model_id,
    }));
    res.json({ Status: true, data, required_model_id: job.ops_model_id });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /assembly/available-ram/:jobId ────────────────────────────────────────
export const getAvailableRam = async (req, res) => {
  try {
    const [[job]] = await pool.query("SELECT ram_ddr_version, ram_capacity_gb FROM jobs WHERE id=?", [req.params.jobId]);
    if (!job) return res.status(404).json({ Status: false, Error: "Job not found" });

    const [rows] = await pool.query(`
      SELECT ir.id, ir.serial_number, ir.brand,
             rs.ddr_version, rs.capacity_gb, rs.id AS spec_id
      FROM inventory_rams ir
      JOIN ram_specs rs ON rs.id = ir.ram_spec_id
      WHERE ir.status = 'in_stock'
      ORDER BY (rs.ddr_version = ?) DESC, rs.capacity_gb DESC`, [job.ram_ddr_version]);

    const data = rows.map((r) => ({
      ...r,
      matched: r.ddr_version === job.ram_ddr_version,
    }));
    res.json({ Status: true, data, required_ddr: job.ram_ddr_version, required_capacity_gb: job.ram_capacity_gb });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /assembly/available-storage/:specId ───────────────────────────────────
export const getAvailableStorage = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ist.id, ist.serial_number, ist.brand,
             ss.storage_type, ss.form_factor, ss.interface, ss.capacity_gb
      FROM inventory_storage ist
      JOIN storage_specs ss ON ss.id = ist.storage_spec_id
      WHERE ist.status = 'in_stock' AND ist.storage_spec_id = ?
      ORDER BY ist.id ASC`, [req.params.specId]);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /assembly/available-network-cards ─────────────────────────────────────
export const getAvailableNetworkCards = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT inc.id, inc.serial_number, ncm.model_name
      FROM inventory_network_cards inc
      JOIN network_card_models ncm ON ncm.id = inc.model_id
      WHERE inc.status = 'in_stock'
      ORDER BY ncm.model_name ASC`);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /assembly/start ──────────────────────────────────────────────────────
export const startAssembly = async (req, res) => {
  const { job_id, ops_inventory_id } = req.body;
  if (!job_id || !ops_inventory_id)
    return res.status(400).json({ Status: false, Error: "job_id and ops_inventory_id are required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[job]] = await conn.query("SELECT id, status, job_type FROM jobs WHERE id=?", [job_id]);
    if (!job) throw new Error("Job not found");
    if (!["created", "assembly_in_progress"].includes(job.status)) throw new Error("Job is not open for assembly");

    const [[ops]] = await conn.query("SELECT id, status FROM inventory_ops WHERE id=?", [ops_inventory_id]);
    if (!ops) throw new Error("OPS unit not found");
    if (ops.status !== "in_stock") throw new Error("OPS unit is not available");

    const [result] = await conn.query(
      `INSERT INTO assembled_units (job_id, ops_inventory_id, technician_id, status, assembly_started_at)
       VALUES (?,?,?,'assembly_in_progress', NOW())`,
      [job_id, ops_inventory_id, req.user.id]);

    await conn.query("UPDATE inventory_ops SET status='assigned' WHERE id=?", [ops_inventory_id]);
    if (job.status === "created")
      await conn.query("UPDATE jobs SET status='assembly_in_progress' WHERE id=?", [job_id]);

    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.started", entityType: "assembled_unit", entityId: result.insertId, details: { job_id, ops_inventory_id }, req });
    res.json({ Status: true, unit_id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /assembly/:unitId/ram ────────────────────────────────────────────────
export const addRam = async (req, res) => {
  const { ram_inventory_id } = req.body;
  if (!ram_inventory_id) return res.status(400).json({ Status: false, Error: "ram_inventory_id required" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[ram]] = await conn.query("SELECT status FROM inventory_rams WHERE id=?", [ram_inventory_id]);
    if (!ram) throw new Error("RAM not found");
    if (ram.status !== "in_stock") throw new Error("RAM is not available");
    await conn.query(
      "INSERT INTO assembly_rams (assembled_unit_id, ram_inventory_id) VALUES (?,?)",
      [req.params.unitId, ram_inventory_id]);
    // trigger handles status update
    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.ram_added", entityType: "assembled_unit", entityId: Number(req.params.unitId), details: { ram_inventory_id }, req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ Status: false, Error: "RAM already added to this unit" });
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── DELETE /assembly/:unitId/ram/:ramId ───────────────────────────────────────
export const removeRam = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM assembly_rams WHERE assembled_unit_id=? AND ram_inventory_id=?",
      [req.params.unitId, req.params.ramId]);
    // trigger handles status revert
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /assembly/:unitId/storage ────────────────────────────────────────────
export const addStorage = async (req, res) => {
  const { storage_inventory_id, role } = req.body;
  if (!storage_inventory_id || !role) return res.status(400).json({ Status: false, Error: "storage_inventory_id and role required" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[st]] = await conn.query("SELECT status FROM inventory_storage WHERE id=?", [storage_inventory_id]);
    if (!st) throw new Error("Storage not found");
    if (st.status !== "in_stock") throw new Error("Storage is not available");
    await conn.query(
      "INSERT INTO assembly_storage (assembled_unit_id, storage_inventory_id, role) VALUES (?,?,?)",
      [req.params.unitId, storage_inventory_id, role]);
    // trigger handles status update
    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.storage_added", entityType: "assembled_unit", entityId: Number(req.params.unitId), details: { storage_inventory_id, role }, req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ Status: false, Error: "Storage already added" });
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── DELETE /assembly/:unitId/storage/:storageId ───────────────────────────────
export const removeStorage = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM assembly_storage WHERE assembled_unit_id=? AND storage_inventory_id=?",
      [req.params.unitId, req.params.storageId]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /assembly/:unitId/wifi ───────────────────────────────────────────────
export const setWifi = async (req, res) => {
  const { wifi_card_inventory_id } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[unit]] = await conn.query("SELECT wifi_card_inventory_id FROM assembled_units WHERE id=?", [req.params.unitId]);
    if (!unit) throw new Error("Unit not found");

    // release previous wifi card if any
    if (unit.wifi_card_inventory_id) {
      await conn.query("UPDATE inventory_network_cards SET status='in_stock' WHERE id=?", [unit.wifi_card_inventory_id]);
    }

    if (wifi_card_inventory_id) {
      const [[card]] = await conn.query("SELECT status FROM inventory_network_cards WHERE id=?", [wifi_card_inventory_id]);
      if (!card) throw new Error("Network card not found");
      if (card.status !== "in_stock") throw new Error("Network card is not available");
      await conn.query("UPDATE inventory_network_cards SET status='assigned' WHERE id=?", [wifi_card_inventory_id]);
    }

    await conn.query("UPDATE assembled_units SET wifi_card_inventory_id=? WHERE id=?",
      [wifi_card_inventory_id || null, req.params.unitId]);
    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.wifi_updated", entityType: "assembled_unit", entityId: Number(req.params.unitId), details: { wifi_card_inventory_id: wifi_card_inventory_id || null }, req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /assembly/:unitId/software ───────────────────────────────────────────
// Creates the key in main_software_keys then assigns it to the unit
export const addSoftware = async (req, res) => {
  const { software_catalog_id, software_key_id, license_key, license_type, subscription_start_date, subscription_end_date } = req.body;
  if (!software_catalog_id || (!software_key_id && !license_key?.trim()))
    return res.status(400).json({ Status: false, Error: "software_catalog_id and a software key are required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // deactivate existing key for same software on this unit if any
    await conn.query(
      "UPDATE assembly_main_software SET is_active=0, unassigned_at=NOW() WHERE assembled_unit_id=? AND software_catalog_id=? AND is_active=1",
      [req.params.unitId, software_catalog_id]);

    let keyId = software_key_id || null;
    if (keyId) {
      const [[key]] = await conn.query(
        "SELECT id FROM main_software_keys WHERE id=? AND software_catalog_id=? AND status='purchased' FOR UPDATE",
        [keyId, software_catalog_id],
      );
      if (!key) throw new Error("Selected software key is no longer available");
    } else {
      const [keyResult] = await conn.query(
        `INSERT INTO main_software_keys (software_catalog_id, license_key, license_type, subscription_start_date, subscription_end_date, status)
         VALUES (?,?,?,?,?,'assigned')`,
        [software_catalog_id, license_key.trim(), license_type || "lifetime",
         subscription_start_date || null, subscription_end_date || null]);
      keyId = keyResult.insertId;
    }

    await conn.query(
      `INSERT INTO assembly_main_software (assembled_unit_id, software_catalog_id, software_key_id, is_active)
       VALUES (?,?,?,1)`,
       [req.params.unitId, software_catalog_id, keyId]);

    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.software_assigned", entityType: "assembled_unit", entityId: Number(req.params.unitId), details: { software_catalog_id, software_key_id: keyId }, req });
    res.json({ Status: true, key_id: keyId });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ Status: false, Error: "License key already exists" });
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── DELETE /assembly/:unitId/software/:catalogId ──────────────────────────────
export const removeSoftware = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[row]] = await conn.query(
      "SELECT software_key_id FROM assembly_main_software WHERE assembled_unit_id=? AND software_catalog_id=? AND is_active=1",
      [req.params.unitId, req.params.catalogId]);
    if (row) {
      await conn.query("UPDATE main_software_keys SET status='purchased' WHERE id=?", [row.software_key_id]);
      await conn.query(
        "UPDATE assembly_main_software SET is_active=0, unassigned_at=NOW() WHERE assembled_unit_id=? AND software_catalog_id=? AND is_active=1",
        [req.params.unitId, req.params.catalogId]);
    }
    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.smartboard_completed", entityType: "job", entityId: Number(job_id), req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

export const completeSmartboardJob = async (req, res) => {
  const { job_id, notes } = req.body;
  if (!job_id) return res.status(400).json({ Status: false, Error: "job_id required" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[job]] = await conn.query("SELECT id, job_type, status FROM jobs WHERE id=?", [job_id]);
    if (!job) throw new Error("Job not found");
    if (job.job_type !== "smartboard") throw new Error("Use unit complete for non-smartboard jobs");
    await conn.query("UPDATE jobs SET status='ready_for_delivery' WHERE id=?", [job_id]);
    await conn.commit();
    void logAction({ userId: req.user.id, action: "assembly.completed", entityType: "assembled_unit", entityId: Number(req.params.unitId), details: { job_id: unit.job_id }, req });
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /assembly/:unitId/complete ───────────────────────────────────────────
export const completeUnit = async (req, res) => {
  const { notes } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[unit]] = await conn.query("SELECT job_id, status FROM assembled_units WHERE id=?", [req.params.unitId]);
    if (!unit) throw new Error("Unit not found");
    if (unit.status === "assembled") throw new Error("Unit already completed");

    await conn.query(
      "UPDATE assembled_units SET status='assembled', assembly_completed_at=NOW(), notes=? WHERE id=?",
      [notes || null, req.params.unitId]);

    // check if all units for this job are assembled → set job ready_for_delivery
    const [[{ pending }]] = await conn.query(
      "SELECT COUNT(*) AS pending FROM assembled_units WHERE job_id=? AND status='assembly_in_progress'",
      [unit.job_id]);
    if (pending === 0)
      await conn.query("UPDATE jobs SET status='ready_for_delivery' WHERE id=?", [unit.job_id]);

    await conn.commit();
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};
