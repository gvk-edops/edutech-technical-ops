import express from "express";
import {
  getBorrowings,
  lendItem,
  returnItem,
  consumeItem,
  scanInventory,
  lendBatch,
} from "../controllers/borrowings.controller.js";
import { verifyManager } from "../middleware/auth.js";

const router = express.Router();

router.use(...verifyManager);

router.get("/", getBorrowings);
router.get("/scan", scanInventory);
router.post("/lend", lendItem);
router.post("/lend-batch", lendBatch);
router.post("/:id/return", returnItem);
router.post("/:id/consume", consumeItem);

export default router;
