import express from "express";
import { verifyAuditor } from "../middleware/auth.js";
import {
  getAuditFilterOptions,
  getAuditLogs,
  getAuditOverview,
} from "../controllers/audit.controller.js";

const router = express.Router();

router.get("/filters", ...verifyAuditor, getAuditFilterOptions);
router.get("/overview", ...verifyAuditor, getAuditOverview);
router.get("/logs", ...verifyAuditor, getAuditLogs);

export default router;
