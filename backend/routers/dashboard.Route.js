import express from 'express';
import { dashboardData } from '../controllers/dashboard.Controller.js';
import { verifyAdmin } from '../middleware/auth.js';

const dashboardRouter = express.Router();

dashboardRouter.get('/', verifyAdmin, dashboardData);
export default dashboardRouter;