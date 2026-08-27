import express from "express";
import { verifyManager } from "../middleware/auth.js";
import {
  getDeliveryJobs,
  getDeliveryJobDetail,
  confirmDelivery,
} from "../controllers/delivery.controller.js";

const router = express.Router();

router.get("/jobs", ...verifyManager, getDeliveryJobs);
router.get("/jobs/:jobId", ...verifyManager, getDeliveryJobDetail);
router.post("/jobs/:jobId", ...verifyManager, confirmDelivery);

export default router;
