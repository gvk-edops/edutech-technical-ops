import express from "express";
import { verifyTechnician } from "../middleware/auth.js";
import {
  getAssemblyJobs,
  getJobDetail,
  getAvailableOps,
  getAvailableRam,
  getAvailableStorage,
  getAvailableNetworkCards,
  startAssembly,
  addRam,
  removeRam,
  addStorage,
  removeStorage,
  setWifi,
  addSoftware,
  removeSoftware,
  completeUnit,
  completeSmartboardJob,
} from "../controllers/assembly.controller.js";

const router = express.Router();

router.get("/jobs",                          ...verifyTechnician, getAssemblyJobs);
router.get("/jobs/:jobId",                   ...verifyTechnician, getJobDetail);
router.get("/available-ops/:jobId",          ...verifyTechnician, getAvailableOps);
router.get("/available-ram/:jobId",          ...verifyTechnician, getAvailableRam);
router.get("/available-storage/:specId",     ...verifyTechnician, getAvailableStorage);
router.get("/available-network-cards",       ...verifyTechnician, getAvailableNetworkCards);
router.post("/start",                        ...verifyTechnician, startAssembly);
router.post("/complete-smartboard",          ...verifyTechnician, completeSmartboardJob);
router.post("/:unitId/ram",                  ...verifyTechnician, addRam);
router.delete("/:unitId/ram/:ramId",         ...verifyTechnician, removeRam);
router.post("/:unitId/storage",              ...verifyTechnician, addStorage);
router.delete("/:unitId/storage/:storageId", ...verifyTechnician, removeStorage);
router.post("/:unitId/wifi",                 ...verifyTechnician, setWifi);
router.post("/:unitId/software",             ...verifyTechnician, addSoftware);
router.delete("/:unitId/software/:catalogId",...verifyTechnician, removeSoftware);
router.post("/:unitId/complete",             ...verifyTechnician, completeUnit);

export default router;
