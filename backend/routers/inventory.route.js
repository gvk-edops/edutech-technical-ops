import express from "express";
import { verifyManager } from "../middleware/auth.js";
import {
  getInventory,
  getSpecs,
  addSingle,
  addBatch,
  updateStatus,
  updateInventoryItem,
  deleteInventoryItem,
  getSummary,
  getSpecSummary,
  getTreeSummary,
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.get("/summary", ...verifyManager, getSummary);
router.get("/tree-summary", ...verifyManager, getTreeSummary);
router.get("/:type/specs", ...verifyManager, getSpecs);
router.get("/:type/spec-summary", ...verifyManager, getSpecSummary);
router.get("/:type", ...verifyManager, getInventory);
router.post("/:type/single", ...verifyManager, addSingle);
router.post("/:type/batch", ...verifyManager, addBatch);
router.patch("/:type/:id/status", ...verifyManager, updateStatus);
router.patch("/:type/:id", ...verifyManager, updateInventoryItem);
router.delete("/:type/:id", ...verifyManager, deleteInventoryItem);

export default router;
