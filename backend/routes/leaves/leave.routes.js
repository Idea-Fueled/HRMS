import express from "express";
import {
    applyLeave,
    getLeaveSummary,
    getLeaveHistory,
    updateLeaveBalance,
    requestCompOffCredit
} from "../../controllers/leaves/leave.controller.js";

const router = express.Router();

router.post("/", applyLeave);
router.post("/request-comp-off-credit", requestCompOffCredit);
router.get("/summary/:employeeId", getLeaveSummary);
router.get("/history/:employeeId", getLeaveHistory);
router.put("/balance/:employeeId", updateLeaveBalance);

export default router;