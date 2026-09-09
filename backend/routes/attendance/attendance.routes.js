import express from "express";
import { clockIn, clockOut, getTodayAttendance, getTodayLogs, getAttendanceDashboardSummary, getEmployeeAttendanceHistory } from "../../controllers/attendance/attendance.controller.js";

const router = express.Router();

router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut);

router.get("/today/:employeeId", getTodayAttendance);
router.get("/logs/today/:employeeId", getTodayLogs);
router.get("/dashboard-summary", getAttendanceDashboardSummary);
router.get("/history/:employeeId", getEmployeeAttendanceHistory);

export default router;