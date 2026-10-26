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

const router = express.Router();

router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut);

router.get("/today/:employeeId", getTodayAttendance);
router.get("/logs/today/:employeeId", getTodayLogs);
router.get("/dashboard-summary", getAttendanceDashboardSummary);
router.get("/history/:employeeId", getEmployeeAttendanceHistory);
router.post("/import/:employeeId", uploadDoc.single("file"), importEmployeeAttendance);

// Biometric Direct Sync Endpoints
router.post("/biometric-sync", syncBiometricPunches);
router.get("/biometric-status", getBiometricStatus);

export default router;