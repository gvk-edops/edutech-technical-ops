import pool from "../config/db.config.js";

const getIp = (req) => req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
  || req?.ip
  || req?.socket?.remoteAddress
  || null;

// Audit writes must never interrupt the successful business action they describe.
export const logAction = async ({ userId = null, action, entityType = null, entityId = null, details = null, req = null }) => {
  try {
    await pool.query(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?,?,?,?,?,?)",
      [
        userId,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        getIp(req),
      ],
    );
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};
