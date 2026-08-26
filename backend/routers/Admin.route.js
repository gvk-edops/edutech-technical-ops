import express from "express";
import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  updateEmail,
  updatePassword,
  createAdmin,
  getAllAdmins,
  toggleAdminStatus,
  deleteAdmin,
} from "../controllers/admin.Controller.js";
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/adminlogin", adminLogin);
router.post("/register", createAdmin);
router.post("/adminlogout", adminLogout);
router.get("/admin-profile", verifyAdmin, getAdminProfile);
router.put("/update-email", updateEmail);
router.put("/update-password", verifyAdmin, updatePassword);
router.post("/create-admin", verifyAdmin, createAdmin);
router.get("/admins", verifyAdmin, getAllAdmins);
router.put("/admins/:id/status", verifyAdmin, toggleAdminStatus);
router.delete("/admins/:id", verifyAdmin, deleteAdmin);

export { router as adminRouter };
