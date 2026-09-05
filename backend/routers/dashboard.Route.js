import express from "express";
import { dashboardData } from "../controllers/dashboard.Controller.js";
import { getOperationsOverview } from "../controllers/opsDashboard.controller.js";
import { verifyAdmin, verifyManager } from "../middleware/auth.js";

const dashboardRouter = express.Router();

dashboardRouter.get("/", verifyAdmin, dashboardData);
dashboardRouter.get("/overview", ...verifyManager, getOperationsOverview);
export default dashboardRouter;
