import express from "express";
import { verifyAdmin, verifyManager } from "../middleware/auth.js";
import {
  getClients,
  getLocations,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller.js";

const router = express.Router();

router.get("/locations", ...verifyManager, getLocations);
router.get("/", ...verifyManager, getClients);
router.post("/", ...verifyManager, createClient);
router.put("/:id", ...verifyManager, updateClient);
router.delete("/:id", ...verifyAdmin, deleteClient);

export default router;
