import express from "express";
import { clockIn, clockOut, getTodayAttendance, getTodayLogs } from "../../controllers/attendance/attendance.controller.js";

const router = express.Router();

router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut)

router.get("/today/:employeeId", getTodayAttendance)
router.get("/logs/today/:employeeId", getTodayLogs)

export default router;