import express from "express"
import { getDashboardData } from "../../controllers/dashboard/dashboard.controller.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/:employeeId", isAuthenticated, getDashboardData);

export default router;