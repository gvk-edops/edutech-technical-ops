import express from "express";
import { verifyManager } from "../middleware/auth.js";
import {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
} from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", ...verifyManager, getJobs);
router.post("/", ...verifyManager, createJob);
router.patch("/:id", ...verifyManager, updateJob);
router.delete("/:id", ...verifyManager, deleteJob);

export default router;
