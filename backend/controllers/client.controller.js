import pool from "../config/db.config.js";

export const getLocations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.id, d.name, d.province_id, p.name AS province_name
      FROM districts d
      JOIN provinces p ON p.id = d.province_id
      ORDER BY p.name, d.name
    `);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const getClients = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, d.name AS district_name, p.name AS province_name
      FROM clients c
      JOIN districts d ON d.id = c.district_id
      JOIN provinces p ON p.id = d.province_id
      ORDER BY c.id DESC
    `);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const createClient = async (req, res) => {
  const { name, address, district_id, contact_person, phone, email } = req.body;
  if (!name?.trim() || !district_id)
    return res
      .status(400)
      .json({ Status: false, Error: "Name and district are required" });
  try {
    const [result] = await pool.query(
      "INSERT INTO clients (name, address, district_id, contact_person, phone, email) VALUES (?,?,?,?,?,?)",
      [
        name.trim(),
        address?.trim() || null,
        district_id,
        contact_person?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
      ],
    );
    res.json({ Status: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const updateClient = async (req, res) => {
  const { name, address, district_id, contact_person, phone, email } = req.body;
  if (!name?.trim() || !district_id)
    return res
      .status(400)
      .json({ Status: false, Error: "Name and district are required" });
  try {
    await pool.query(
      "UPDATE clients SET name=?, address=?, district_id=?, contact_person=?, phone=?, email=? WHERE id=?",
      [
        name.trim(),
        address?.trim() || null,
        district_id,
        contact_person?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        req.params.id,
      ],
    );
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const deleteClient = async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id=?", [req.params.id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};
