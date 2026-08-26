import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    try {
      await conn.query(
        "ALTER TABLE ram_specs ADD COLUMN brand VARCHAR(100) NULL AFTER id",
      );
      console.log("✅ Added RAM brand column");
    } catch (err) {
      if (!err.message.includes("Duplicate column name")) throw err;
    }
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
