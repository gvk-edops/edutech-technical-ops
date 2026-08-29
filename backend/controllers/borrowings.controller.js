import pool from "../config/db.config.js";
import { logAction } from "../utils/audit.js";

const TABLES = {
  ops: { inv: "inventory_ops", spec: "ops_models", specKey: "ops_model_id", specLabel: "model_name" },
  ram: { inv: "inventory_rams", spec: "ram_specs", specKey: "ram_spec_id" },
  storage: { inv: "inventory_storage", spec: "storage_specs", specKey: "storage_spec_id" },
  network_card: { inv: "inventory_network_cards", spec: "network_card_models", specKey: "model_id", specLabel: "model_name" },
};

// ── GET /api/borrowings ───────────────────────────────────────────────────────

export const getBorrowings = async (req, res) => {
  const { status, technician_id } = req.query;
  const where = [];
  const params = [];

  if (status) {
    where.push("b.status = ?");
    params.push(status);
  }
  if (technician_id) {
    where.push("b.technician_id = ?");
    params.push(technician_id);
  }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  try {
    // We do a UNION ALL to get details from all 4 tables easily, or just 4 separate LEFT JOINs.
    // Given the structure, 4 LEFT JOINs to inventory and their specs might be cleaner.
    const query = `
      SELECT 
        b.id, b.component_type, b.inventory_id, b.borrowed_at, b.returned_at, b.status, b.notes,
        u.full_name AS technician_name,
        COALESCE(i_o.serial_number, i_r.serial_number, i_s.serial_number, i_n.serial_number) AS serial_number,
        CASE
          WHEN b.component_type = 'ops' THEN s_o.model_name
          WHEN b.component_type = 'ram' THEN CONCAT(s_r.ddr_version, ' ', s_r.capacity_gb, 'GB')
          WHEN b.component_type = 'storage' THEN CONCAT(s_s.storage_type, ' ', s_s.form_factor, ' ', s_s.interface, ' ', s_s.capacity_gb, 'GB')
          WHEN b.component_type = 'network_card' THEN s_n.model_name
        END AS item_details
      FROM technician_borrowings b
      JOIN users u ON b.technician_id = u.id
      LEFT JOIN inventory_ops i_o ON b.component_type = 'ops' AND b.inventory_id = i_o.id
      LEFT JOIN ops_models s_o ON i_o.ops_model_id = s_o.id
      LEFT JOIN inventory_rams i_r ON b.component_type = 'ram' AND b.inventory_id = i_r.id
      LEFT JOIN ram_specs s_r ON i_r.ram_spec_id = s_r.id
      LEFT JOIN inventory_storage i_s ON b.component_type = 'storage' AND b.inventory_id = i_s.id
      LEFT JOIN storage_specs s_s ON i_s.storage_spec_id = s_s.id
      LEFT JOIN inventory_network_cards i_n ON b.component_type = 'network_card' AND b.inventory_id = i_n.id
      LEFT JOIN network_card_models s_n ON i_n.model_id = s_n.id
      ${whereClause}
      ORDER BY b.borrowed_at DESC
    `;

    const [rows] = await pool.query(query, params);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /api/borrowings/lend ─────────────────────────────────────────────────

export const lendItem = async (req, res) => {
  const { technician_id, component_type, inventory_id, notes } = req.body;

  if (!technician_id || !component_type || !inventory_id) {
    return res.status(400).json({ Status: false, Error: "Missing required fields" });
  }

  const t = TABLES[component_type];
  if (!t) return res.status(400).json({ Status: false, Error: "Invalid component_type" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if the item is in_stock
    const [[item]] = await conn.query(`SELECT id, status, serial_number FROM ${t.inv} WHERE id = ? FOR UPDATE`, [inventory_id]);
    
    if (!item) {
      throw new Error("Inventory item not found");
    }
    
    if (item.status !== "in_stock") {
      throw new Error(`Cannot lend item because its status is '${item.status}'`);
    }

    // Insert into technician_borrowings
    const [result] = await conn.query(
      `INSERT INTO technician_borrowings (technician_id, component_type, inventory_id, notes) VALUES (?, ?, ?, ?)`,
      [technician_id, component_type, inventory_id, notes || null]
    );

    // Update inventory item status
    await conn.query(`UPDATE ${t.inv} SET status = 'borrowed' WHERE id = ?`, [inventory_id]);

    await conn.commit();
    void logAction({
      userId: req.user.id,
      action: "borrowings.lent",
      entityType: "technician_borrowings",
      entityId: result.insertId,
      details: { technician_id, component_type, serial_number: item.serial_number },
      req
    });

    res.json({ Status: true, borrowingId: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── GET /api/borrowings/scan ──────────────────────────────────────────────────
export const scanInventory = async (req, res) => {
  const { serial_number } = req.query;
  if (!serial_number) return res.status(400).json({ Status: false, Error: "serial_number is required" });
  
  try {
    const qOps = "SELECT id as inventory_id, 'ops' AS component_type, serial_number, status, (SELECT model_name FROM ops_models WHERE id=ops_model_id) as item_details FROM inventory_ops WHERE serial_number=?";
    const qRam = "SELECT id as inventory_id, 'ram' AS component_type, serial_number, status, (SELECT CONCAT(ddr_version, ' ', capacity_gb, 'GB') FROM ram_specs WHERE id=ram_spec_id) as item_details FROM inventory_rams WHERE serial_number=?";
    const qStorage = "SELECT id as inventory_id, 'storage' AS component_type, serial_number, status, (SELECT CONCAT(storage_type, ' ', form_factor, ' ', interface, ' ', capacity_gb, 'GB') FROM storage_specs WHERE id=storage_spec_id) as item_details FROM inventory_storage WHERE serial_number=?";
    const qNetwork = "SELECT id as inventory_id, 'network_card' AS component_type, serial_number, status, (SELECT model_name FROM network_card_models WHERE id=model_id) as item_details FROM inventory_network_cards WHERE serial_number=?";
    
    const queries = [qOps, qRam, qStorage, qNetwork];
    for (const q of queries) {
      const [[item]] = await pool.query(q, [serial_number]);
      if (item) {
        return res.json({ Status: true, data: item });
      }
    }
    
    return res.status(404).json({ Status: false, Error: "Item not found" });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// ── POST /api/borrowings/lend-batch ───────────────────────────────────────────
export const lendBatch = async (req, res) => {
  const { technician_id, items, notes } = req.body;
  if (!technician_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ Status: false, Error: "Missing technician_id or items" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const results = [];
    for (const item of items) {
      const { component_type, inventory_id } = item;
      const t = TABLES[component_type];
      if (!t) throw new Error(`Invalid component type: ${component_type}`);

      const [[invItem]] = await conn.query(`SELECT status, serial_number FROM ${t.inv} WHERE id=? FOR UPDATE`, [inventory_id]);
      if (!invItem || invItem.status !== 'in_stock') {
        throw new Error(`Item ${invItem?.serial_number || inventory_id} is not in stock`);
      }

      const [resInsert] = await conn.query(
        `INSERT INTO technician_borrowings (technician_id, component_type, inventory_id, notes) VALUES (?,?,?,?)`,
        [technician_id, component_type, inventory_id, notes || null]
      );
      
      await conn.query(`UPDATE ${t.inv} SET status='borrowed' WHERE id=?`, [inventory_id]);
      
      results.push({ insertId: resInsert.insertId, serial_number: invItem.serial_number, component_type });
    }

    await conn.commit();
    
    for(const r of results) {
       void logAction({
         userId: req.user.id,
         action: "borrowings.lent",
         entityType: "technician_borrowings",
         entityId: r.insertId,
         details: { technician_id, component_type: r.component_type, serial_number: r.serial_number },
         req
       });
    }

    res.json({ Status: true, lentCount: items.length });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /api/borrowings/:id/return ───────────────────────────────────────────

export const returnItem = async (req, res) => {
  const borrowingId = req.params.id;
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();

    const [[borrowing]] = await conn.query(`SELECT * FROM technician_borrowings WHERE id = ? FOR UPDATE`, [borrowingId]);
    
    if (!borrowing) throw new Error("Borrowing record not found");
    if (borrowing.status !== "borrowed") throw new Error(`Cannot return item because status is '${borrowing.status}'`);

    const t = TABLES[borrowing.component_type];

    // Update borrowing status
    await conn.query(`UPDATE technician_borrowings SET status = 'returned', returned_at = CURRENT_TIMESTAMP WHERE id = ?`, [borrowingId]);

    // Revert inventory status back to in_stock
    await conn.query(`UPDATE ${t.inv} SET status = 'in_stock' WHERE id = ?`, [borrowing.inventory_id]);

    await conn.commit();
    void logAction({
      userId: req.user.id,
      action: "borrowings.returned",
      entityType: "technician_borrowings",
      entityId: Number(borrowingId),
      req
    });

    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /api/borrowings/:id/consume ──────────────────────────────────────────

export const consumeItem = async (req, res) => {
  const borrowingId = req.params.id;
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();

    const [[borrowing]] = await conn.query(`SELECT * FROM technician_borrowings WHERE id = ? FOR UPDATE`, [borrowingId]);
    
    if (!borrowing) throw new Error("Borrowing record not found");
    if (borrowing.status !== "borrowed") throw new Error(`Cannot consume item because status is '${borrowing.status}'`);

    const t = TABLES[borrowing.component_type];

    // Update borrowing status
    await conn.query(`UPDATE technician_borrowings SET status = 'consumed' WHERE id = ?`, [borrowingId]);

    // Mark inventory as assigned (since it is consumed in the field)
    await conn.query(`UPDATE ${t.inv} SET status = 'assigned' WHERE id = ?`, [borrowing.inventory_id]);

    await conn.commit();
    void logAction({
      userId: req.user.id,
      action: "borrowings.consumed",
      entityType: "technician_borrowings",
      entityId: Number(borrowingId),
      req
    });

    res.json({ Status: true });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ Status: false, Error: err.message });
  } finally {
    conn.release();
  }
};
