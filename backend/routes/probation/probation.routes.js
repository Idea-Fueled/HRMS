import express from "express";
import {
    getProbationPolicies,
    createProbationPolicy,
    updateProbationPolicy,
    deleteProbationPolicy,
    getPolicyEmployees,
    assignEmployeesToPolicy,
    removeEmployeeFromPolicy,
    extendEmployeeProbation
} from "../../controllers/probation/probation.controller.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import User from "../../models/users/user.model.js";

const router = express.Router();

// Middleware to check global_admin role or probation permission
const canAccessProbation = async (req, res, next) => {
    try {
        const role = (req.user?.role || "").toLowerCase();
        if (role === "global_admin" || role === "admin") {
            return next();
        }
        
        const user = await User.findById(req.user?._id).select("permissions");
        if (user?.permissions?.probation === true || (role === "hr" && user?.permissions?.probation !== false)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: "Access denied. You do not have permission to access probation management."
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// All probation management routes
router.use(isAuthenticated);
router.use(canAccessProbation);

router.get("/policies", getProbationPolicies);
router.post("/policies", createProbationPolicy);
router.put("/policies/:id", updateProbationPolicy);
router.delete("/policies/:id", deleteProbationPolicy);

router.get("/policies/:id/employees", getPolicyEmployees);
router.post("/assign", assignEmployeesToPolicy);
router.post("/remove", removeEmployeeFromPolicy);
router.post("/extend", extendEmployeeProbation);

export default router;
