import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testQuery() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "smartboard_ops_management",
  });

  try {
    const query = `
      SELECT 
        b.id, b.component_type, b.inventory_id, b.borrowed_at, b.returned_at, b.status, b.notes,
        u.name AS technician_name,
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
      ORDER BY b.borrowed_at DESC
    `;
    const [rows] = await pool.query(query);
    console.log("Query Success:", rows);
  } catch (err) {
    console.error("Query Error:", err);
  } finally {
    await pool.end();
  }
}

testQuery();
