import express from "express";
import {
  login,
  logout,
  me,
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  changeOwnPassword,
  deleteUser,
} from "../controllers/auth.controller.js";
import { verifyToken, verifyAdmin, optionalToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", optionalToken, logout);
router.get("/me", optionalToken, me);
router.put("/change-password", verifyToken, changeOwnPassword);

// User management — admin only
router.get("/users", ...verifyAdmin, getUsers);
router.post("/users", ...verifyAdmin, createUser);
router.put("/users/:id", ...verifyAdmin, updateUser);
router.put("/users/:id/reset-password", ...verifyAdmin, resetPassword);
router.delete("/users/:id", ...verifyAdmin, deleteUser);

export default router;
