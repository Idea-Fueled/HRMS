import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import {
    getOnboardingRecords,
    createOnboardingRecord,
    updateOnboardingRecord,
    deleteOnboardingRecord,
    getOffboardingRecords,
    initiateOffboarding,
    updateOffboardingRecord,
    deleteOffboardingRecord,
    submitEmployeeResignation,
    adminInitiateExit
} from "../../controllers/offboarding-onboarding/offboarding-onboarding.controller.js";

const router = express.Router();

// Employee Resignation route (any authenticated employee for their own account)
router.post("/offboarding/resign", isAuthenticated, submitEmployeeResignation);

// Middleware to restrict access strictly to Global Admin and HR roles
const isGlobalAdminOrHR = (req, res, next) => {
    if (req.user && (req.user.role === "global_admin" || req.user.role === "hr")) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Forbidden. Access denied. Only Global Admin and HR can access the Offboarding & Onboarding module."
        });
    }
};

router.use(isAuthenticated, isGlobalAdminOrHR);

// Onboarding Routes
router.get("/onboarding", getOnboardingRecords);
router.post("/onboarding", createOnboardingRecord);
router.put("/onboarding/:id", updateOnboardingRecord);
router.delete("/onboarding/:id", deleteOnboardingRecord);

// Offboarding Routes
router.get("/offboarding", getOffboardingRecords);
router.post("/offboarding", initiateOffboarding);
router.post("/offboarding/admin-initiate", adminInitiateExit);
router.put("/offboarding/:id", updateOffboardingRecord);
router.delete("/offboarding/:id", deleteOffboardingRecord);

export default router;
