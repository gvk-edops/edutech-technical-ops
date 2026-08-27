import pool from "../config/db.config.js";

// ── helpers ───────────────────────────────────────────────────────────────────

const TABLES = {
  ops: {
    inv: "inventory_ops",
    spec: "ops_models",
    specKey: "ops_model_id",
    specLabel: "model_name",
    extraInsert: (b) => ({ motherboard_serial: b.motherboard_serial }),
    extraCols: ", motherboard_serial",
    extraPlaceholders: ", ?",
    extraValues: (b) => [b.motherboard_serial],
  },
  ram: {
    inv: "inventory_rams",
    spec: "ram_specs",
    specKey: "ram_spec_id",
    specLabel: null, // composed
    extraInsert: (b) => ({ brand: b.brand }),
    extraCols: ", brand",
    extraPlaceholders: ", ?",
    extraValues: (b) => [b.brand || null],
  },
  storage: {
    inv: "inventory_storage",
    spec: "storage_specs",
    specKey: "storage_spec_id",
    specLabel: null,
    extraInsert: (b) => ({ brand: b.brand }),
    extraCols: ", brand",
    extraPlaceholders: ", ?",
    extraValues: (b) => [b.brand || null],
  },
  network_card: {
    inv: "inventory_network_cards",
    spec: "network_card_models",
    specKey: "model_id",
    specLabel: "model_name",
    extraInsert: () => ({}),
    extraCols: "",
    extraPlaceholders: "",
    extraValues: () => [],
  },
};

const specLabel = (type, row) => {
  if (type === "ram")
    return `${row.ddr_version} ${row.capacity_gb}GB`;
  if (type === "storage")
    return `${row.storage_type} ${row.form_factor} ${row.interface} ${row.capacity_gb >= 1024 ? row.capacity_gb / 1024 + "TB" : row.capacity_gb + "GB"}`;
  return row.model_name || row.spec_label || "";
};

// ── GET /inventory/:type ──────────────────────────────────────────────────────

