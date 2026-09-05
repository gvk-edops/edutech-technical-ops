import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ---------------------------------------------------------
 * Helper: Check whether a table exists
 * ---------------------------------------------------------
 */
async function tableExists(conn, tableName) {
  const [[row]] = await conn.query(
    `
      SELECT COUNT(*) AS cnt
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName],
  );

  return Number(row.cnt) > 0;
}

/**
 * ---------------------------------------------------------
 * Helper: Check whether a column exists
 * ---------------------------------------------------------
 */
async function columnExists(conn, tableName, columnName) {
  const [[row]] = await conn.query(
    `
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName],
  );

  return Number(row.cnt) > 0;
}

/**
 * ---------------------------------------------------------
 * Seed Sri Lankan provinces and districts
 * ---------------------------------------------------------
 */
async function seedLocations(conn) {
  const locationsPath = path.join(
    __dirname,
    "../../frontend/public/districts.json",
  );

  if (!fs.existsSync(locationsPath)) {
    console.log("ℹ️ districts.json not found. Skipping location seed.");
    return;
  }

  let locations;

  try {
    locations = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
  } catch (err) {
    console.warn("⚠️ Could not read districts.json:", err.message);
    return;
  }

  const provinces = [
    ...new Set(
      locations
        .map((location) => location.province)
        .filter(Boolean),
    ),
  ];

  /**
   * Insert provinces
   */
  for (const [index, province] of provinces.entries()) {
    await conn.query(
      `
        INSERT IGNORE INTO provinces (id, name)
        VALUES (?, ?)
      `,
      [index + 1, province],
    );
  }

  /**
   * Insert districts
   */
  for (const location of locations) {
    if (!location.province || !location.name || location.id == null) {
      continue;
    }

    const [[province]] = await conn.query(
      `
        SELECT id
        FROM provinces
        WHERE name = ?
        LIMIT 1
      `,
      [location.province],
    );

    if (province) {
      await conn.query(
        `
          INSERT IGNORE INTO districts (id, name, province_id)
          VALUES (?, ?, ?)
        `,
        [
          location.id,
          location.name,
          province.id,
        ],
      );
    }
  }

  console.log("✅ Provinces and districts seeded");
}

/**
 * ---------------------------------------------------------
 * Create / update technician borrowing table
 * ---------------------------------------------------------
 */
