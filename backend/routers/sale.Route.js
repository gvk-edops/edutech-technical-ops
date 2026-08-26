import express from "express";
import { verifyAdmin } from "../middleware/auth.js";
import {
  cancelSale,
  createSale,
  getAvailableSerials,
  getSaleById,
  getSales,
  updateSale,
} from "../controllers/sale.Controller.js";

const router = express.Router();

router.get("/", verifyAdmin, getSales);
router.get("/products/:productId/serials", verifyAdmin, getAvailableSerials);
router.get("/:id", verifyAdmin, getSaleById);
router.post("/", verifyAdmin, createSale);
router.put("/:id", verifyAdmin, updateSale);
router.patch("/:id/cancel", verifyAdmin, cancelSale);

export default router;
