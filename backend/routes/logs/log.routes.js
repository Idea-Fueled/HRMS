import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import User from "../../models/users/user.model.js";
import {
    trackActivity,
    getActivityLogs,
    getLogStats
} from "../../controllers/logs/log.controller.js";

const router = express.Router();

/**
 * Middleware: Verify Global Admin role strictly
 */
const requireGlobalAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?._id;
        const user = await User.findById(userId).select("role");
        if (!user || user.role !== "global_admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Global Administrators can view user activity logs."
            });
        }
        next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Authentication error: " + err.message
        });
    }
};

// All log routes require authenticated user
router.use(isAuthenticated);

// Tracking endpoint (called by all active employees, skips management users automatically)
router.post("/track", trackActivity);

// Log viewing endpoints (Strictly Global Admin only)
router.get("/", requireGlobalAdmin, getActivityLogs);
router.get("/stats", requireGlobalAdmin, getLogStats);

export default router;
