import express from "express";
import { verifyAdmin } from "../middleware/auth.js";
import {
  cancelPurchase,
  createPurchase,
  getPurchaseById,
  getPurchases,
  updatePurchase,
} from "../controllers/purchase.Controller.js";

const router = express.Router();

router.get("/", verifyAdmin, getPurchases);
router.post("/", verifyAdmin, createPurchase);
router.get("/:id", verifyAdmin, getPurchaseById);
router.put("/:id", verifyAdmin, updatePurchase);
router.patch("/:id/cancel", verifyAdmin, cancelPurchase);

export default router;
