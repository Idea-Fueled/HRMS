import Document from "../../models/documents/document.model.js";
import User from "../../models/users/user.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../../services/cloudinary.service.js";

// Helper to format file sizes
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/* ─────────────────────────────────────────────
   GET ALL DOCUMENTS (with Role-Based Access Control)
   ───────────────────────────────────────────── */
export const getAllDocuments = async (req, res) => {
    try {
        const { type, category, employeeId, search } = req.query;
        const userRole = req.user?.role;
        const userId = req.user?.id || req.user?.userId;

        // Build query filter
        const query = {};

        // 1. Role-based filtration:
        // Employees and Managers can ONLY see "company" documents.
        // Admins and HR can see both "company" and "employee" documents.
        if (userRole === "admin" || userRole === "hr") {
            if (type) {
                query.type = type;
            }
            if (employeeId) {
                query.employeeId = employeeId;
            }
        } else {
            // Normal employees can only fetch company documents
            query.type = "company";
        }

        // 2. Extra filter criteria
        if (category) {
            query.category = category;
        }

        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.title = searchRegex;
        }

        // Fetch documents
        const documents = await Document.find(query)
            .populate("employeeId", "fullName employeeId email department designation")
            .populate("uploadedBy", "fullName email role")
            .sort({ createdAt: -1 })
            .lean();

        // Fetch unique categories for active scope
        const categoriesQuery = {};
        if (userRole === "admin" || userRole === "hr") {
            if (type) {
                categoriesQuery.type = type;
            }
        } else {
            categoriesQuery.type = "company";
        }
        const dbCategories = await Document.distinct("category", categoriesQuery);

        return res.status(200).json({
            success: true,
            documents,
            categories: dbCategories
        });
    } catch (error) {
        console.error("Get All Documents Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CREATE DOCUMENT (Admin/HR only)
   ───────────────────────────────────────────── */
export const createDocument = async (req, res) => {
    try {
        const { title, description, type, category, employeeId, url } = req.body;
        const userId = req.user?.id || req.user?.userId;

        // Validation
        if (!title || !type || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, type (company/employee), and category are required."
            });
        }

        if (type === "employee" && !employeeId) {
            return res.status(400).json({
                success: false,
                message: "Employee ID is required for employee-type documents."
            });
        }

        // Verify employee exists if employee type
        if (type === "employee") {
            const employeeExists = await User.findById(employeeId);
            if (!employeeExists) {
                return res.status(404).json({ success: false, message: "Target employee not found." });
            }
        }

        let documentUrl = url;
        let fileSizeStr = "";
        let fileTypeStr = "";

        // If file is uploaded, upload to Cloudinary
        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, "hrms_documents", "auto");
                documentUrl = uploadResult.secure_url;
                fileSizeStr = formatBytes(req.file.size);
                fileTypeStr = req.file.mimetype.split("/")[1]?.toUpperCase() || "FILE";
            } catch (err) {
                console.error("Cloudinary upload failed:", err);
                return res.status(500).json({ success: false, message: "Failed to upload file to Cloudinary." });
            }
        }

        if (!documentUrl) {
            return res.status(400).json({
                success: false,
                message: "Please upload a document file or provide a URL link."
            });
        }

        const document = await Document.create({
            title,
            description: description || "",
            type,
            category,
            url: documentUrl,
            employeeId: type === "employee" ? employeeId : null,
            uploadedBy: userId,
            fileSize: fileSizeStr,
            fileType: fileTypeStr
        });

        const populated = await Document.findById(document._id)
            .populate("employeeId", "fullName employeeId email")
            .populate("uploadedBy", "fullName email")
            .lean();

        return res.status(201).json({
            success: true,
            message: "Document created successfully.",
            document: populated
        });
    } catch (error) {
        console.error("Create Document Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE DOCUMENT (Admin/HR only)
   ───────────────────────────────────────────── */
export const updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, type, employeeId, url } = req.body;

        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ success: false, message: "Document not found." });
        }

        if (title) document.title = title;
        if (description !== undefined) document.description = description;
        if (category) document.category = category;

        if (type) {
            document.type = type;
            if (type === "company") {
                document.employeeId = null;
            } else if (type === "employee" && employeeId) {
                // Verify employee exists
                const employeeExists = await User.findById(employeeId);
                if (!employeeExists) {
                    return res.status(404).json({ success: false, message: "Target employee not found." });
                }
                document.employeeId = employeeId;
            }
        }

        // Handle file replacement if a new file is uploaded
        if (req.file) {
            try {
                // Delete old Cloudinary asset
                if (document.url) {
                    await deleteFromCloudinary(document.url);
                }
                // Upload new
                const uploadResult = await uploadToCloudinary(req.file.buffer, "hrms_documents", "auto");
                document.url = uploadResult.secure_url;
                document.fileSize = formatBytes(req.file.size);
                document.fileType = req.file.mimetype.split("/")[1]?.toUpperCase() || "FILE";
            } catch (err) {
                console.error("Replace Cloudinary asset failed:", err);
                return res.status(500).json({ success: false, message: "Failed to upload file to Cloudinary." });
            }
        } else if (url) {
            // If manual URL string is updated instead of file
            if (url !== document.url) {
                if (document.url && document.url.includes("cloudinary.com")) {
                    await deleteFromCloudinary(document.url);
                }
                document.url = url;
                document.fileSize = "";
                document.fileType = "URL";
            }
        }

        await document.save();

        const populated = await Document.findById(document._id)
            .populate("employeeId", "fullName employeeId email")
            .populate("uploadedBy", "fullName email")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Document updated successfully.",
            document: populated
        });
    } catch (error) {
        console.error("Update Document Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   DELETE DOCUMENT (Admin/HR only)
   ───────────────────────────────────────────── */
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const document = await Document.findById(id);
        if (!document) {
            return res.status(404).json({ success: false, message: "Document not found." });
        }

        // Delete from Cloudinary if exists
        if (document.url) {
            await deleteFromCloudinary(document.url);
        }

        // Delete from database
        await Document.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully."
        });
    } catch (error) {
        console.error("Delete Document Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
