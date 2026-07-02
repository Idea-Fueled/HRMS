import express from "express";
import { 
    getTeamSummary, 
    getTeamMembers, 
    getTeamAttendance, 
    getTeamLeaves, 
    getTeamPerformance,
    updateLeaveStatus
} from "../../controllers/team/team.controller.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(isAuthenticated);

router.get("/summary", getTeamSummary);
router.get("/members", getTeamMembers);
router.get("/attendance", getTeamAttendance);
router.get("/leaves", getTeamLeaves);
router.get("/performance", getTeamPerformance);
router.put("/leaves/:id/status", updateLeaveStatus);

export default router;
