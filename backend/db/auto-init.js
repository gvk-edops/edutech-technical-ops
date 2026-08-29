import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedLocations(conn) {
  const locationsPath = path.join(
    __dirname,
    "../../frontend/public/districts.json",
  );
  if (!fs.existsSync(locationsPath)) return;

  const locations = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
  const provinces = [
    ...new Set(locations.map((location) => location.province)),
  ];

  for (const [index, province] of provinces.entries()) {
    await conn.query("INSERT IGNORE INTO provinces (id, name) VALUES (?, ?)", [
      index + 1,
      province,
    ]);
  }

  for (const location of locations) {
    const [[province]] = await conn.query(
      "SELECT id FROM provinces WHERE name = ?",
      [location.province],
    );
    if (province) {
      await conn.query(
        "INSERT IGNORE INTO districts (id, name, province_id) VALUES (?, ?, ?)",
        [location.id, location.name, province.id],
      );
    }
  }
}

async function autoInitialize() {
  const dbName = process.env.DB_NAME || "smartboard_ops_management";

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    multipleStatements: true,
  });

  // 1. Create DB if missing
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conn.query(`USE \`${dbName}\``);

  // 2. Skip if already has tables
  const [[{ cnt }]] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [dbName],
  );
  if (cnt > 0) {
    console.log("✅ Database already initialised, skipping schema import");
    const alterations = [
      { sql: "ALTER TABLE ram_specs DROP COLUMN brand", msg: "Removed RAM brand column" },
      { sql: "ALTER TABLE ram_specs ADD COLUMN bus_speed_mhz INT NULL AFTER capacity_gb", msg: "Added RAM bus_speed_mhz column" },
      { sql: "ALTER TABLE jobs ADD COLUMN required_date DATE NULL AFTER ram_capacity_gb", msg: "Added jobs required_date column" },
      { sql: "ALTER TABLE inventory_ops MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock'", msg: "Updated inventory_ops status ENUM" },
      { sql: "ALTER TABLE inventory_rams MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock'", msg: "Updated inventory_rams status ENUM" },
      { sql: "ALTER TABLE inventory_storage MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock'", msg: "Updated inventory_storage status ENUM" },
      { sql: "ALTER TABLE inventory_network_cards MODIFY COLUMN status ENUM('in_stock','assigned','faulty','retired','reserved','borrowed') NOT NULL DEFAULT 'in_stock'", msg: "Updated inventory_network_cards status ENUM" },
      { sql: `CREATE TABLE IF NOT EXISTS technician_borrowings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    technician_id INT UNSIGNED NOT NULL,
    component_type ENUM('ops', 'ram', 'storage', 'network_card') NOT NULL,
    inventory_id INT UNSIGNED NOT NULL,
    borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    returned_at DATETIME NULL,
    status ENUM('borrowed', 'returned', 'consumed') NOT NULL DEFAULT 'borrowed',
    notes TEXT NULL,
    CONSTRAINT fk_borrowings_technician FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB`, msg: "Created technician_borrowings table" },
      { sql: "DROP TRIGGER IF EXISTS trg_repair_component_replacements_insert", msg: "Drop old trigger" },
      { sql: `CREATE TRIGGER trg_repair_component_replacements_insert
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
      END`, msg: "Create updated trigger" }
    ];
    for (const { sql, msg } of alterations) {
      try {
        await conn.query(sql);
        console.log(`✅ ${msg}`);
      } catch (err) {
        if (!err.message.includes("Can't DROP") && !err.message.includes("Duplicate column name")) throw err;
      }
    }
    await seedLocations(conn);
    await conn.query(
      "ALTER TABLE jobs MODIFY job_type ENUM('smartboard','ops','both') NOT NULL DEFAULT 'both'",
    );
    await conn.query(
      "ALTER TABLE jobs MODIFY smartboard_model_id INT UNSIGNED NULL",
    );
    await conn.query("ALTER TABLE jobs MODIFY ops_model_id INT UNSIGNED NULL");
    await conn.query(
      "ALTER TABLE jobs MODIFY ram_ddr_version VARCHAR(10) NULL",
    );
    await conn.query(
      "ALTER TABLE jobs MODIFY ram_capacity_gb SMALLINT UNSIGNED NULL",
    );
    await conn.query(
      "ALTER TABLE users MODIFY role ENUM('admin','manager','technician','auditor') NOT NULL DEFAULT 'technician'",
    );
    await conn.end();
    return;
  }

  console.log("🔧 Initialising database schema...");

  // 3. Read SQL and strip DELIMITER directives
  //    mysql2 with multipleStatements handles BEGIN...END fine when we use ; as delimiter.
  //    We just need to remove "DELIMITER //" and "DELIMITER ;" lines,
  //    and replace the "//" end-of-body markers with ";".
  const raw = fs.readFileSync(
    path.join(__dirname, "smartboard_ops_management.sql"),
    "utf8",
  );

  const cleaned = raw
    .replace(/^DELIMITER\s*\/\/\s*$/gm, "") // remove "DELIMITER //" lines
    .replace(/^DELIMITER\s*;\s*$/gm, "") // remove "DELIMITER ;" lines
    .replace(/^\/\/\s*$/gm, ";"); // replace standalone "//" lines with ";"

  // 4. Execute everything in one shot (multipleStatements handles it)
  try {
    await conn.query(cleaned);
  } catch (err) {
    // Some drivers throw on the first error even with multipleStatements.
    // Fall back to statement-by-statement execution.
    console.warn(
      "⚠️  Bulk execute failed, falling back to per-statement mode:",
      err.message,
    );
    await runStatements(conn, cleaned);
  }

  console.log("✅ Database schema initialised successfully");
  await seedLocations(conn);
  try {
    await conn.query(
      "ALTER TABLE jobs ADD COLUMN job_type ENUM('new','service') NOT NULL DEFAULT 'new' AFTER job_number",
    );
    console.log("✅ Added job type column");
  } catch (err) {
    if (!err.message.includes("Duplicate column name")) throw err;
  }
  await conn.query(
    "ALTER TABLE jobs MODIFY smartboard_model_id INT UNSIGNED NULL",
  );
  await conn.end();
}

async function runStatements(conn, sql) {
  // Split on ; that are NOT inside a BEGIN...END block
  // Simple approach: split on ";\n" and skip blanks/comments
  const stmts = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--") && !s.startsWith("/*"));

  for (const stmt of stmts) {
    try {
      await conn.query(stmt);
    } catch (err) {
      if (
        !err.message.includes("already exists") &&
        !err.message.includes("Duplicate key name") &&
        !err.message.includes("Duplicate entry")
      ) {
        console.warn(
          `⚠️  [${stmt.substring(0, 80).replace(/\n/g, " ")}]: ${err.message}`,
        );
      }
    }
  }
}

export default autoInitialize;
