import pool from "../config/db.config.js";

const nextRepairNumber = async (conn) => {
  const year = new Date().getFullYear();
  const [rows] = await conn.query(
    "SELECT repair_number FROM repair_jobs WHERE repair_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`SVC-${year}-%`]
  );
  const last = rows[0]?.repair_number?.match(/(\d+)$/)?.[1] || "0";
  return `SVC-${year}-${String(Number(last) + 1).padStart(4, "0")}`;
};

// ── GET /afterservice/jobs ───────────────────────────────────────────────────
export const getAfterServiceJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.id, j.job_number, j.job_type, j.status, j.required_date, j.client_id,
             c.name AS client_name, d.name AS district_name,
             om.model_name AS ops_model, sb.model_name AS smartboard_model,
             COUNT(au.id) AS units_assembled,
             SUM(CASE WHEN au.status = 'assembled' THEN 1 ELSE 0 END) AS units_ready,
             SUM(CASE WHEN rj.id IS NOT NULL THEN 1 ELSE 0 END) AS units_in_repair
      FROM jobs j
      JOIN clients c ON c.id = j.client_id
      JOIN districts d ON d.id = j.district_id
      LEFT JOIN ops_models om ON om.id = j.ops_model_id
      LEFT JOIN smartboard_models sb ON sb.id = j.smartboard_model_id
      LEFT JOIN assembled_units au ON au.job_id = j.id
      LEFT JOIN repair_jobs rj ON rj.assembled_unit_id = au.id AND rj.status NOT IN ('completed','closed')
      WHERE j.status IN ('ready_for_delivery','completed') AND j.job_type != 'smartboard'
      GROUP BY j.id
      HAVING units_assembled > 0
      ORDER BY j.id DESC
    `);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /afterservice/jobs/:jobId/units ───────────────────────────────────────
export const getJobUnits = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT au.id, au.status,
             io.serial_number AS ops_serial, io.motherboard_serial,
             om.model_name AS ops_model,
             rj.id AS active_repair_id, rj.repair_number, rj.status AS repair_status
      FROM assembled_units au
      JOIN inventory_ops io ON io.id = au.ops_inventory_id
      JOIN ops_models om ON om.id = io.ops_model_id
      LEFT JOIN repair_jobs rj ON rj.assembled_unit_id = au.id AND rj.status NOT IN ('completed','closed')
      WHERE au.job_id = ?
      ORDER BY au.id ASC`, [req.params.jobId]);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /afterservice ─────────────────────────────────────────────────────────