async function ensureTechnicianBorrowingsTable(conn) {
  const exists = await tableExists(conn, "technician_borrowings");

  if (!exists) {
    await conn.query(`
      CREATE TABLE technician_borrowings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        technician_id INT UNSIGNED NOT NULL,

        component_type ENUM(
          'ops',
          'ram',
          'storage',
          'network_card'
        ) NOT NULL,

        inventory_id INT UNSIGNED NOT NULL,

        borrowed_at DATETIME NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        returned_at DATETIME NULL,

        status ENUM(
          'borrowed',
          'returned',
          'consumed'
        ) NOT NULL DEFAULT 'borrowed',

        notes TEXT NULL,

        KEY idx_borrowings_status (status),
        KEY idx_borrowings_tech (technician_id),
        KEY idx_borrowings_comp (
          component_type,
          inventory_id
        ),

        CONSTRAINT fk_borrowings_technician
          FOREIGN KEY (technician_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    console.log("✅ Created technician_borrowings table");
  } else {
    console.log("ℹ️ technician_borrowings table already exists");
  }
}

/**
 * ---------------------------------------------------------
 * Ensure inventory status ENUMs support borrowed/reserved
 * ---------------------------------------------------------
 */
async function updateInventoryStatuses(conn) {
  const tables = [
    "inventory_ops",
    "inventory_rams",
    "inventory_storage",
    "inventory_network_cards",
  ];

  for (const table of tables) {
    if (!(await tableExists(conn, table))) {
      console.warn(`⚠️ Table ${table} does not exist. Skipping.`);
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

    console.log(`✅ Updated ${table}.status`);
  }
}

/**
 * ---------------------------------------------------------
 * Ensure RAM specification structure
 * ---------------------------------------------------------
 */
async function updateRamSpecs(conn) {
  if (!(await tableExists(conn, "ram_specs"))) {
    return;
  }

  /**
   * Remove old brand column if it still exists.
   */
  if (await columnExists(conn, "ram_specs", "brand")) {
    await conn.query(`
      ALTER TABLE ram_specs
      DROP COLUMN brand
    `);

    console.log("✅ Removed ram_specs.brand");
  }

  /**
   * Add bus speed if it does not exist.
   */
  if (!(await columnExists(conn, "ram_specs", "bus_speed_mhz"))) {
    await conn.query(`
      ALTER TABLE ram_specs
      ADD COLUMN bus_speed_mhz INT NULL
      AFTER capacity_gb
    `);

    console.log("✅ Added ram_specs.bus_speed_mhz");
  }
}

/**
 * ---------------------------------------------------------
 * Ensure jobs structure
 * ---------------------------------------------------------
 */
async function updateJobs(conn) {
  if (!(await tableExists(conn, "jobs"))) {
    return;
  }

  /**
   * required_date
   */
  if (!(await columnExists(conn, "jobs", "required_date"))) {
    await conn.query(`
      ALTER TABLE jobs
      ADD COLUMN required_date DATE NULL
      AFTER ram_capacity_gb
    `);

    console.log("✅ Added jobs.required_date");
  }

  /**
   * job_type
   *
   * IMPORTANT:
   * The current SQL schema already uses:
   *
   * smartboard
   * ops
   * both
   */
  await conn.query(`
    ALTER TABLE jobs
    MODIFY COLUMN job_type
    ENUM('smartboard', 'ops', 'both')
    NOT NULL DEFAULT 'both'
  `);

  /**
   * Nullable smartboard model
   */
  await conn.query(`
    ALTER TABLE jobs
    MODIFY COLUMN smartboard_model_id INT UNSIGNED NULL
  `);

  /**
   * Nullable OPS model
   */
  await conn.query(`
    ALTER TABLE jobs
    MODIFY COLUMN ops_model_id INT UNSIGNED NULL
  `);

  /**
   * Nullable RAM DDR version
   */
  await conn.query(`
    ALTER TABLE jobs
    MODIFY COLUMN ram_ddr_version VARCHAR(10) NULL
  `);

  /**
   * Nullable RAM capacity
   */
  await conn.query(`
    ALTER TABLE jobs
    MODIFY COLUMN ram_capacity_gb SMALLINT UNSIGNED NULL
  `);

  console.log("✅ Jobs table updated");
}

/**
 * ---------------------------------------------------------
 * Ensure users role structure
 * ---------------------------------------------------------
 */
async function updateUsers(conn) {
  if (!(await tableExists(conn, "users"))) {
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

  console.log("✅ Users role structure updated");
}

/**
 * ---------------------------------------------------------
 * Create / replace repair component replacement trigger
 *
 * IMPORTANT:
 * This is executed as ONE SQL statement.
 *
 * Do NOT split this using semicolons.
 * ---------------------------------------------------------
 */
async function ensureRepairReplacementTrigger(conn) {
  if (!(await tableExists(conn, "repair_component_replacements"))) {
    console.warn(
      "⚠️ repair_component_replacements table does not exist. Trigger skipped.",
    );

    return;
  }

  if (!(await tableExists(conn, "inventory_ops"))) {
    console.warn("⚠️ inventory_ops table missing. Trigger skipped.");
    return;
  }

  if (!(await tableExists(conn, "inventory_rams"))) {
    console.warn("⚠️ inventory_rams table missing. Trigger skipped.");
    return;
  }

  if (!(await tableExists(conn, "inventory_storage"))) {
    console.warn("⚠️ inventory_storage table missing. Trigger skipped.");
    return;
  }

  if (!(await tableExists(conn, "inventory_network_cards"))) {
    console.warn(
      "⚠️ inventory_network_cards table missing. Trigger skipped.",
    );

    return;
  }

  if (!(await tableExists(conn, "main_software_keys"))) {
    console.warn(
      "⚠️ main_software_keys table missing. Trigger skipped.",
    );

    return;
  }

  if (!(await tableExists(conn, "technician_borrowings"))) {
    console.warn(
      "⚠️ technician_borrowings table missing. Trigger skipped.",
    );

    return;
  }

  /**
   * Remove old trigger first.
   */
  await conn.query(`
    DROP TRIGGER IF EXISTS trg_repair_component_replacements_insert
  `);

  console.log("✅ Removed old repair replacement trigger");

  /**
   * Create new trigger.
   *
   * This MUST be sent to MySQL as one query.
   */
  await conn.query(`
    CREATE TRIGGER trg_repair_component_replacements_insert
    AFTER INSERT ON repair_component_replacements
    FOR EACH ROW
    BEGIN

      /*
       * ----------------------------------------------------
       * Set OLD component to faulty / revoked
       * ----------------------------------------------------
       */

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


      /*
       * ----------------------------------------------------
       * Set NEW component to assigned
       * ----------------------------------------------------
       */

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


      /*
       * ----------------------------------------------------
       * Mark borrowed component as consumed
       * ----------------------------------------------------
       */

      IF NEW.new_inventory_id IS NOT NULL THEN

        UPDATE technician_borrowings
        SET status = 'consumed'
        WHERE component_type = NEW.component_type
          AND inventory_id = NEW.new_inventory_id
          AND status = 'borrowed';

      END IF;

    END
  `);

  console.log(
    "✅ Created repair component replacement trigger",
  );
}

/**
 * ---------------------------------------------------------
 * Import the SQL schema
 *
 * IMPORTANT:
 * There is intentionally NO broken fallback parser.
 *
 * The SQL dump is sent directly to MySQL with
 * multipleStatements enabled.
 * ---------------------------------------------------------
 */
async function importSchema(conn) {
  const sqlPath = path.join(
    __dirname,
    "smartboard_ops_management.sql",
  );

  if (!fs.existsSync(sqlPath)) {
    throw new Error(
      `SQL schema file not found: ${sqlPath}`,
    );
  }

  const rawSql = fs.readFileSync(sqlPath, "utf8");

  if (!rawSql.trim()) {
    throw new Error("SQL schema file is empty.");
  }

  console.log("📄 Loading SQL schema...");
  console.log(`📁 Schema file: ${sqlPath}`);

  /**
   * The supplied SQL dump does not contain the repair trigger.
   * The trigger is created separately by
   * ensureRepairReplacementTrigger().
   *
   * We only remove MySQL CLI DELIMITER commands if they
   * happen to exist in the dump.
   *
   * We DO NOT split statements ourselves.
   */
  const cleanedSql = rawSql
    .replace(/^\s*DELIMITER\s+\S+\s*$/gim, "")
    .replace(/^\s*\/\/\s*$/gm, "");

  console.log("🔧 Importing database schema...");

  try {
    await conn.query(cleanedSql);
  } catch (err) {
    console.error(
      "❌ Database schema import failed:",
      err.message,
    );

    /**
     * IMPORTANT:
     * Do NOT fall back to splitting SQL on semicolons.
     *
     * A BEGIN...END trigger/procedure contains internal
     * semicolons and cannot safely be parsed that way.
     */
    throw err;
  }

  console.log("✅ Database schema imported successfully");
}

/**
 * ---------------------------------------------------------
 * Verify important tables after initialization
 * ---------------------------------------------------------
 */
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
    "technician_borrowings",
  ];

  const missing = [];

  for (const table of requiredTables) {
    if (!(await tableExists(conn, table))) {
      missing.push(table);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Schema verification failed. Missing tables: ${missing.join(", ")}`,
    );
  }

  console.log(
    `✅ Schema verification passed (${requiredTables.length} required tables found)`,
  );
}

