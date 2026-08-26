import pool from '../config/db.config.js';

// Map of route key → { table, fields }
const CATALOGS = {
  'smartboard-models': {
    table: 'smartboard_models',
    insert: (b) => ['INSERT INTO smartboard_models (model_name, brand, description) VALUES (?,?,?)', [b.model_name, b.brand || null, b.description || null]],
    update: (b, id) => ['UPDATE smartboard_models SET model_name=?, brand=?, description=? WHERE id=?', [b.model_name, b.brand || null, b.description || null, id]],
  },
  'ops-models': {
    table: 'ops_models',
    insert: (b) => ['INSERT INTO ops_models (model_name, processor_series, processor_core, processor_count, base_speed_ghz, cache_mb, description) VALUES (?,?,?,?,?,?,?)',
      [b.model_name, b.processor_series, b.processor_core, b.processor_count || null, b.base_speed_ghz || null, b.cache_mb || null, b.description || null]],
    update: (b, id) => ['UPDATE ops_models SET model_name=?, processor_series=?, processor_core=?, processor_count=?, base_speed_ghz=?, cache_mb=?, description=? WHERE id=?',
      [b.model_name, b.processor_series, b.processor_core, b.processor_count || null, b.base_speed_ghz || null, b.cache_mb || null, b.description || null, id]],
  },
  'ram-specs': {
    table: 'ram_specs',
    insert: (b) => ['INSERT INTO ram_specs (ddr_version, capacity_gb, description) VALUES (?,?,?)', [b.ddr_version, b.capacity_gb, b.description || null]],
    update: (b, id) => ['UPDATE ram_specs SET ddr_version=?, capacity_gb=?, description=? WHERE id=?', [b.ddr_version, b.capacity_gb, b.description || null, id]],
  },
  'storage-specs': {
    table: 'storage_specs',
    insert: (b) => ['INSERT INTO storage_specs (form_factor, interface, storage_type, capacity_gb, description) VALUES (?,?,?,?,?)',
      [b.form_factor, b.interface, b.storage_type, b.capacity_gb, b.description || null]],
    update: (b, id) => ['UPDATE storage_specs SET form_factor=?, interface=?, storage_type=?, capacity_gb=?, description=? WHERE id=?',
      [b.form_factor, b.interface, b.storage_type, b.capacity_gb, b.description || null, id]],
  },
  'network-card-models': {
    table: 'network_card_models',
    insert: (b) => ['INSERT INTO network_card_models (model_name, description) VALUES (?,?)', [b.model_name, b.description || null]],
    update: (b, id) => ['UPDATE network_card_models SET model_name=?, description=? WHERE id=?', [b.model_name, b.description || null, id]],
  },
  'main-software': {
    table: 'main_software_catalog',
    insert: (b) => ['INSERT INTO main_software_catalog (software_type, name, version, description) VALUES (?,?,?,?)',
      [b.software_type, b.name, b.version || null, b.description || null]],
    update: (b, id) => ['UPDATE main_software_catalog SET software_type=?, name=?, version=?, description=? WHERE id=?',
      [b.software_type, b.name, b.version || null, b.description || null, id]],
  },
  'additional-software': {
    table: 'additional_software_catalog',
    insert: (b) => ['INSERT INTO additional_software_catalog (name, version, description) VALUES (?,?,?)', [b.name, b.version || null, b.description || null]],
    update: (b, id) => ['UPDATE additional_software_catalog SET name=?, version=?, description=? WHERE id=?', [b.name, b.version || null, b.description || null, id]],
  },
};

export const getAll = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat) return res.status(404).json({ Status: false, Error: 'Unknown catalog' });
  try {
    const [rows] = await pool.query(`SELECT * FROM ${cat.table} ORDER BY id DESC`);
    res.json({ Status: true, data: rows });
  } catch (err) { res.status(500).json({ Status: false, Error: err.message }); }
};

export const create = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat) return res.status(404).json({ Status: false, Error: 'Unknown catalog' });
  try {
    const [sql, params] = cat.insert(req.body);
    const [result] = await pool.query(sql, params);
    res.json({ Status: true, id: result.insertId });
  } catch (err) { res.status(500).json({ Status: false, Error: err.message }); }
};

export const update = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat) return res.status(404).json({ Status: false, Error: 'Unknown catalog' });
  try {
    const [sql, params] = cat.update(req.body, req.params.id);
    await pool.query(sql, params);
    res.json({ Status: true });
  } catch (err) { res.status(500).json({ Status: false, Error: err.message }); }
};

export const remove = async (req, res) => {
  const cat = CATALOGS[req.params.catalog];
  if (!cat) return res.status(404).json({ Status: false, Error: 'Unknown catalog' });
  try {
    await pool.query(`DELETE FROM ${cat.table} WHERE id = ?`, [req.params.id]);
    res.json({ Status: true });
  } catch (err) { res.status(500).json({ Status: false, Error: err.message }); }
};
