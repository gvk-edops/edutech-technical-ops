import express from "express";
import { verifyAdmin } from "../middleware/auth.js";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.Controller.js";

const router = express.Router();

router.get("/", verifyAdmin, getSuppliers);
router.post("/", verifyAdmin, createSupplier);
router.put("/:id", verifyAdmin, updateSupplier);
router.delete("/:id", verifyAdmin, deleteSupplier);

export default router;
