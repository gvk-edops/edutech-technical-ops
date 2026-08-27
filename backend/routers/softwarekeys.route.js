import express from "express";
import { verifyManager, verifyTechnician } from "../middleware/auth.js";
import { createSoftwareKey, getSoftwareKeys } from "../controllers/softwarekeys.controller.js";

const router = express.Router();

router.get("/", ...verifyTechnician, getSoftwareKeys);
router.post("/", ...verifyManager, createSoftwareKey);

export default router;
