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
    deleteAsset
} from "../../controllers/assets/asset.controller.js";

const router = express.Router();

// Middleware to restrict all asset operations strictly to Global Admin only
const isGlobalAdmin = (req, res, next) => {
    if (req.user && req.user.role === "global_admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Forbidden. Access denied. Only Global Admin can access the Assets module."
        });
    }
};

// Read-only endpoints for all authenticated users (Employees can view assigned assets on profile)
router.get("/", isAuthenticated, getAllAssets);
router.get("/assigned", isAuthenticated, getAssignedAssets);

// Mutation endpoints strictly restricted to Global Admin only
router.post("/", isAuthenticated, isGlobalAdmin, createAsset);
router.put("/:id", isAuthenticated, isGlobalAdmin, updateAsset);
router.post("/:id/assign", isAuthenticated, isGlobalAdmin, assignAsset);
router.post("/:id/unassign", isAuthenticated, isGlobalAdmin, unassignAsset);
router.patch("/:id/status", isAuthenticated, isGlobalAdmin, updateAssetStatusCondition);
router.delete("/:id", isAuthenticated, isGlobalAdmin, deleteAsset);

export default router;
