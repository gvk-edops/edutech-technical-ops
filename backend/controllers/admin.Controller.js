import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import "dotenv/config";
import con from "../config/db.config.js";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const adminLogin = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.json({
        loginStatus: false,
        Error: "Wrong email or password",
      });
    }

    const sql = "SELECT * FROM admin WHERE email = ?";
    const [result] = await con.query(sql, [email]);

    if (result.length === 0) {
      return res.json({
        loginStatus: false,
        Error: "Wrong email or password",
      });
    }

    // Check if account is active
    if (result[0].is_active !== 1) {
      return res.json({
        loginStatus: false,
        Error: "Account has been disabled. Please contact the administrator.",
      });
    }

    const storedPassword = result[0].password_hash || result[0].password;
    let isPasswordValid = false;

    if (storedPassword?.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, storedPassword);
    } else if (storedPassword) {
      isPasswordValid = password === storedPassword;
    }

    if (isPasswordValid) {
      const tokenEmail = result[0].email;
      const token = jwt.sign(
        { role: "admin", email: tokenEmail, id: result[0].id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 3600000,
      });
      return res.json({ loginStatus: true });
    } else {
      return res.json({
        loginStatus: false,
        Error: "Wrong email or password",
      });
    }
  } catch (err) {
    return res.json({ loginStatus: false, Error: "Query error" });
  }
};

const updateEmail = async (req, res) => {
  try {
    const { currentEmail, newEmail } = req.body;

    // Validation
    if (!currentEmail || !newEmail) {
      return res.status(400).json({ Error: "Both emails are required" });
    }

    // Verify current email exists
    const [user] = await con.query("SELECT * FROM admin WHERE email = ?", [
      currentEmail,
    ]);

    if (user.length === 0) {
      return res.status(404).json({ Error: "Current email not found" });
    }

    // Check if new email already exists (for different user)
    const [existing] = await con.query(
      "SELECT * FROM admin WHERE email = ? AND email != ?",
      [newEmail, currentEmail],
    );

    if (existing.length > 0) {
      return res.status(400).json({ Error: "Email already in use" });
    }

    // Update email
    await con.query("UPDATE admin SET email = ? WHERE email = ?", [
      newEmail,
      currentEmail,
    ]);

    return res.json({
      Status: "Success",
      message: "Email updated successfully",
    });
  } catch (err) {
    console.error("Error updating email:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ Error: "Both passwords are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ Error: "Password must be at least 6 characters" });
    }

    // Get user from token (assuming verifyAdmin middleware is used)
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ Error: "User not authenticated" });
    }

    // Get user from database
    const [user] = await con.query("SELECT * FROM admin WHERE email = ?", [
      email,
    ]);

    if (user.length === 0) {
      return res.status(404).json({ Error: "User not found" });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(
      currentPassword,
      user[0].password_hash,
    );

    if (!validPassword) {
      return res.status(401).json({ Error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await con.query("UPDATE admin SET password_hash = ? WHERE email = ?", [
      hashedPassword,
      email,
    ]);

    return res.json({
      Status: "Success",
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Error updating password:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

const adminLogout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  return res.json({ Status: "Success", message: "Logged out successfully" });
};

const getAdminProfile = async (req, res) => {
  try {
    const email = req.user?.email;

    if (!email) {
      return res.status(401).json({ Error: "User not authenticated" });
    }

    const [user] = await con.query(
      "SELECT id, email, created_at FROM admin WHERE email = ?",
      [email],
    );

    if (user.length === 0) {
      return res.status(404).json({ Error: "User not found" });
    }

    return res.json({
      Status: "Success",
      data: {
        id: user[0].id,
        email: user[0].email,
        role: "Administrator",
        created_at: user[0].created_at,
      },
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

const createAdmin = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password, confirmPassword } = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ Error: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ Error: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ Error: "Password must be at least 6 characters" });
    }

    // Check if email already exists
    const [existing] = await con.query("SELECT * FROM admin WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({ Error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin account
    await con.query("INSERT INTO admin (email, password_hash) VALUES (?, ?)", [
      email,
      hashedPassword,
    ]);

    return res.json({
      Status: "Success",
      message: "Admin account created successfully",
    });
  } catch (err) {
    console.error("Error creating admin:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const sql = `
      SELECT id, email, is_active, created_at, updated_at
      FROM admin
      ORDER BY created_at DESC
    `;
    const [admins] = await con.query(sql);

    return res.json({
      Status: "Success",
      admins: admins,
    });
  } catch (err) {
    console.error("Error fetching admins:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const currentAdminEmail = req.email || req.user?.email; // From JWT token

    if (!currentAdminEmail) {
      return res
        .status(401)
        .json({ Error: "Unauthorized - no email in token" });
    }

    // Convert id to number for comparison
    const targetId = parseInt(id);

    // Get current admin's ID
    const [currentAdmin] = await con.query(
      "SELECT id FROM admin WHERE email = ?",
      [currentAdminEmail],
    );

    if (currentAdmin.length === 0) {
      return res.status(401).json({ Error: "Unauthorized - admin not found" });
    }

    // Prevent admin from disabling themselves
    if (currentAdmin[0].id === targetId) {
      return res
        .status(400)
        .json({ Error: "Cannot modify your own account status" });
    }

    // Verify target admin exists
    const [targetAdmin] = await con.query("SELECT id FROM admin WHERE id = ?", [
      targetId,
    ]);

    if (targetAdmin.length === 0) {
      return res.status(404).json({ Error: "Admin not found" });
    }

    // Update status
    await con.query("UPDATE admin SET is_active = ? WHERE id = ?", [
      is_active ? 1 : 0,
      targetId,
    ]);

    return res.json({
      Status: "Success",
      message: `Admin account ${is_active ? "enabled" : "disabled"} successfully`,
    });
  } catch (err) {
    console.error("Error toggling admin status:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const currentAdminEmail = req.email || req.user?.email; // From JWT token

    if (!currentAdminEmail) {
      return res
        .status(401)
        .json({ Error: "Unauthorized - no email in token" });
    }

    // Convert id to number for comparison
    const targetId = parseInt(id);

    // Get current admin's ID
    const [currentAdmin] = await con.query(
      "SELECT id FROM admin WHERE email = ?",
      [currentAdminEmail],
    );

    if (currentAdmin.length === 0) {
      return res.status(401).json({ Error: "Unauthorized - admin not found" });
    }

    // Prevent admin from deleting themselves
    if (currentAdmin[0].id === targetId) {
      return res.status(400).json({ Error: "Cannot delete your own account" });
    }

    // Verify target admin exists
    const [targetAdmin] = await con.query("SELECT id FROM admin WHERE id = ?", [
      targetId,
    ]);

    if (targetAdmin.length === 0) {
      return res.status(404).json({ Error: "Admin not found" });
    }

    // Delete admin
    await con.query("DELETE FROM admin WHERE id = ?", [targetId]);

    return res.json({
      Status: "Success",
      message: "Admin account deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting admin:", err);
    return res.status(500).json({ Error: "Database error" });
  }
};

export {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateEmail,
  updatePassword,
  createAdmin,
  getAllAdmins,
  toggleAdminStatus,
  deleteAdmin,
};
