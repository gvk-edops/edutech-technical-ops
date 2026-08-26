// Run: node seed-admin.js
// Creates the initial admin user: admin / admin123
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const hash = await bcrypt.hash('admin123', 10);
await conn.query(
  `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE id=id`,
  ['admin', hash, 'System Administrator', 'admin']
);
console.log('✅ Admin user created: admin / admin123');
await conn.end();