export const getRepairs = async (req, res) => {
  const { status, search } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push("rj.status = ?"); params.push(status); }
  if (search) {
    where.push("(rj.repair_number LIKE ? OR c.name LIKE ? OR io.serial_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const clause = where.length ? "WHERE " + where.join(" AND ") : "";
  try {
    const [rows] = await pool.query(`
      SELECT rj.id, rj.repair_number, rj.status, rj.reported_issue, rj.start_date, rj.end_date,
             rj.created_at, rj.notes,
             c.name AS client_name, c.id AS client_id,
             au.id AS unit_id, io.serial_number AS ops_serial, om.model_name AS ops_model,
             u.full_name AS technician_name, u.id AS technician_id
      FROM repair_jobs rj
      JOIN clients c ON c.id = rj.client_id
      JOIN assembled_units au ON au.id = rj.assembled_unit_id
      JOIN inventory_ops io ON io.id = au.ops_inventory_id
      JOIN ops_models om ON om.id = io.ops_model_id
      LEFT JOIN users u ON u.id = rj.technician_id
      ${clause}
      ORDER BY rj.id DESC`, params);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /afterservice/units?serial=xxx ────────────────────────────────────────
export const searchUnits = async (req, res) => {
  const { serial } = req.query;
  if (!serial?.trim()) return res.json({ Status: true, data: [] });
  try {
    const [rows] = await pool.query(`
      SELECT au.id, au.status,
             io.serial_number AS ops_serial, io.motherboard_serial,
             om.model_name AS ops_model,
             c.name AS client_name, c.id AS client_id,
             j.job_number, d.name AS district_name
      FROM assembled_units au
      JOIN inventory_ops io ON io.id = au.ops_inventory_id
      JOIN ops_models om ON om.id = io.ops_model_id
      JOIN jobs j ON j.id = au.job_id
      JOIN clients c ON c.id = j.client_id
      JOIN districts d ON d.id = j.district_id
      WHERE io.serial_number LIKE ? OR io.motherboard_serial LIKE ?
      LIMIT 10`, [`%${serial}%`, `%${serial}%`]);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /afterservice/technicians ─────────────────────────────────────────────
export const getTechnicians = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name FROM users WHERE is_active=1 AND role IN ('admin','manager','technician') ORDER BY full_name"
    );
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /afterservice/:id ─────────────────────────────────────────────────────
export const getRepairDetail = async (req, res) => {
  try {
    const [[rj]] = await pool.query(`
      SELECT rj.*, c.name AS client_name, c.phone AS client_phone,
             au.id AS unit_id, au.status AS unit_status,
             io.serial_number AS ops_serial, io.motherboard_serial,
             om.model_name AS ops_model, om.processor_core,
             u.full_name AS technician_name,
             j.job_number
      FROM repair_jobs rj
      JOIN clients c ON c.id = rj.client_id
      JOIN assembled_units au ON au.id = rj.assembled_unit_id
      JOIN inventory_ops io ON io.id = au.ops_inventory_id
      JOIN ops_models om ON om.id = io.ops_model_id
      JOIN jobs j ON j.id = au.job_id
      LEFT JOIN users u ON u.id = rj.technician_id
      WHERE rj.id = ?`, [req.params.id]);
    if (!rj) return res.status(404).json({ Status: false, Error: "Not found" });

    // current components on the unit
    const [rams] = await pool.query(`
      SELECT ir.serial_number, ir.brand, rs.ddr_version, rs.capacity_gb
      FROM assembly_rams ar
      JOIN inventory_rams ir ON ir.id = ar.ram_inventory_id
      JOIN ram_specs rs ON rs.id = ir.ram_spec_id
      WHERE ar.assembled_unit_id = ?`, [rj.unit_id]);

    const [storages] = await pool.query(`
      SELECT ist.serial_number, ist.brand, ast.role,
             ss.storage_type, ss.form_factor, ss.interface, ss.capacity_gb
      FROM assembly_storage ast
      JOIN inventory_storage ist ON ist.id = ast.storage_inventory_id
      JOIN storage_specs ss ON ss.id = ist.storage_spec_id
      WHERE ast.assembled_unit_id = ?`, [rj.unit_id]);

    const [[wifi]] = await pool.query(`
      SELECT inc.serial_number, ncm.model_name
      FROM assembled_units au
      LEFT JOIN inventory_network_cards inc ON inc.id = au.wifi_card_inventory_id
      LEFT JOIN network_card_models ncm ON ncm.id = inc.model_id
      WHERE au.id = ?`, [rj.unit_id]).then(([r]) => [r[0] || null]);

    const [software] = await pool.query(`
      SELECT msc.name, msc.software_type, msk.license_key, msk.license_type,
             msk.subscription_end_date, ams.software_catalog_id
      FROM assembly_main_software ams
      JOIN main_software_catalog msc ON msc.id = ams.software_catalog_id
      JOIN main_software_keys msk ON msk.id = ams.software_key_id
      WHERE ams.assembled_unit_id = ? AND ams.is_active = 1`, [rj.unit_id]);

    // replacement history
    const [replacements] = await pool.query(`
      SELECT rcr.*, u.full_name AS technician_name
      FROM repair_component_replacements rcr
      LEFT JOIN users u ON u.id = rcr.technician_id
      WHERE rcr.repair_job_id = ?
      ORDER BY rcr.replacement_date DESC`, [req.params.id]);

    res.json({
      Status: true,
      data: { ...rj, rams, storages, wifi, software, replacements },
    });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /afterservice ────────────────────────────────────────────────────────
export const createRepair = async (req, res) => {
  const { assembled_unit_id, client_id, reported_issue, technician_id, start_date } = req.body;
  if (!assembled_unit_id || !client_id || !reported_issue?.trim())
    return res.status(400).json({ Status: false, Error: "assembled_unit_id, client_id and reported_issue are required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Keep the client and unit relationship authoritative on the server and
    // prevent two open repairs being created for the same unit.
    const [[unit]] = await conn.query(`
      SELECT au.id, j.client_id, j.status, j.job_type
      FROM assembled_units au
      JOIN jobs j ON j.id = au.job_id
      WHERE au.id = ?`, [assembled_unit_id]);
    if (!unit) throw new Error("Assembled unit not found");
    if (Number(unit.client_id) !== Number(client_id)) throw new Error("Unit does not belong to this client");
    if (unit.job_type === "smartboard" || !["ready_for_delivery", "completed"].includes(unit.status))
      throw new Error("Unit is not available for after-service");
    const [[activeRepair]] = await conn.query(
      "SELECT id FROM repair_jobs WHERE assembled_unit_id=? AND status NOT IN ('completed','closed') LIMIT 1",
      [assembled_unit_id]
    );
    if (activeRepair) throw new Error("This unit already has an active repair");
    const repairNumber = await nextRepairNumber(conn);
    const [result] = await conn.query(
      `INSERT INTO repair_jobs (repair_number, assembled_unit_id, client_id, reported_issue, technician_id, start_date, status)
       VALUES (?,?,?,?,?,?,'open')`,
      [repairNumber, assembled_unit_id, client_id, reported_issue.trim(),
       technician_id || null, start_date || null]
    );
    await conn.query("UPDATE assembled_units SET status='in_repair' WHERE id=?", [assembled_unit_id]);
    await conn.commit();
    res.json({ Status: true, id: result.insertId, repair_number: repairNumber });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── PATCH /afterservice/:id/status ────────────────────────────────────────────
export const updateStatus = async (req, res) => {
  const { status, notes } = req.body;
  const valid = ["open", "in_progress", "completed", "closed"];
  if (!valid.includes(status)) return res.status(400).json({ Status: false, Error: "Invalid status" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[rj]] = await conn.query("SELECT assembled_unit_id, status FROM repair_jobs WHERE id=?", [req.params.id]);
    if (!rj) throw new Error("Repair not found");

    const updates = { status };
    if (status === "in_progress" && rj.status === "open") updates.start_date = new Date().toISOString().split("T")[0];
    if (status === "completed") updates.end_date = new Date().toISOString().split("T")[0];
    if (notes !== undefined) updates.notes = notes;

    const setCols = Object.keys(updates).map((k) => `${k}=?`).join(", ");
    await conn.query(`UPDATE repair_jobs SET ${setCols} WHERE id=?`, [...Object.values(updates), req.params.id]);

    if (status === "completed" || status === "closed")
      await conn.query("UPDATE assembled_units SET status='assembled' WHERE id=?", [rj.assembled_unit_id]);

    await conn.commit();
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── PATCH /afterservice/:id/assign ────────────────────────────────────────────
export const assignTechnician = async (req, res) => {
  const { technician_id } = req.body;
  try {
    await pool.query("UPDATE repair_jobs SET technician_id=? WHERE id=?", [technician_id || null, req.params.id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /afterservice/:id/replacement ────────────────────────────────────────
// Trigger handles inventory status updates automatically
export const logReplacement = async (req, res) => {
  const { component_type, old_inventory_id, new_inventory_id, notes } = req.body;
  const valid = ["ops", "ram", "storage", "wifi_card", "software_key"];
  if (!valid.includes(component_type))
    return res.status(400).json({ Status: false, Error: "Invalid component_type" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // For software_key: create new key record + update assembly_main_software
    if (component_type === "software_key") {
      const { software_catalog_id, license_key, license_type, subscription_start_date, subscription_end_date } = req.body;
      if (!software_catalog_id || !license_key?.trim())
        throw new Error("software_catalog_id and license_key required for software replacement");

      // deactivate old
      const [[rj]] = await conn.query("SELECT assembled_unit_id FROM repair_jobs WHERE id=?", [req.params.id]);
      await conn.query(
        "UPDATE assembly_main_software SET is_active=0, unassigned_at=NOW() WHERE assembled_unit_id=? AND software_catalog_id=? AND is_active=1",
        [rj.assembled_unit_id, software_catalog_id]
      );
      // create new key
      const [keyRes] = await conn.query(
        `INSERT INTO main_software_keys (software_catalog_id, license_key, license_type, subscription_start_date, subscription_end_date, status)
         VALUES (?,?,?,?,?,'assigned')`,
        [software_catalog_id, license_key.trim(), license_type || "lifetime",
         subscription_start_date || null, subscription_end_date || null]
      );
      await conn.query(
        "INSERT INTO assembly_main_software (assembled_unit_id, software_catalog_id, software_key_id, is_active) VALUES (?,?,?,1)",
        [rj.assembled_unit_id, software_catalog_id, keyRes.insertId]
      );
      await conn.query(
        `INSERT INTO repair_component_replacements (repair_job_id, component_type, old_inventory_id, new_inventory_id, technician_id, notes)
         VALUES (?,?,?,?,?,?)`,
        [req.params.id, component_type, old_inventory_id || null, keyRes.insertId, req.user.id, notes || null]
      );
    } else {
      // For hardware: validate new item is in_stock
      if (new_inventory_id) {
        const tableMap = { ops: "inventory_ops", ram: "inventory_rams", storage: "inventory_storage", wifi_card: "inventory_network_cards" };
        const [[item]] = await conn.query(`SELECT status FROM ${tableMap[component_type]} WHERE id=?`, [new_inventory_id]);
        if (!item) throw new Error("New component not found");
        if (item.status !== "in_stock") throw new Error("New component is not in stock");
      }

      // For OPS replacement: update assembled_unit.ops_inventory_id
      if (component_type === "ops" && new_inventory_id) {
        const [[rj]] = await conn.query("SELECT assembled_unit_id FROM repair_jobs WHERE id=?", [req.params.id]);
        await conn.query("UPDATE assembled_units SET ops_inventory_id=? WHERE id=?", [new_inventory_id, rj.assembled_unit_id]);
      }

      // For wifi_card: update assembled_unit.wifi_card_inventory_id
      if (component_type === "wifi_card") {
        const [[rj]] = await conn.query("SELECT assembled_unit_id FROM repair_jobs WHERE id=?", [req.params.id]);
        await conn.query("UPDATE assembled_units SET wifi_card_inventory_id=? WHERE id=?", [new_inventory_id || null, rj.assembled_unit_id]);
      }

      await conn.query(
        `INSERT INTO repair_component_replacements (repair_job_id, component_type, old_inventory_id, new_inventory_id, technician_id, notes)
         VALUES (?,?,?,?,?,?)`,
        [req.params.id, component_type, old_inventory_id || null, new_inventory_id || null, req.user.id, notes || null]
      );
      // trigger fires here and updates inventory statuses
    }

    await conn.commit();
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── PATCH /afterservice/:id/notes ─────────────────────────────────────────────
export const updateNotes = async (req, res) => {
  try {
    await pool.query("UPDATE repair_jobs SET notes=? WHERE id=?", [req.body.notes || null, req.params.id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};
