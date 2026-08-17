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

// All asset routes require authentication and Global Admin role
router.use(isAuthenticated, isGlobalAdmin);

router.get("/", getAllAssets);
router.get("/assigned", getAssignedAssets);
router.post("/", createAsset);
router.put("/:id", updateAsset);
router.post("/:id/assign", assignAsset);
router.post("/:id/unassign", unassignAsset);
router.patch("/:id/status", updateAssetStatusCondition);
router.delete("/:id", deleteAsset);

export default router;