/**
 * ---------------------------------------------------------
 * Main database initialization
 * ---------------------------------------------------------
 */
async function autoInitialize() {
  const dbName =
    process.env.DB_NAME ||
    "smartboard_ops_management";

  const dbHost =
    process.env.DB_HOST ||
    "localhost";

  const dbPort =
    parseInt(process.env.DB_PORT, 10) ||
    3306;

  const dbUser =
    process.env.DB_USER ||
    "root";

  const dbPassword =
    process.env.DB_PASSWORD ?? "";

  let conn;

  try {
    console.log("========================================");
    console.log("🔌 Connecting to MySQL...");
    console.log(`🌐 Host: ${dbHost}`);
    console.log(`🔢 Port: ${dbPort}`);
    console.log(`👤 User: ${dbUser}`);
    console.log(`🗄️ Database: ${dbName}`);
    console.log("========================================");

    /**
     * Connect without selecting a database first.
     * This allows us to create the database if needed.
     */
    conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,

      /**
       * Required for the SQL dump because it contains
       * many SQL statements.
       */
      multipleStatements: true,
    });

    console.log("✅ MySQL connection established");

    /**
     * ------------------------------------------------------
     * Create database if necessary
     * ------------------------------------------------------
     */
    await conn.query(`
      CREATE DATABASE IF NOT EXISTS \`${dbName}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);

    await conn.query(`USE \`${dbName}\``);

    /**
     * Verify actual database selected.
     */
    const [[databaseInfo]] = await conn.query(`
      SELECT DATABASE() AS db
    `);

    console.log(
      `🗄️ Connected database: ${databaseInfo.db}`,
    );

    /**
     * ------------------------------------------------------
     * Check existing tables
     * ------------------------------------------------------
     */
    const [[tableCount]] = await conn.query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `, [dbName]);

    const existingTableCount =
      Number(tableCount.cnt);

    console.log(
      `📊 Existing tables: ${existingTableCount}`,
    );

    /**
     * ------------------------------------------------------
     * FIRST INSTALLATION
     * ------------------------------------------------------
     */
    if (existingTableCount === 0) {
      console.log("");
      console.log("🔧 No tables found.");
      console.log("🔧 Initialising database schema...");
      console.log("");

      await importSchema(conn);

      /**
       * Verify schema before continuing.
       */
      await verifySchema(conn);

      /**
       * Seed locations.
       */
      await seedLocations(conn);

      /**
       * Ensure additional structures.
       */
      await updateRamSpecs(conn);
      await updateJobs(conn);
      await updateUsers(conn);
      await updateInventoryStatuses(conn);
      await ensureTechnicianBorrowingsTable(conn);
      await ensureRepairReplacementTrigger(conn);

      console.log("");
      console.log("========================================");
      console.log("✅ DATABASE INITIALIZATION COMPLETE");
      console.log("========================================");
    }

    /**
     * ------------------------------------------------------
     * EXISTING DATABASE
     * ------------------------------------------------------
     */
    else {
      console.log("");
      console.log(
        "✅ Database already contains tables.",
      );
      console.log(
        "🔧 Running safe migrations and trigger updates...",
      );
      console.log("");

      /**
       * Run migrations.
       */
      await updateRamSpecs(conn);
      await updateJobs(conn);
      await updateUsers(conn);
      await updateInventoryStatuses(conn);

      /**
       * Create technician borrowing table if needed.
       */
      await ensureTechnicianBorrowingsTable(conn);

      /**
       * Recreate repair replacement trigger.
       *
       * This is the important part that fixes the
       * ELSEIF / END IF errors.
       */
      await ensureRepairReplacementTrigger(conn);

      /**
       * Seed locations again safely.
       * INSERT IGNORE prevents duplicates.
       */
      await seedLocations(conn);

      /**
       * Verify important tables.
       */
      await verifySchema(conn);

      console.log("");
      console.log("========================================");
      console.log("✅ DATABASE UPDATE COMPLETE");
      console.log("========================================");
    }

    return true;
  } catch (err) {
    console.error("");
    console.error("========================================");
    console.error("❌ DATABASE INITIALIZATION FAILED");
    console.error("========================================");
    console.error("Error:", err.message);
    console.error("");

    /**
     * Re-throw the error.
     *
     * index.js already handles this and exits the
     * application when initialization fails.
     */
    throw err;
  } finally {
    /**
     * Always close the connection.
     */
    if (conn) {
      try {
        await conn.end();
        console.log("🔌 MySQL connection closed");
      } catch (closeErr) {
        console.warn(
          "⚠️ Could not close MySQL connection:",
          closeErr.message,
        );
      }
    }
  }
}

export default autoInitialize;
