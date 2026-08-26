import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME     || 'smartboard_ops_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

pool.getConnection()
  .then(conn => {
    console.log('✅ Database pool connected');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Database pool connection failed:', err.message);
  });

export default pool;
