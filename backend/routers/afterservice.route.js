import express from "express";
import { verifyTechnician, verifyManager } from "../middleware/auth.js";
import {
  getAfterServiceJobs, getJobUnits,
  getRepairs, searchUnits, getTechnicians, getRepairDetail,
  createRepair, updateStatus, assignTechnician, logReplacement, updateNotes,
} from "../controllers/afterservice.controller.js";

const router = express.Router();

router.get("/jobs",                ...verifyTechnician, getAfterServiceJobs);
router.get("/jobs/:jobId/units",   ...verifyTechnician, getJobUnits);
router.get("/",                    ...verifyTechnician, getRepairs);
router.get("/units",               ...verifyTechnician, searchUnits);
router.get("/technicians",         ...verifyTechnician, getTechnicians);
router.get("/:id",                 ...verifyTechnician, getRepairDetail);
router.post("/",                   ...verifyManager,    createRepair);
router.patch("/:id/status",        ...verifyTechnician, updateStatus);
router.patch("/:id/assign",        ...verifyManager,    assignTechnician);
router.post("/:id/replacement",    ...verifyTechnician, logReplacement);
router.patch("/:id/notes",         ...verifyTechnician, updateNotes);

export default router;
