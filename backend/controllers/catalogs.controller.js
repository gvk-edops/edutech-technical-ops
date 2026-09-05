import pool from "../config/db.config.js";
import { logAction } from "../utils/audit.js";
import fs from "fs/promises";
import path from "path";

const opsSpecsPaths = [
  path.join(process.cwd(), "public", "ops-cpu-specs.json"),
  path.join(process.cwd(), "frontend", "public", "ops-cpu-specs.json"),
];

const findOpsSpecsPath = async () => {
  for (const filePath of opsSpecsPaths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {}
  }
  return opsSpecsPaths[0];
};

export const getOpsCpuSpecs = async (req, res) => {
  try {
    const filePath = await findOpsSpecsPath();
    const content = await fs.readFile(filePath, "utf8");
    res.json({ Status: true, data: JSON.parse(content) });
  } catch (err) {
    res.status(500).json({ Status: false, Error: `Could not read OPS specs: ${err.message}` });
  }
};

export const updateOpsCpuSpecs = async (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.processors)) {
    return res.status(400).json({ Status: false, Error: "JSON must contain a processors array" });
  }

  const invalid = data.processors.some(
    (item) => !item || typeof item !== "object" || !item.model,
  );
  if (invalid) {
    return res.status(400).json({ Status: false, Error: "Every processor must contain a model" });
  }

  try {
    const filePath = await findOpsSpecsPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    void logAction({ userId: req.user.id, action: "catalog.ops_specs_updated", entityType: "ops_cpu_specs", req });
    res.json({ Status: true, data });
  } catch (err) {
    res.status(500).json({ Status: false, Error: `Could not save OPS specs: ${err.message}` });
  }
};

// Map of route key → { table, fields }
const CATALOGS = {
  "smartboard-models": {
    table: "smartboard_models",
    insert: (b) => [
      "INSERT INTO smartboard_models (model_name, brand, description) VALUES (?,?,?)",
      [b.model_name, b.brand || null, b.description || null],
    ],
    update: (b, id) => [
      "UPDATE smartboard_models SET model_name=?, brand=?, description=? WHERE id=?",
      [b.model_name, b.brand || null, b.description || null, id],
    ],
  },
  "ops-models": {
    table: "ops_models",
    insert: (b) => [
      "INSERT INTO ops_models (model_name, processor_series, processor_core, processor_count, base_speed_ghz, cache_mb, description) VALUES (?,?,?,?,?,?,?)",
      [
        b.model_name,
        b.processor_series,
        b.processor_core,
        b.processor_count || null,
        b.base_speed_ghz || null,
        b.cache_mb || null,
        b.description || null,
      ],
    ],
    update: (b, id) => [
      "UPDATE ops_models SET model_name=?, processor_series=?, processor_core=?, processor_count=?, base_speed_ghz=?, cache_mb=?, description=? WHERE id=?",
      [
        b.model_name,
        b.processor_series,
        b.processor_core,
        b.processor_count || null,
        b.base_speed_ghz || null,
        b.cache_mb || null,
        b.description || null,
        id,
      ],
    ],
  },
  "ram-specs": {
    table: "ram_specs",
    insert: (b) => [
      "INSERT INTO ram_specs (ddr_version, capacity_gb, bus_speed_mhz, description) VALUES (?,?,?,?)",
      [b.ddr_version, b.capacity_gb, b.bus_speed_mhz || null, b.description || null],
    ],
    update: (b, id) => [
      "UPDATE ram_specs SET ddr_version=?, capacity_gb=?, bus_speed_mhz=?, description=? WHERE id=?",
      [b.ddr_version, b.capacity_gb, b.bus_speed_mhz || null, b.description || null, id],
    ],
  },
  "storage-specs": {
    table: "storage_specs",
    insert: (b) => [
      "INSERT INTO storage_specs (form_factor, interface, storage_type, capacity_gb, description) VALUES (?,?,?,?,?)",
      [
        b.form_factor,
        b.interface,
        b.storage_type,
        b.capacity_gb,
        b.description || null,
      ],
    ],
    update: (b, id) => [
      "UPDATE storage_specs SET form_factor=?, interface=?, storage_type=?, capacity_gb=?, description=? WHERE id=?",
      [
        b.form_factor,
        b.interface,
        b.storage_type,
        b.capacity_gb,
        b.description || null,
        id,
      ],
    ],
  },
  "network-card-models": {
    table: "network_card_models",
    insert: (b) => [
      "INSERT INTO network_card_models (model_name, description) VALUES (?,?)",
      [b.model_name, b.description || null],
    ],
    update: (b, id) => [
      "UPDATE network_card_models SET model_name=?, description=? WHERE id=?",
      [b.model_name, b.description || null, id],
    ],
  },
  "main-software": {
    table: "main_software_catalog",
    insert: (b) => [
      "INSERT INTO main_software_catalog (software_type, name, version, description) VALUES (?,?,?,?)",
      [b.software_type, b.name, b.version || null, b.description || null],
    ],
    update: (b, id) => [
      "UPDATE main_software_catalog SET software_type=?, name=?, version=?, description=? WHERE id=?",
      [b.software_type, b.name, b.version || null, b.description || null, id],
    ],
  },
  "additional-software": {
    table: "additional_software_catalog",
    insert: (b) => [
      "INSERT INTO additional_software_catalog (name, version, description) VALUES (?,?,?)",
      [b.name, b.version || null, b.description || null],
    ],
    update: (b, id) => [
      "UPDATE additional_software_catalog SET name=?, version=?, description=? WHERE id=?",
      [b.name, b.version || null, b.description || null, id],
    ],
  },
  software: { unified: true },
};

