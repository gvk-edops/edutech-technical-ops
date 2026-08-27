import express from "express";
import { verifyTechnician, verifyManager } from "../middleware/auth.js";
import {
  getInventory,
  getSpecs,
  addSingle,
  addBatch,
  updateStatus,
  getSummary,
  getSpecSummary,
  getTreeSummary,
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.get("/summary", ...verifyTechnician, getSummary);
router.get("/tree-summary", ...verifyTechnician, getTreeSummary);
router.get("/:type/specs", ...verifyTechnician, getSpecs);
router.get("/:type/spec-summary", ...verifyTechnician, getSpecSummary);
router.get("/:type", ...verifyTechnician, getInventory);
router.post("/:type/single", ...verifyTechnician, addSingle);
router.post("/:type/batch", ...verifyTechnician, addBatch);
router.patch("/:type/:id/status", ...verifyManager, updateStatus);

export default router;
