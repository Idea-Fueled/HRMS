import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import User from "../../models/users/user.model.js";
import {
    getWeeklyReport,
    getMonthlyReport,
    sendWeeklyReportEmail,
    sendMonthlyReportEmail,
    exportWeeklyReportCsv,
    exportMonthlyReportCsv
} from "../../controllers/reports/report.controller.js";

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
                message: "Access denied. Only Global Administrators can view or manage work reports."
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

router.use(isAuthenticated);
router.use(requireGlobalAdmin);

// Report queries
router.get("/weekly", getWeeklyReport);
router.get("/monthly", getMonthlyReport);

// Direct CSV / Excel exports
router.get("/export-weekly", exportWeeklyReportCsv);
router.get("/export-monthly", exportMonthlyReportCsv);

// Manual email triggers
router.post("/send-weekly-email", sendWeeklyReportEmail);
router.post("/send-monthly-email", sendMonthlyReportEmail);

export default router;
