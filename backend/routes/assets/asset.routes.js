import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import {
    getAllAssets,
    getAssignedAssets,
    createAsset,
    updateAsset,
    assignAsset,
    unassignAsset,
    updateAssetStatusCondition,
    deleteAsset,
    acknowledgeAssetByToken,
    acknowledgeAsset,
    requestNewAsset,
    sendAssetEmail
} from "../../controllers/assets/asset.controller.js";

const router = express.Router();

// Middleware to restrict admin asset operations strictly to Global Admin only
const isGlobalAdmin = (req, res, next) => {
    if (req.user && (req.user.role === "global_admin" || req.user.role === "admin")) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Forbidden. Access denied. Only Global Admin can access this Assets management action."
        });
    }
};

// 1. Employee Acknowledgment Endpoints
// Direct link from email (token in query string, no login required)
router.get("/:id/acknowledge", acknowledgeAssetByToken);
// Authenticated call from HRMS UI
router.post("/:id/acknowledge", isAuthenticated, acknowledgeAsset);

// 2. Employee Request New Asset (Available to any authenticated employee)
router.post("/request", isAuthenticated, requestNewAsset);

// 3. Read-only endpoints for all authenticated users (Employees can view assigned assets on profile)
router.get("/", isAuthenticated, getAllAssets);
router.get("/assigned", isAuthenticated, getAssignedAssets);

// 4. Mutation endpoints strictly restricted to Global Admin only
router.post("/", isAuthenticated, isGlobalAdmin, createAsset);
router.put("/:id", isAuthenticated, isGlobalAdmin, updateAsset);
router.post("/:id/assign", isAuthenticated, isGlobalAdmin, assignAsset);
router.post("/:id/unassign", isAuthenticated, isGlobalAdmin, unassignAsset);
router.post("/:id/send-email", isAuthenticated, isGlobalAdmin, sendAssetEmail);
router.patch("/:id/status", isAuthenticated, isGlobalAdmin, updateAssetStatusCondition);
router.delete("/:id", isAuthenticated, isGlobalAdmin, deleteAsset);

export default router;

