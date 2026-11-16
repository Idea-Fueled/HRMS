import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { uploadFileManager } from "../../middlewares/upload.middleware.js";
import {
    uploadFiles,
    getFiles,
    getFolders,
    updateFile,
    deleteFile,
    getStorageStats
} from "../../controllers/file-manager/file.controller.js";

const router = express.Router();

// Middleware: Strictly restricted to Global Admin only
const isGlobalAdmin = (req, res, next) => {
    if (req.user && (req.user.role === "global_admin" || req.user.role === "admin")) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Forbidden. Access denied. Only Global Admin can access File Manager."
        });
    }
};

router.use(isAuthenticated, isGlobalAdmin);

// Routes
router.post("/upload", uploadFileManager.array("files", 20), uploadFiles);
router.get("/", getFiles);
router.get("/folders", getFolders);
router.get("/stats", getStorageStats);
router.put("/:id", updateFile);
router.delete("/:id", deleteFile);

export default router;

