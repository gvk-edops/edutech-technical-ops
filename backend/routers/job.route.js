import express from "express";
import { verifyManager, verifyTechnician } from "../middleware/auth.js";
import { getJobs, createJob, updateJob, deleteJob } from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", ...verifyTechnician, getJobs);
router.post("/", ...verifyManager, createJob);
router.patch("/:id", ...verifyManager, updateJob);
router.delete("/:id", ...verifyManager, deleteJob);

export default router;
