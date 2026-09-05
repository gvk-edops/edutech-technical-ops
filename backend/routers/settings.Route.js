import express from "express";
import { verifyAdmin, verifyManager } from "../middleware/auth.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../controllers/settings.Controller.js";

const router = express.Router();

router.get("/system", ...verifyManager, getSystemSettings);
router.put("/system", ...verifyAdmin, updateSystemSettings);

export default router;
