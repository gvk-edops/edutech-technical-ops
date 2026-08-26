import express from "express";
import { verifyManager, verifyTechnician } from "../middleware/auth.js";
import { getJobs, createJob } from "../controllers/job.controller.js";

const router = express.Router();

router.get("/", ...verifyTechnician, getJobs);
router.post("/", ...verifyManager, createJob);

export default router;
