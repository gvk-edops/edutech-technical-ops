import pool from "../config/db.config.js";

// GET /software-keys?status=&software_catalog_id=&search=
export const getSoftwareKeys = async (req, res) => {
  const { status, software_catalog_id: catalogId, search } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push("msk.status = ?"); params.push(status); }
  if (catalogId) { where.push("msk.software_catalog_id = ?"); params.push(catalogId); }
  if (search?.trim()) {
    where.push("(msk.license_key LIKE ? OR msc.name LIKE ? OR msc.version LIKE ?)");
    params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    // Keep expiring subscription keys out of the usable purchased pool.
    await pool.query(`
      UPDATE main_software_keys
      SET status = 'expired'
      WHERE status = 'purchased'
        AND license_type = 'subscription'
        AND subscription_end_date IS NOT NULL
        AND subscription_end_date < CURDATE()`);

    const [rows] = await pool.query(`
      SELECT msk.id, msk.software_catalog_id, msk.license_key, msk.license_type,
             msk.subscription_start_date, msk.subscription_end_date, msk.status,
             msk.notes, msk.created_at, msk.updated_at,
             msc.name AS software_name, msc.version AS software_version,
             msc.software_type,
             au.id AS assigned_unit_id, io.serial_number AS assigned_ops_serial
      FROM main_software_keys msk
      JOIN main_software_catalog msc ON msc.id = msk.software_catalog_id
      LEFT JOIN assembly_main_software ams ON ams.software_key_id = msk.id AND ams.is_active = 1
      LEFT JOIN assembled_units au ON au.id = ams.assembled_unit_id
      LEFT JOIN inventory_ops io ON io.id = au.ops_inventory_id
      ${clause}
      ORDER BY msk.id DESC`, params);
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

// POST /software-keys
export const createSoftwareKey = async (req, res) => {
  const {
    software_catalog_id: catalogId,
    license_key: licenseKey,
    license_type: licenseType = "lifetime",
    subscription_start_date: subscriptionStartDate,
    subscription_end_date: subscriptionEndDate,
    notes,
  } = req.body;
  if (!catalogId || !licenseKey?.trim())
    return res.status(400).json({ Status: false, Error: "software_catalog_id and license_key are required" });
  if (!['lifetime', 'subscription'].includes(licenseType))
    return res.status(400).json({ Status: false, Error: "Invalid license type" });
  if (licenseType === "subscription" && !subscriptionEndDate)
    return res.status(400).json({ Status: false, Error: "Subscription end date is required" });

  try {
    const [[catalog]] = await pool.query("SELECT id FROM main_software_catalog WHERE id=?", [catalogId]);
    if (!catalog) return res.status(400).json({ Status: false, Error: "Software catalog entry not found" });

    const [result] = await pool.query(`
      INSERT INTO main_software_keys
        (software_catalog_id, license_key, license_type, subscription_start_date, subscription_end_date, status, notes)
      VALUES (?,?,?,?,?,'purchased',?)`, [
      catalogId,
      licenseKey.trim(),
      licenseType,
      licenseType === "subscription" ? subscriptionStartDate || null : null,
      licenseType === "subscription" ? subscriptionEndDate : null,
      notes?.trim() || null,
    ]);
    res.status(201).json({ Status: true, id: result.insertId });
  } catch (err) {
    const message = err.code === "ER_DUP_ENTRY" ? "This license key already exists" : err.message;
    res.status(400).json({ Status: false, Error: message });
  }
};
