import express from "express";
import { verifyAdmin, verifyTechnician } from "../middleware/auth.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../controllers/settings.Controller.js";

const router = express.Router();

router.get("/system", ...verifyTechnician, getSystemSettings);
router.put("/system", ...verifyAdmin, updateSystemSettings);

export default router;
