import express from "express";
import { verifyAdmin, verifyTechnician } from "../middleware/auth.js";
import {
  getSystemSettings,
  getPublicBranding,
  updateSystemSettings,
} from "../controllers/settings.Controller.js";

const router = express.Router();

router.get("/branding", getPublicBranding);
router.get("/system", ...verifyTechnician, getSystemSettings);
router.put("/system", ...verifyAdmin, updateSystemSettings);

export default router;
