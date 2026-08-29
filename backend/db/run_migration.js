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
    const sqlFile = path.join(__dirname, "migrate_borrowings.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");
    console.log("Running migration queries...");
    await pool.query(sql);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
