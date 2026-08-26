import con from "../config/db.config.js";

export const getSuppliers = async (req, res) => {
  try {
    const [rows] = await con.query(`
      SELECT s.id, s.name, s.phone, s.email, s.address, s.created_at,
             COUNT(p.id) AS purchase_count,
             COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createSupplier = async (req, res) => {
  const { name, phone, email, address } = req.body;

  if (!name?.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Supplier name is required" });
  }

  try {
    const [result] = await con.query(
      `INSERT INTO suppliers (name, phone, email, address)
       VALUES (?, ?, ?, ?)`,
      [
        name.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
      ],
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  const { name, phone, email, address } = req.body;

  if (!name?.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Supplier name is required" });
  }

  try {
    await con.query(
      `UPDATE suppliers
       SET name = ?, phone = ?, email = ?, address = ?
       WHERE id = ?`,
      [
        name.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        req.params.id,
      ],
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    await con.query("DELETE FROM suppliers WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({
        success: false,
        error: "Supplier cannot be deleted because it is linked to purchases",
      });
    }

    res.status(500).json({ success: false, error: err.message });
  }
};
