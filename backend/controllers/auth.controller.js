import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import pool from '../config/db.config.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ loginStatus: false, Error: 'Username and password required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (rows.length === 0) return res.json({ loginStatus: false, Error: 'Invalid credentials' });

    const user = rows[0];
    if (!user.is_active) return res.json({ loginStatus: false, Error: 'Account disabled' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.json({ loginStatus: false, Error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none', maxAge: 8 * 3600000 });
    return res.json({ loginStatus: true, role: user.role, full_name: user.full_name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ loginStatus: false, Error: 'Server error' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
  return res.json({ Status: true });
};

export const me = (req, res) => res.json({ Status: true, user: req.user });

// ── User Management (admin only) ────────────────────

export const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ Status: true, data: rows });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, full_name, email, role, password } = req.body;
    if (!username || !full_name || !role || !password)
      return res.status(400).json({ Status: false, Error: 'username, full_name, role and password are required' });

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0)
      return res.status(400).json({ Status: false, Error: 'Username already exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, hash, full_name, email || null, role]
    );
    res.json({ Status: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active } = req.body;

    // Prevent admin from deactivating themselves
    if (req.user.id === parseInt(id) && is_active === 0)
      return res.status(400).json({ Status: false, Error: 'Cannot deactivate your own account' });

    await pool.query(
      'UPDATE users SET full_name = ?, email = ?, role = ?, is_active = ? WHERE id = ?',
      [full_name, email || null, role, is_active ?? 1, id]
    );
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6)
      return res.status(400).json({ Status: false, Error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const changeOwnPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ Status: false, Error: 'Invalid password data' });

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ Status: false, Error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ Status: false, Error: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === parseInt(id))
      return res.status(400).json({ Status: false, Error: 'Cannot delete your own account' });

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ Status: true });
  } catch (err) {
    res.status(500).json({ Status: false, Error: err.message });
  }
};
