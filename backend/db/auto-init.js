```js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* =========================================================
   DATABASE HELPERS
========================================================= */

async function tableExists(conn, tableName) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS cnt
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return Number(rows[0].cnt) > 0;
}

async function columnExists(conn, tableName, columnName) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return Number(rows[0].cnt) > 0;
}

/* =========================================================
   SQL DUMP PARSER
========================================================= */

function parseSqlStatements(sql) {
  const statements = [];

  let current = "";
  let state = "normal";

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    /* NORMAL */

    if (state === "normal") {
      if (char === "'") {
        current += char;
        state = "single";
        continue;
      }

      if (char === '"') {
        current += char;
        state = "double";
        continue;
      }

      if (char === "`") {
        current += char;
        state = "backtick";
        continue;
      }

      // MySQL -- comment
      if (
        char === "-" &&
        next === "-" &&
        (
          sql[i + 2] === " " ||
          sql[i + 2] === "\t" ||
          sql[i + 2] === "\r" ||
          sql[i + 2] === "\n"
        )
      ) {
        state = "line_comment";
        i++;
        continue;
      }

      // MySQL # comment
      if (char === "#") {
        state = "line_comment";
        continue;
      }

      // /* comment */
      if (char === "/" && next === "*") {
        state = "block_comment";
        i++;
        continue;
      }

      // End of SQL statement
      if (char === ";") {
        const statement = current.trim();

        if (statement) {
          statements.push(statement);
        }

        current = "";
        continue;
      }

      current += char;
      continue;
    }

    /* SINGLE QUOTE */

    if (state === "single") {
      current += char;

      if (char === "\\") {
        if (i + 1 < sql.length) {
          current += sql[++i];
        }

        continue;
      }

      if (char === "'" && next === "'") {
        current += sql[++i];
        continue;
      }

      if (char === "'") {
        state = "normal";
      }

      continue;
    }

    /* DOUBLE QUOTE */

    if (state === "double") {
      current += char;

      if (char === "\\") {
        if (i + 1 < sql.length) {
          current += sql[++i];
        }

        continue;
      }

      if (char === '"' && next === '"') {
        current += sql[++i];
        continue;
      }

      if (char === '"') {
        state = "normal";
      }

      continue;
    }

    /* BACKTICK */

    if (state === "backtick") {
      current += char;

      if (char === "`" && next === "`") {
        current += sql[++i];
        continue;
      }

      if (char === "`") {
        state = "normal";
      }

      continue;
    }

    /* LINE COMMENT */

    if (state === "line_comment") {
      if (char === "\n") {
        state = "normal";
        current += "\n";
      }

      continue;
    }

    /* BLOCK COMMENT */

    if (state === "block_comment") {
      if (char === "*" && next === "/") {
        state = "normal";
        i++;
      }

      continue;
    }
  }

  const last = current.trim();

  if (last) {
    statements.push(last);
  }

  return statements;
}

/* =========================================================
   STATEMENT FILTER
========================================================= */

function shouldSkipStatement(statement) {
  const normalized = statement
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  if (normalized === "START TRANSACTION") {
    return true;
  }

  if (normalized === "COMMIT") {
    return true;
  }

  if (normalized === "ROLLBACK") {
    return true;
  }

  /*
    IMPORTANT:

    Do NOT execute DROP TABLE automatically.

    This prevents a Railway restart from deleting
    application data.
  */

  if (normalized.startsWith("DROP TABLE IF EXISTS")) {
    return true;
  }

  if (normalized.startsWith("DELIMITER ")) {
    return true;
  }

  return false;
}

/* =========================================================
   IGNORABLE MYSQL ERRORS
========================================================= */

