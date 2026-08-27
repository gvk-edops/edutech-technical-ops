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
