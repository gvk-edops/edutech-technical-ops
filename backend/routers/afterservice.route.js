import express from "express";
import { verifyManager } from "../middleware/auth.js";
import {
  getAfterServiceJobs,
  getJobUnits,
  getRepairs,
  searchUnits,
  getTechnicians,
  getRepairDetail,
  createRepair,
  updateStatus,
  assignTechnician,
  logReplacement,
  updateNotes,
} from "../controllers/afterservice.controller.js";

const router = express.Router();

router.get("/jobs", ...verifyManager, getAfterServiceJobs);
router.get("/jobs/:jobId/units", ...verifyManager, getJobUnits);
router.get("/", ...verifyManager, getRepairs);
router.get("/units", ...verifyManager, searchUnits);
router.get("/technicians", ...verifyManager, getTechnicians);
router.get("/:id", ...verifyManager, getRepairDetail);
router.post("/", ...verifyManager, createRepair);
router.patch("/:id/status", ...verifyManager, updateStatus);
router.patch("/:id/assign", ...verifyManager, assignTechnician);
router.post("/:id/replacement", ...verifyManager, logReplacement);
router.patch("/:id/notes", ...verifyManager, updateNotes);

export default router;