function isIgnorableSqlError(err) {
  const code = err?.code;
  const errno = Number(err?.errno);
  const message = String(err?.message || "").toLowerCase();

  // Duplicate record
  if (
    code === "ER_DUP_ENTRY" ||
    errno === 1062 ||
    message.includes("duplicate entry")
  ) {
    return true;
  }

  // Duplicate key
  if (
    code === "ER_DUP_KEYNAME" ||
    errno === 1061 ||
    message.includes("duplicate key name")
  ) {
    return true;
  }

  // Duplicate column
  if (
    code === "ER_DUP_FIELDNAME" ||
    errno === 1060 ||
    message.includes("duplicate column")
  ) {
    return true;
  }

  // Duplicate foreign key name
  if (
    code === "ER_FK_DUP_NAME" ||
    errno === 1826 ||
    message.includes("duplicate foreign key constraint name")
  ) {
    return true;
  }

  // Cannot drop nonexistent key
  if (
    code === "ER_CANT_DROP_FIELD_OR_KEY" ||
    errno === 1091
  ) {
    return true;
  }

  // Table already exists
  if (
    code === "ER_TABLE_EXISTS_ERROR" ||
    errno === 1050 ||
    message.includes("already exists")
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   IMPORT DATABASE SCHEMA
========================================================= */

async function importSchema(conn) {
  const sqlPath = path.join(
    __dirname,
    "smartboard_ops_management.sql"
  );

  if (!fs.existsSync(sqlPath)) {
    throw new Error(
      `SQL schema file not found: ${sqlPath}`
    );
  }

  const rawSql = fs.readFileSync(
    sqlPath,
    "utf8"
  );

  if (!rawSql.trim()) {
    throw new Error(
      "SQL schema file is empty."
    );
  }

  console.log("📄 Loading SQL schema...");
  console.log(`📁 Schema file: ${sqlPath}`);

  /*
    Remove DELIMITER directives.
  */

  const cleanedSql = rawSql.replace(
    /^\s*DELIMITER\s+\S+\s*$/gim,
    ""
  );

  const statements =
    parseSqlStatements(cleanedSql);

  console.log(
    `📦 SQL statements detected: ${statements.length}`
  );

  console.log(
    "🔧 Importing schema statement-by-statement..."
  );

  let executed = 0;
  let skipped = 0;
  let ignored = 0;

  for (
    let i = 0;
    i < statements.length;
    i++
  ) {
    const statement =
      statements[i].trim();

    if (!statement) {
      continue;
    }

    if (shouldSkipStatement(statement)) {
      skipped++;
      continue;
    }

    const preview = statement
      .replace(/\s+/g, " ")
      .substring(0, 200);

    try {
      await conn.query(statement);

      executed++;

      if (
        executed <= 10 ||
        statement
          .toUpperCase()
          .startsWith("CREATE TABLE") ||
        statement
          .toUpperCase()
          .startsWith("ALTER TABLE")
      ) {
        console.log(
          `✅ SQL ${i + 1}/${statements.length}: ${preview}`
        );
      }
    } catch (err) {
      if (isIgnorableSqlError(err)) {
        ignored++;

        console.warn(
          `⚠️ Ignored harmless SQL error at statement ${i + 1}: ${err.message}`
        );

        console.warn(
          `   SQL: ${preview}`
        );

        continue;
      }

      console.error("");
      console.error(
        "========================================"
      );
      console.error(
        "❌ SQL STATEMENT FAILED"
      );
      console.error(
        "========================================"
      );

      console.error(
        `Statement: ${i + 1}/${statements.length}`
      );

      console.error(
        `MySQL code: ${err.code || "unknown"}`
      );

      console.error(
        `MySQL errno: ${err.errno || "unknown"}`
      );

      console.error(
        `Error: ${err.message}`
      );

      console.error(
        `SQL: ${preview}`
      );

      console.error(
        "========================================"
      );

      throw err;
    }
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "📊 SQL IMPORT SUMMARY"
  );
  console.log(
    "========================================"
  );

  console.log(
    `Total statements: ${statements.length}`
  );

  console.log(
    `Executed: ${executed}`
  );

  console.log(
    `Skipped: ${skipped}`
  );

  console.log(
    `Ignored harmless errors: ${ignored}`
  );

  console.log(
    "========================================"
  );

  console.log(
    "✅ Database schema import completed"
  );
}

/* =========================================================
   RAM SPECIFICATIONS
========================================================= */

async function updateRamSpecs(conn) {
  if (
    !(await tableExists(
      conn,
      "ram_specs"
    ))
  ) {
    return;
  }

  if (
    await columnExists(
      conn,
      "ram_specs",
      "brand"
    )
  ) {
    try {
      await conn.query(
        `ALTER TABLE ram_specs DROP COLUMN brand`
      );

      console.log(
        "✅ Removed ram_specs.brand"
      );
    } catch (err) {
      if (!isIgnorableSqlError(err)) {
        throw err;
      }
    }
  }

  if (
    !(await columnExists(
      conn,
      "ram_specs",
      "bus_speed_mhz"
    ))
  ) {
    await conn.query(`
      ALTER TABLE ram_specs
      ADD COLUMN bus_speed_mhz INT NULL
      AFTER capacity_gb
    `);

    console.log(
      "✅ Added ram_specs.bus_speed_mhz"
    );
  }
}

/* =========================================================
   JOBS
========================================================= */

async function updateJobs(conn) {
  if (
    !(await tableExists(
      conn,
      "jobs"
    ))
  ) {
    return;
  }

  if (
    !(await columnExists(
      conn,
      "jobs",
      "required_date"
    ))
  ) {
    await conn.query(`
      ALTER TABLE jobs
      ADD COLUMN required_date DATE NULL
      AFTER ram_capacity_gb
    `);

    console.log(
      "✅ Added jobs.required_date"
    );
  }

  await conn.query(`
    ALTER TABLE jobs
    MODIFY COLUMN job_type
    ENUM('smartboard','ops','both')
    NOT NULL DEFAULT 'both'
  `);

  if (
    await columnExists(
      conn,
      "jobs",
      "smartboard_model_id"
    )
  ) {
    await conn.query(`
      ALTER TABLE jobs
      MODIFY COLUMN smartboard_model_id
      INT UNSIGNED NULL
    `);
  }

  if (
    await columnExists(
      conn,
      "jobs",
      "ops_model_id"
    )
  ) {
    await conn.query(`
      ALTER TABLE jobs
      MODIFY COLUMN ops_model_id
      INT UNSIGNED NULL
    `);
  }

  if (
    await columnExists(
      conn,
      "jobs",
      "ram_ddr_version"
    )
  ) {
    await conn.query(`
      ALTER TABLE jobs
      MODIFY COLUMN ram_ddr_version
      VARCHAR(10) NULL
    `);
  }

  if (
    await columnExists(
      conn,
      "jobs",
      "ram_capacity_gb"
    )
  ) {
    await conn.query(`
      ALTER TABLE jobs
      MODIFY COLUMN ram_capacity_gb
      SMALLINT UNSIGNED NULL
    `);
  }

  console.log(
    "✅ Jobs table updated"
  );
}

/* =========================================================
   USERS
========================================================= */

async function updateUsers(conn) {
  if (
    !(await tableExists(
      conn,
      "users"
    ))
  ) {
    return;
  }

  await conn.query(`
    ALTER TABLE users
    MODIFY COLUMN role
    ENUM(
      'admin',
      'manager',
      'technician',
      'auditor'
    )
    NOT NULL DEFAULT 'technician'
  `);

  console.log(
    "✅ Users role structure updated"
  );
}

/* =========================================================
   INVENTORY STATUS
========================================================= */

async function updateInventoryStatuses(conn) {
  const tables = [
    "inventory_ops",
    "inventory_rams",
    "inventory_storage",
    "inventory_network_cards"
  ];

  for (const table of tables) {
    if (
      !(await tableExists(
        conn,
        table
      ))
    ) {
      console.log(
        `ℹ️ ${table} does not exist. Skipping.`
      );

      continue;
    }

    await conn.query(`
      ALTER TABLE \`${table}\`
      MODIFY COLUMN status
      ENUM(
        'in_stock',
        'assigned',
        'faulty',
        'retired',
        'reserved',
        'borrowed'
      )
      NOT NULL DEFAULT 'in_stock'
    `);

    console.log(
      `✅ Updated ${table}.status`
    );
  }
}

/* =========================================================
   TECHNICIAN BORROWINGS
========================================================= */

async function ensureTechnicianBorrowingsTable(conn) {
  if (
    await tableExists(
      conn,
      "technician_borrowings"
    )
  ) {
    console.log(
      "ℹ️ technician_borrowings already exists"
    );

    return;
  }

  if (
    !(await tableExists(
      conn,
      "users"
    ))
  ) {
    throw new Error(
      "users table is missing. Cannot create technician_borrowings."
    );
  }

  await conn.query(`
    CREATE TABLE technician_borrowings (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

      technician_id INT UNSIGNED NOT NULL,

      component_type
      ENUM(
        'ops',
        'ram',
        'storage',
        'network_card'
      ) NOT NULL,

      inventory_id INT UNSIGNED NOT NULL,

      borrowed_at DATETIME
      NOT NULL DEFAULT CURRENT_TIMESTAMP,

      returned_at DATETIME NULL,

      status
      ENUM(
        'borrowed',
        'returned',
        'consumed'
      )
      NOT NULL DEFAULT 'borrowed',

      notes TEXT NULL,

      KEY idx_borrowings_status (status),

      KEY idx_borrowings_tech
      (technician_id),

      KEY idx_borrowings_comp
      (component_type, inventory_id),

      CONSTRAINT fk_borrowings_technician
      FOREIGN KEY (technician_id)
      REFERENCES users(id)
      ON DELETE CASCADE

    ) ENGINE=InnoDB
  `);

  console.log(
    "✅ Created technician_borrowings table"
  );
}

/* =========================================================
   REPAIR REPLACEMENT TRIGGER
========================================================= */

async function ensureRepairReplacementTrigger(conn) {
  const requiredTables = [
    "repair_component_replacements",
    "inventory_ops",
    "inventory_rams",
    "inventory_storage",
    "inventory_network_cards",
    "main_software_keys",
    "technician_borrowings"
  ];

  for (const table of requiredTables) {
    if (
      !(await tableExists(
        conn,
        table
      ))
    ) {
      console.warn(
        `⚠️ ${table} missing. Trigger skipped.`
      );

      return;
    }
  }

  await conn.query(`
    DROP TRIGGER IF EXISTS
    trg_repair_component_replacements_insert
  `);

  console.log(
    "✅ Removed old repair replacement trigger"
  );

  await conn.query(`
    CREATE TRIGGER
    trg_repair_component_replacements_insert

    AFTER INSERT
    ON repair_component_replacements

    FOR EACH ROW

    BEGIN

      IF NEW.component_type = 'ops'
         AND NEW.old_inventory_id IS NOT NULL THEN

        UPDATE inventory_ops
        SET status = 'faulty'
        WHERE id = NEW.old_inventory_id;

      ELSEIF NEW.component_type = 'ram'
         AND NEW.old_inventory_id IS NOT NULL THEN

        UPDATE inventory_rams
        SET status = 'faulty'
        WHERE id = NEW.old_inventory_id;

      ELSEIF NEW.component_type = 'storage'
         AND NEW.old_inventory_id IS NOT NULL THEN

        UPDATE inventory_storage
        SET status = 'faulty'
        WHERE id = NEW.old_inventory_id;

      ELSEIF NEW.component_type = 'wifi_card'
         AND NEW.old_inventory_id IS NOT NULL THEN

        UPDATE inventory_network_cards
        SET status = 'faulty'
        WHERE id = NEW.old_inventory_id;

      ELSEIF NEW.component_type = 'software_key'
         AND NEW.old_inventory_id IS NOT NULL THEN

        UPDATE main_software_keys
        SET status = 'revoked'
        WHERE id = NEW.old_inventory_id;

      END IF;


      IF NEW.component_type = 'ops'
         AND NEW.new_inventory_id IS NOT NULL THEN

        UPDATE inventory_ops
        SET status = 'assigned'
        WHERE id = NEW.new_inventory_id;

      ELSEIF NEW.component_type = 'ram'
         AND NEW.new_inventory_id IS NOT NULL THEN

        UPDATE inventory_rams
        SET status = 'assigned'
        WHERE id = NEW.new_inventory_id;

      ELSEIF NEW.component_type = 'storage'
         AND NEW.new_inventory_id IS NOT NULL THEN

        UPDATE inventory_storage
        SET status = 'assigned'
        WHERE id = NEW.new_inventory_id;

      ELSEIF NEW.component_type = 'wifi_card'
         AND NEW.new_inventory_id IS NOT NULL THEN

        UPDATE inventory_network_cards
        SET status = 'assigned'
        WHERE id = NEW.new_inventory_id;

      ELSEIF NEW.component_type = 'software_key'
         AND NEW.new_inventory_id IS NOT NULL THEN

        UPDATE main_software_keys
        SET status = 'assigned'
        WHERE id = NEW.new_inventory_id;

      END IF;


      IF NEW.new_inventory_id IS NOT NULL THEN

        UPDATE technician_borrowings
        SET status = 'consumed'

        WHERE component_type =
        NEW.component_type

        AND inventory_id =
        NEW.new_inventory_id

        AND status =
        'borrowed';

      END IF;

    END
  `);

  console.log(
    "✅ Created repair component replacement trigger"
  );
}

/* =========================================================
   LOCATION SEED
========================================================= */

async function seedLocations(conn) {
  if (
    !(await tableExists(
      conn,
      "provinces"
    ))
  ) {
    return;
  }

  if (
    !(await tableExists(
      conn,
      "districts"
    ))
  ) {
    return;
  }

  const locationsPath = path.join(
    __dirname,
    "../../frontend/public/districts.json"
  );

  if (!fs.existsSync(locationsPath)) {
    console.log(
      "ℹ️ districts.json not found. Skipping location seed."
    );

    return;
  }

  let locations;

  try {
    locations = JSON.parse(
      fs.readFileSync(
        locationsPath,
        "utf8"
      )
    );
  } catch (err) {
    console.warn(
      "⚠️ Could not read districts.json:",
      err.message
    );

    return;
  }

  if (!Array.isArray(locations)) {
    console.warn(
      "⚠️ districts.json is not an array."
    );

    return;
  }

  const provinces = [
    ...new Set(
      locations
        .map(
          (location) =>
            location.province
        )
        .filter(Boolean)
    )
  ];

  for (
    const [index, province] of
    provinces.entries()
  ) {
    await conn.query(
      `
        INSERT IGNORE INTO provinces
        (id, name)
        VALUES (?, ?)
      `,
      [
        index + 1,
        province
      ]
    );
  }

  for (const location of locations) {
    if (
      !location.province ||
      !location.name ||
      location.id == null
    ) {
      continue;
    }

    const [rows] =
      await conn.query(
        `
          SELECT id
          FROM provinces
          WHERE name = ?
          LIMIT 1
        `,
        [location.province]
      );

    if (!rows.length) {
      continue;
    }

    await conn.query(
      `
        INSERT IGNORE INTO districts
        (id, name, province_id)
        VALUES (?, ?, ?)
      `,
      [
        location.id,
        location.name,
        rows[0].id
      ]
    );
  }

  console.log(
    "✅ Provinces and districts seeded"
  );
}

/* =========================================================
   FINAL SCHEMA VERIFICATION
========================================================= */

async function verifySchema(conn) {
  const requiredTables = [
    "users",
    "provinces",
    "districts",
    "jobs",
    "clients",
    "inventory_ops",
    "inventory_rams",
    "inventory_storage",
    "inventory_network_cards",
    "repair_jobs",
    "repair_component_replacements",
    "technician_borrowings"
  ];

  const missing = [];

  for (const table of requiredTables) {
    if (
      !(await tableExists(
        conn,
        table
      ))
    ) {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Schema verification failed. Missing tables: ${missing.join(", ")}`
    );
  }

  console.log(
    `✅ Schema verification passed (${requiredTables.length} required tables found)`
  );
}

/* =========================================================
   MAIN INITIALIZER
========================================================= */

async function autoInitialize() {
  const dbName =
    process.env.DB_NAME ||
    "smartboard_ops_management";

  const dbHost =
    process.env.DB_HOST ||
    "localhost";

  const dbPort =
    parseInt(
      process.env.DB_PORT,
      10
    ) || 3306;

  const dbUser =
    process.env.DB_USER ||
    "root";

  const dbPassword =
    process.env.DB_PASSWORD ?? "";

  let conn;

  try {
    console.log(
      "========================================"
    );

    console.log(
      "🔌 Connecting to MySQL..."
    );

    console.log(
      `🌐 Host: ${dbHost}`
    );

    console.log(
      `🔢 Port: ${dbPort}`
    );

    console.log(
      `👤 User: ${dbUser}`
    );

    console.log(
      `🗄️ Database: ${dbName}`
    );

    console.log(
      "========================================"
    );

    conn =
      await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        multipleStatements: true
      });

    console.log(
      "✅ MySQL connection established"
    );

    /* CREATE DATABASE */

    await conn.query(`
      CREATE DATABASE IF NOT EXISTS
      \`${dbName}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);

    /* SELECT DATABASE */

    await conn.query(
      `USE \`${dbName}\``
    );

    const [databaseRows] =
      await conn.query(
        `SELECT DATABASE() AS db`
      );

    console.log(
      `🗄️ Connected database: ${databaseRows[0].db}`
    );

    /* FOREIGN KEY CHECKS OFF */

    await conn.query(
      `SET FOREIGN_KEY_CHECKS = 0`
    );

    console.log(
      "🔓 Foreign key checks disabled"
    );

    /* EXISTING TABLE COUNT */

    const [countRows] =
      await conn.query(`
        SELECT COUNT(*) AS cnt
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
      `, [dbName]);

    const existingTableCount =
      Number(countRows[0].cnt);

    console.log(
      `📊 Existing tables: ${existingTableCount}`
    );

    /* SCHEMA IMPORT */

    if (existingTableCount === 0) {
      console.log("");
      console.log(
        "🔧 No tables found. Initialising database..."
      );
      console.log("");

      await importSchema(conn);
    } else {
      console.log("");
      console.log(
        "🔧 Existing database detected."
      );
      console.log(
        "🔧 Running safe schema synchronization..."
      );
      console.log("");

      await importSchema(conn);
    }

    /* MIGRATIONS */

    await updateRamSpecs(conn);

    await updateJobs(conn);

    await updateUsers(conn);

    await updateInventoryStatuses(conn);

    await ensureTechnicianBorrowingsTable(conn);

    /* LOCATIONS */

    await seedLocations(conn);

    /* TRIGGER */

    await ensureRepairReplacementTrigger(conn);

    /* VERIFY */

    await verifySchema(conn);

    /* FOREIGN KEY CHECKS ON */

    await conn.query(
      `SET FOREIGN_KEY_CHECKS = 1`
    );

    console.log(
      "🔒 Foreign key checks re-enabled"
    );

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "✅ DATABASE INITIALIZATION COMPLETE"
    );
    console.log(
      "========================================"
    );
    console.log("");

    return true;

  } catch (err) {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "❌ DATABASE INITIALIZATION FAILED"
    );
    console.error(
      "========================================"
    );

    console.error(
      "Error:",
      err.message
    );

    console.error("");

    throw err;

  } finally {
    if (conn) {
      try {
        await conn.end();

        console.log(
          "🔌 MySQL connection closed"
        );
      } catch (closeErr) {
        console.warn(
          "⚠️ Could not close MySQL connection:",
          closeErr.message
        );
      }
    }
  }
}

export default autoInitialize;
```
