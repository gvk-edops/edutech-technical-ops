import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function runMigration() {
  console.log("Connecting to DB...");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "smartboard_ops_management",
    multipleStatements: true
  });

  try {
    console.log("Running migration queries...");
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_repair_component_replacements_insert;
      CREATE TRIGGER trg_repair_component_replacements_insert
      AFTER INSERT ON repair_component_replacements
      FOR EACH ROW
      BEGIN
          -- Set old component to 'faulty'
          IF NEW.component_type = 'ops' AND NEW.old_inventory_id IS NOT NULL THEN
              UPDATE inventory_ops SET status = 'faulty' WHERE id = NEW.old_inventory_id;
          ELSEIF NEW.component_type = 'ram' AND NEW.old_inventory_id IS NOT NULL THEN
              UPDATE inventory_rams SET status = 'faulty' WHERE id = NEW.old_inventory_id;
          ELSEIF NEW.component_type = 'storage' AND NEW.old_inventory_id IS NOT NULL THEN
              UPDATE inventory_storage SET status = 'faulty' WHERE id = NEW.old_inventory_id;
          ELSEIF NEW.component_type = 'wifi_card' AND NEW.old_inventory_id IS NOT NULL THEN
              UPDATE inventory_network_cards SET status = 'faulty' WHERE id = NEW.old_inventory_id;
          ELSEIF NEW.component_type = 'software_key' AND NEW.old_inventory_id IS NOT NULL THEN
              UPDATE main_software_keys SET status = 'revoked' WHERE id = NEW.old_inventory_id;
          END IF;
      
          -- Set new component to 'assigned'
          IF NEW.component_type = 'ops' AND NEW.new_inventory_id IS NOT NULL THEN
              UPDATE inventory_ops SET status = 'assigned' WHERE id = NEW.new_inventory_id;
          ELSEIF NEW.component_type = 'ram' AND NEW.new_inventory_id IS NOT NULL THEN
              UPDATE inventory_rams SET status = 'assigned' WHERE id = NEW.new_inventory_id;
          ELSEIF NEW.component_type = 'storage' AND NEW.new_inventory_id IS NOT NULL THEN
              UPDATE inventory_storage SET status = 'assigned' WHERE id = NEW.new_inventory_id;
          ELSEIF NEW.component_type = 'wifi_card' AND NEW.new_inventory_id IS NOT NULL THEN
              UPDATE inventory_network_cards SET status = 'assigned' WHERE id = NEW.new_inventory_id;
          ELSEIF NEW.component_type = 'software_key' AND NEW.new_inventory_id IS NOT NULL THEN
              UPDATE main_software_keys SET status = 'assigned' WHERE id = NEW.new_inventory_id;
          END IF;

          -- Mark active borrowing as consumed if the component was borrowed
          IF NEW.new_inventory_id IS NOT NULL THEN
              UPDATE technician_borrowings 
              SET status = 'consumed' 
              WHERE component_type = NEW.component_type 
                AND inventory_id = NEW.new_inventory_id 
                AND status = 'borrowed';
          END IF;
      END
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
