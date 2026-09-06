import pool from "../config/db.config.js";

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS system_settings (
  id INT NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_setting_key (setting_key)
) ENGINE=InnoDB;
`;

const SEED_SQL = `
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('system_name', 'Smartboard OPS Management'),
  ('system_logo_url', NULL),
  ('primary_color', '#0ea5e9'),
  ('audit_activity_visibility', '1');
`;

const ensureTable = async () => {
  await pool.query(INIT_SQL);
  await pool.query(SEED_SQL);
};

export const getSystemSettings = async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM system_settings",
    );
    const data = Object.fromEntries(
      rows.map((r) => [r.setting_key, r.setting_value]),
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPublicBranding = async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('system_name', 'system_logo_url')",
    );
    const settings = Object.fromEntries(
      rows.map((row) => [row.setting_key, row.setting_value]),
    );
    res.json({
      success: true,
      data: {
        system_name: settings.system_name || "Smartboard OPS Management",
        system_logo_url: settings.system_logo_url || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSystemSettings = async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== "object")
    return res
      .status(400)
      .json({ success: false, message: "Invalid settings format" });
  try {
    await ensureTable();
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [key, value, value],
      );
    }
    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
