import express from "express";
import { verifyManager } from "../middleware/auth.js";
import {
  createSoftwareKey,
  getSoftwareKeys,
} from "../controllers/softwarekeys.controller.js";

const router = express.Router();

router.get("/", ...verifyManager, getSoftwareKeys);
router.post("/", ...verifyManager, createSoftwareKey);

export default router;
