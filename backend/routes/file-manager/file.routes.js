import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { uploadFileManager } from "../../middlewares/upload.middleware.js";
import {
    uploadFiles,
    getFiles,
    getFolders,
    createFolder,
    updateFile,
    deleteFile,
    getStorageStats
} from "../../controllers/file-manager/file.controller.js";

const router = express.Router();

// Middleware: Strictly restricted to Puneet, Rishabh, and Esha only
const isFileManagerAdmin = (req, res, next) => {
    const callerEmail = (req.user?.email || "").toLowerCase();
    const allowed = ["puneet@ideafueled.com", "rishabhloomba860@gmail.com", "esha@ideafueled.com"];
    if (req.user && allowed.includes(callerEmail)) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Forbidden. Access denied. Only Puneet and Esha can access File Manager."
        });
    }
};

router.use(isAuthenticated, isFileManagerAdmin);

// Routes
router.post("/upload", uploadFileManager.array("files", 20), uploadFiles);
router.get("/", getFiles);
router.get("/folders", getFolders);
router.post("/folders", createFolder);
router.get("/stats", getStorageStats);
router.put("/:id", updateFile);
router.delete("/:id", deleteFile);

export default router;

