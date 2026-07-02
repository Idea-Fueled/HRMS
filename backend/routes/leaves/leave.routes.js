import express from "express";
import { applyLeave, getLeaveSummary, getLeaveHistory } from "../../controllers/leaves/leave.controller.js";

const router = express.Router();

router.post("/", applyLeave);
router.get("/summary/:employeeId", getLeaveSummary);
router.get("/history/:employeeId", getLeaveHistory);

export default router;