import express from "express";
import {
    clockIn,
    clockOut,
    getTodayAttendance,
    getTodayLogs,
    getAttendanceDashboardSummary,
    getEmployeeAttendanceHistory,
    importEmployeeAttendance,
    syncBiometricPunches,
    getBiometricStatus
} from "../../controllers/attendance/attendance.controller.js";
import { uploadDoc } from "../../middlewares/upload.middleware.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/clock-in", isAuthenticated, clockIn);
router.post("/clock-out", isAuthenticated, clockOut);

router.get("/today/:employeeId", isAuthenticated, getTodayAttendance);
router.get("/logs/today/:employeeId", isAuthenticated, getTodayLogs);
router.get("/dashboard-summary", isAuthenticated, getAttendanceDashboardSummary);
router.get("/history/:employeeId", isAuthenticated, getEmployeeAttendanceHistory);
router.post("/import/:employeeId", isAuthenticated, uploadDoc.single("file"), importEmployeeAttendance);

// Biometric Direct Sync Endpoints
router.post("/biometric-sync", syncBiometricPunches);
router.get("/biometric-status", getBiometricStatus);

export default router;