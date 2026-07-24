import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { uploadDoc } from "../../middlewares/upload.middleware.js";
import {
    getAllDocuments,
    createDocument,
    updateDocument,
    deleteDocument
} from "../../controllers/documents/document.controller.js";

const router = express.Router();

// Middleware to restrict write actions to admin/hr only
const isAdminOrHR = (req, res, next) => {
    if (req.user && (req.user.role === "global_admin" || req.user.role === "hr")) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Forbidden. Access denied. Only HR and Global Admins can perform this action."
        });
    }
};

// All document routes require authentication
router.use(isAuthenticated);

// Read route: accessible to all authenticated users (filtered dynamically inside controller)
router.get("/", getAllDocuments);

// Write routes: restricted to HR and Admin
router.post("/", isAdminOrHR, uploadDoc.single("file"), createDocument);
router.put("/:id", isAdminOrHR, uploadDoc.single("file"), updateDocument);
router.delete("/:id", isAdminOrHR, deleteDocument);

export default router;