const getSoftwareTable = (type) => {
  if (type === "main") return "main_software_catalog";
  if (type === "additional") return "additional_software_catalog";
  return null;
};

export const getAll = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat)
    return res.status(404).json({ Status: false, Error: "Unknown catalog" });
  try {
    if (cat.unified) {
      const [rows] = await pool.query(`
        SELECT CONCAT('main:', id) AS id, 'main' AS software_type, name, version, description
        FROM main_software_catalog
        UNION ALL
        SELECT CONCAT('additional:', id) AS id, 'additional' AS software_type, name, version, description
        FROM additional_software_catalog
        ORDER BY id DESC
      `);
      return res.json({ Status: true, data: rows });
    }
    const [rows] = await pool.query(
      `SELECT * FROM ${cat.table} ORDER BY id DESC`,
    );
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const create = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat)
    return res.status(404).json({ Status: false, Error: "Unknown catalog" });
  try {
    if (cat.unified) {
      const table = getSoftwareTable(req.body.software_type);
      if (!table)
        return res
          .status(400)
          .json({ Status: false, Error: "Invalid software type" });
      const [result] = await pool.query(
        req.body.software_type === "main"
          ? `INSERT INTO ${table} (software_type, name, version, description) VALUES ('windows',?,?,?)`
          : `INSERT INTO ${table} (name, version, description) VALUES (?,?,?)`,
        [req.body.name, req.body.version || null, req.body.description || null],
      );
      void logAction({ userId: req.user.id, action: "catalog.created", entityType: `software_${req.body.software_type}`, entityId: result.insertId, req });
      return res.json({
        Status: true,
        id: `${req.body.software_type}:${result.insertId}`,
      });
    }
    const [sql, params] = cat.insert(req.body);
    const [result] = await pool.query(sql, params);
    void logAction({ userId: req.user.id, action: "catalog.created", entityType: req.params.catalog, entityId: result.insertId, req });
    res.json({ Status: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const update = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat)
    return res.status(404).json({ Status: false, Error: "Unknown catalog" });
  try {
    if (cat.unified) {
      const [type, id] = String(req.params.id).split(":");
      const table = getSoftwareTable(type);
      if (!table)
        return res
          .status(400)
          .json({ Status: false, Error: "Invalid software id" });
      await pool.query(
        `UPDATE ${table} SET name=?, version=?, description=? WHERE id=?`,
        [
          req.body.name,
          req.body.version || null,
          req.body.description || null,
          id,
        ],
      );
      void logAction({ userId: req.user.id, action: "catalog.updated", entityType: `software_${type}`, entityId: Number(id), req });
      return res.json({ Status: true });
    }
    const [sql, params] = cat.update(req.body, req.params.id);
    await pool.query(sql, params);
    void logAction({ userId: req.user.id, action: "catalog.updated", entityType: req.params.catalog, entityId: Number(req.params.id), req });
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const remove = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat)
    return res.status(404).json({ Status: false, Error: "Unknown catalog" });
  try {
    if (cat.unified) {
      const [type, id] = String(req.params.id).split(":");
      const table = getSoftwareTable(type);
      if (!table)
        return res
          .status(400)
          .json({ Status: false, Error: "Invalid software id" });
      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      void logAction({ userId: req.user.id, action: "catalog.deleted", entityType: `software_${type}`, entityId: Number(id), req });
      return res.json({ Status: true });
    }
    await pool.query(`DELETE FROM ${cat.table} WHERE id = ?`, [req.params.id]);
    void logAction({ userId: req.user.id, action: "catalog.deleted", entityType: req.params.catalog, entityId: Number(req.params.id), req });
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};
