import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { uploadFileManager } from "../../middlewares/upload.middleware.js";
import {
    uploadFiles,
    getFiles,
    getFolders,
    createFolder,
    deleteFolder,
    updateFile,
    deleteFile,
    getStorageStats,
    shareFile,
    createDocument,
    updateDocumentContent,
    getShareableEmployees
} from "../../controllers/file-manager/file.controller.js";

const router = express.Router();

// Middleware: Check if user has fileManager access
const canAccessFileManager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    }
    const role = (req.user.role || "").toLowerCase();
    if (["global_admin", "admin", "management"].includes(role)) {
        return next();
    }
    if (req.user.permissions?.fileManager === false) {
        return res.status(403).json({
            success: false,
            message: "Access denied. You do not have permission to access File Manager."
        });
    }
    next();
};

router.use(isAuthenticated, canAccessFileManager);

// Routes
router.post("/upload", uploadFileManager.array("files", 20), uploadFiles);
router.post("/create-document", createDocument);
router.put("/:id/content", updateDocumentContent);
router.post("/:id/share", shareFile);
router.get("/employees", getShareableEmployees);
router.get("/", getFiles);
router.get("/folders", getFolders);
router.post("/folders", createFolder);
router.delete("/folders/:nameOrId", deleteFolder);
router.get("/stats", getStorageStats);
router.put("/:id", updateFile);
router.delete("/:id", deleteFile);

export default router;