export const getInventory = async (req, res) => {
  const t = TABLES[req.params.type];
  if (!t) return res.status(404).json({ Status: false, Error: "Unknown type" });

  const { status, spec_id, batch_id } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push("i.status = ?"); params.push(status); }
  if (spec_id) { where.push(`i.${t.specKey} = ?`); params.push(spec_id); }
  if (batch_id) { where.push("i.batch_id = ?"); params.push(batch_id); }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  try {
    let specJoin = "";
    let specCols = "";
    if (req.params.type === "ram") {
      specJoin = "LEFT JOIN ram_specs s ON s.id = i.ram_spec_id";
      specCols = ", s.ddr_version, s.capacity_gb, s.bus_speed_mhz";
    } else if (req.params.type === "storage") {
      specJoin = "LEFT JOIN storage_specs s ON s.id = i.storage_spec_id";
      specCols = ", s.storage_type, s.form_factor, s.interface, s.capacity_gb";
    } else if (req.params.type === "ops") {
      specJoin = "LEFT JOIN ops_models s ON s.id = i.ops_model_id";
      specCols = ", s.model_name AS spec_label, s.processor_core";
    } else {
      specJoin = "LEFT JOIN network_card_models s ON s.id = i.model_id";
      specCols = ", s.model_name AS spec_label";
    }

    const [rows] = await pool.query(
      `SELECT i.*, b.description AS batch_description ${specCols}
       FROM ${t.inv} i
       LEFT JOIN inventory_batches b ON b.id = i.batch_id
       ${specJoin}
       ${whereClause}
       ORDER BY i.id DESC`,
      params,
    );
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /inventory/:type/specs ────────────────────────────────────────────────

export const getSpecs = async (req, res) => {
  const t = TABLES[req.params.type];
  if (!t) return res.status(404).json({ Status: false, Error: "Unknown type" });
  try {
    const [rows] = await pool.query(`SELECT * FROM ${t.spec} ORDER BY id`);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /inventory/:type/single ──────────────────────────────────────────────

export const addSingle = async (req, res) => {
  const type = req.params.type;
  const t = TABLES[type];
  if (!t) return res.status(404).json({ Status: false, Error: "Unknown type" });

  const { serial_number, spec_id, notes, batch_description } = req.body;
  if (!serial_number?.trim() || !spec_id)
    return res.status(400).json({ Status: false, Error: "serial_number and spec_id are required" });

  if (type === "ops" && !req.body.motherboard_serial?.trim())
    return res.status(400).json({ Status: false, Error: "motherboard_serial is required for OPS" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [batchResult] = await conn.query(
      "INSERT INTO inventory_batches (batch_type, description, created_by) VALUES (?,?,?)",
      [type === "network_card" ? "network_card" : type, batch_description || null, req.user.id],
    );
    const batchId = batchResult.insertId;

    const extraVals = t.extraValues(req.body);
    await conn.query(
      `INSERT INTO ${t.inv} (serial_number, ${t.specKey}, batch_id, notes${t.extraCols}) VALUES (?,?,?,?${t.extraPlaceholders})`,
      [serial_number.trim(), spec_id, batchId, notes || null, ...extraVals],
    );

    await conn.commit();
    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ Status: false, Error: "Serial number already exists" });
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /inventory/:type/batch ───────────────────────────────────────────────

export const addBatch = async (req, res) => {
  const type = req.params.type;
  const t = TABLES[type];
  if (!t) return res.status(404).json({ Status: false, Error: "Unknown type" });

  const { items, batch_description } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ Status: false, Error: "items array is required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [batchResult] = await conn.query(
      "INSERT INTO inventory_batches (batch_type, description, created_by) VALUES (?,?,?)",
      [type === "network_card" ? "network_card" : type, batch_description || null, req.user.id],
    );
    const batchId = batchResult.insertId;

    let inserted = 0;
    const errors = [];
    for (const item of items) {
      if (!item.serial_number?.trim() || !item.spec_id) {
        errors.push(`Skipped: missing serial or spec`);
        continue;
      }
      if (type === "ops" && !item.motherboard_serial?.trim()) {
        errors.push(`Skipped ${item.serial_number}: missing motherboard_serial`);
        continue;
      }
      try {
        const extraVals = t.extraValues(item);
        await conn.query(
          `INSERT INTO ${t.inv} (serial_number, ${t.specKey}, batch_id, notes${t.extraCols}) VALUES (?,?,?,?${t.extraPlaceholders})`,
          [item.serial_number.trim(), item.spec_id, batchId, item.notes || null, ...extraVals],
        );
        inserted++;
      } catch (e) {
        errors.push(`${item.serial_number}: ${e.code === "ER_DUP_ENTRY" ? "duplicate" : e.message}`);
      }
    }

    await conn.commit();
    res.json({ Status: true, inserted, errors });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── PATCH /inventory/:type/:id/status ─────────────────────────────────────────

export const updateStatus = async (req, res) => {
  const t = TABLES[req.params.type];
  if (!t) return res.status(404).json({ Status: false, Error: "Unknown type" });
  const { status } = req.body;
  const valid = ["in_stock", "faulty", "retired", "reserved"];
  if (!valid.includes(status))
    return res.status(400).json({ Status: false, Error: "Invalid status" });
  try {
    await pool.query(`UPDATE ${t.inv} SET status=? WHERE id=?`, [status, req.params.id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /inventory/summary ────────────────────────────────────────────────────

export const getSummary = async (req, res) => {
  try {
    const queries = [
      pool.query("SELECT status, COUNT(*) AS cnt FROM inventory_ops GROUP BY status"),
      pool.query("SELECT status, COUNT(*) AS cnt FROM inventory_rams GROUP BY status"),
      pool.query("SELECT status, COUNT(*) AS cnt FROM inventory_storage GROUP BY status"),
      pool.query("SELECT status, COUNT(*) AS cnt FROM inventory_network_cards GROUP BY status"),
    ];
    const results = await Promise.all(queries);
    const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.status, r.cnt]));
    res.json({
      Status: true,
      data: {
        ops: toMap(results[0][0]),
        ram: toMap(results[1][0]),
        storage: toMap(results[2][0]),
        network_card: toMap(results[3][0]),
      },
    });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /inventory/tree-summary ─────────────────────────────────────────────

export const getTreeSummary = async (req, res) => {
  try {
    const [[ops], [ram], [storage], [network]] = await Promise.all([
      pool.query(
        `SELECT s.id AS spec_id, s.model_name,
          SUM(i.status='in_stock') AS in_stock, SUM(i.status='assigned') AS assigned,
          SUM(i.status='reserved') AS reserved, SUM(i.status='faulty') AS faulty,
          SUM(i.status='retired') AS retired, COUNT(*) AS total
         FROM inventory_ops i JOIN ops_models s ON s.id=i.ops_model_id
         GROUP BY s.id ORDER BY s.model_name`
      ),
      pool.query(
        `SELECT s.id AS spec_id, s.ddr_version, s.capacity_gb,
          SUM(i.status='in_stock') AS in_stock, SUM(i.status='assigned') AS assigned,
          SUM(i.status='reserved') AS reserved, SUM(i.status='faulty') AS faulty,
          SUM(i.status='retired') AS retired, COUNT(*) AS total
         FROM inventory_rams i JOIN ram_specs s ON s.id=i.ram_spec_id
         GROUP BY s.id ORDER BY s.ddr_version, s.capacity_gb`
      ),
      pool.query(
        `SELECT s.id AS spec_id, s.storage_type, s.interface, s.form_factor, s.capacity_gb,
          SUM(i.status='in_stock') AS in_stock, SUM(i.status='assigned') AS assigned,
          SUM(i.status='reserved') AS reserved, SUM(i.status='faulty') AS faulty,
          SUM(i.status='retired') AS retired, COUNT(*) AS total
         FROM inventory_storage i JOIN storage_specs s ON s.id=i.storage_spec_id
         GROUP BY s.id ORDER BY s.storage_type, s.interface, s.form_factor, s.capacity_gb`
      ),
      pool.query(
        `SELECT s.id AS spec_id, s.model_name,
          SUM(i.status='in_stock') AS in_stock, SUM(i.status='assigned') AS assigned,
          SUM(i.status='reserved') AS reserved, SUM(i.status='faulty') AS faulty,
          SUM(i.status='retired') AS retired, COUNT(*) AS total
         FROM inventory_network_cards i JOIN network_card_models s ON s.id=i.model_id
         GROUP BY s.id ORDER BY s.model_name`
      ),
    ]);
    res.json({ Status: true, data: { ops, ram, storage, network_card: network } });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── GET /inventory/:type/spec-summary ─────────────────────────────────────────

export const getSpecSummary = async (req, res) => {
  const type = req.params.type;
  const t = TABLES[type];
  if (!t) return res.status(404).json({ Status: false, Error: "Unknown type" });

  try {
    let specJoin, specCols, groupCol;
    if (type === "ram") {
      specJoin = "JOIN ram_specs s ON s.id = i.ram_spec_id";
      specCols = "s.id AS spec_id, s.ddr_version, s.capacity_gb, s.bus_speed_mhz, NULL AS storage_type, NULL AS form_factor, NULL AS interface, NULL AS model_name, NULL AS processor_core";
      groupCol = "s.id";
    } else if (type === "storage") {
      specJoin = "JOIN storage_specs s ON s.id = i.storage_spec_id";
      specCols = "s.id AS spec_id, NULL AS ddr_version, s.capacity_gb, NULL AS bus_speed_mhz, s.storage_type, s.form_factor, s.interface, NULL AS model_name, NULL AS processor_core";
      groupCol = "s.id";
    } else if (type === "ops") {
      specJoin = "JOIN ops_models s ON s.id = i.ops_model_id";
      specCols = "s.id AS spec_id, NULL AS ddr_version, NULL AS capacity_gb, NULL AS bus_speed_mhz, NULL AS storage_type, NULL AS form_factor, NULL AS interface, s.model_name, s.processor_core";
      groupCol = "s.id";
    } else {
      specJoin = "JOIN network_card_models s ON s.id = i.model_id";
      specCols = "s.id AS spec_id, NULL AS ddr_version, NULL AS capacity_gb, NULL AS bus_speed_mhz, NULL AS storage_type, NULL AS form_factor, NULL AS interface, s.model_name, NULL AS processor_core";
      groupCol = "s.id";
    }

    const [rows] = await pool.query(
      `SELECT ${specCols},
        SUM(i.status = 'in_stock')  AS in_stock,
        SUM(i.status = 'assigned')  AS assigned,
        SUM(i.status = 'reserved')  AS reserved,
        SUM(i.status = 'faulty')    AS faulty,
        SUM(i.status = 'retired')   AS retired,
        COUNT(*)                    AS total
       FROM ${t.inv} i
       ${specJoin}
       GROUP BY ${groupCol}
       ORDER BY total DESC`,
    );
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};
