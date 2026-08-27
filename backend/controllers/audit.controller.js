import pool from "../config/db.config.js";
import { logAction } from "../utils/audit.js";

// GET /audit/logs — accessible only through the isolated auditor role
export const getAuditLogs = async (req, res) => {
  const { action, entity_type: entityType, user_id: userId, from, to, page = 1, limit = 50 } = req.query;
  const where = [];
  const params = [];
  if (action) { where.push("al.action = ?"); params.push(action); }
  if (entityType) { where.push("al.entity_type = ?"); params.push(entityType); }
  if (userId) { where.push("al.user_id = ?"); params.push(userId); }
  if (from) { where.push("DATE(al.created_at) >= ?"); params.push(from); }
  if (to) { where.push("DATE(al.created_at) <= ?"); params.push(to); }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);

  try {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs al ${whereClause}`, params);
    const [rows] = await pool.query(`
      SELECT al.*, u.username, u.full_name, u.role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.id DESC
      LIMIT ? OFFSET ?`, [...params, pageSize, (pageNumber - 1) * pageSize]);
    res.json({ Status: true, data: rows, pagination: { page: pageNumber, limit: pageSize, total } });
    void logAction({ userId: req.user.id, action: "audit.viewed", entityType: "audit_log", details: { page: pageNumber }, req });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const getAuditFilterOptions = async (req, res) => {
  try {
    const [actions, entities, users] = await Promise.all([
      pool.query("SELECT DISTINCT action FROM audit_logs ORDER BY action"),
      pool.query("SELECT DISTINCT entity_type FROM audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type"),
      pool.query("SELECT DISTINCT u.id, u.full_name, u.username FROM audit_logs al JOIN users u ON u.id=al.user_id ORDER BY u.full_name"),
    ]);
    res.json({
      Status: true,
      data: { actions: actions[0], entityTypes: entities[0], users: users[0] },
    });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};
