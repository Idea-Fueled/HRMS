import mongoose from "mongoose";
import XLSX from "xlsx";
import FileItem from "../../models/file-manager/file.model.js";
import Folder from "../../models/file-manager/folder.model.js";
import User from "../../models/users/user.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../../services/cloudinary.service.js";

// Helper: Format bytes to human readable format
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper: Determine category from mimetype and extension
const getCategoryAndResourceType = (mimeType = "", ext = "") => {
    const extension = ext.toLowerCase().replace(".", "");
    const mime = mimeType.toLowerCase();

    if (
        mime.startsWith("image/") ||
        ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff"].includes(extension)
    ) {
        return { category: "image", resourceType: "image" };
    }

    if (
        mime.startsWith("video/") ||
        ["mp4", "mkv", "mov", "avi", "webm", "wmv", "flv", "m4v"].includes(extension)
    ) {
        return { category: "video", resourceType: "video" };
    }

    if (
        mime.startsWith("audio/") ||
        ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)
    ) {
        return { category: "audio", resourceType: "video" };
    }

    if (
        mime.includes("pdf") ||
        mime.includes("word") ||
        mime.includes("officedocument") ||
        mime.includes("excel") ||
        mime.includes("spreadsheet") ||
        mime.includes("powerpoint") ||
        mime.includes("presentation") ||
        mime.includes("text/") ||
        ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "md"].includes(extension)
    ) {
        return { category: "document", resourceType: "raw" };
    }

    if (
        mime.includes("zip") ||
        mime.includes("compressed") ||
        mime.includes("tar") ||
        ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)
    ) {
        return { category: "archive", resourceType: "raw" };
    }

    return { category: "other", resourceType: "raw" };
};

// Helper: get all descendant folder IDs recursively
const getAllDescendantFolderIds = async (folderId) => {
    const allIds = [folderId];
    const queue = [folderId];
    while (queue.length > 0) {
        const curId = queue.shift();
        const children = await Folder.find({ parentId: curId }).select("_id").lean();
        for (const child of children) {
            allIds.push(child._id);
            queue.push(child._id);
        }
    }
    return allIds;
};

/**
 * Upload one or multiple files
 */
export const uploadFiles = async (req, res) => {
    try {
        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "No files provided for upload." });
        }

        let folderId = null;
        let folderName = (req.body.folder || "").trim();

        if (req.body.folderId && req.body.folderId !== "root" && req.body.folderId !== "null") {
            if (mongoose.Types.ObjectId.isValid(req.body.folderId)) {
                folderId = req.body.folderId;
                const folderDoc = await Folder.findById(folderId);
                if (folderDoc) {
                    folderName = folderDoc.name;
                }
            }
        }

        const customName = req.body.name ? req.body.name.trim() : "";
        const uploadedBy = req.user?.id || req.user?._id;

        const results = [];

        for (const file of files) {
            const originalName = file.originalname;
            const extParts = originalName.split(".");
            const extension = extParts.length > 1 ? extParts.pop().toLowerCase() : "";
            const baseName = extParts.join(".");
            const displayName = files.length === 1 && customName ? customName : baseName;

            const { category, resourceType } = getCategoryAndResourceType(file.mimetype, extension);

            // Upload to Cloudinary under folder
            const folderSlug = folderName ? folderName.toLowerCase().replace(/[^a-z0-9_-]/g, "_") : "general";
            const cloudinaryFolder = `hrms_file_manager/${folderSlug}`;
            const uploadRes = await uploadToCloudinary(file.buffer, cloudinaryFolder, resourceType);

            const fileDoc = await FileItem.create({
                name: displayName,
                originalName: originalName,
                url: uploadRes.secure_url || uploadRes.url,
                publicId: uploadRes.public_id || "",
                resourceType: resourceType,
                mimeType: file.mimetype || "application/octet-stream",
                extension: extension,
                sizeBytes: file.size,
                formattedSize: formatBytes(file.size),
                category: category,
                folder: folderName,
                folderId: folderId,
                uploadedBy: uploadedBy
            });

            await fileDoc.populate("uploadedBy", "fullName email profilePicture");
            await fileDoc.populate("sharedWith.user", "fullName email profilePicture");
            results.push(fileDoc);
        }

        return res.status(201).json({
            success: true,
            message: `Successfully uploaded ${results.length} file(s).`,
            files: results
        });
    } catch (error) {
        console.error("File Manager Upload Error:", error);
        return res.status(500).json({ success: false, message: error.message || "File upload failed." });
    }
};

/**
 * Get all files with filtering and search (scoped per user + shared files)
 */
export const getFiles = async (req, res) => {
    try {
        const { folder, folderId, category, search, all, filter } = req.query;
        const userId = req.user?._id || req.user?.id;

        const query = {};

        // User can only see files they uploaded OR files shared with them
        if (filter === "shared") {
            query["sharedWith.user"] = userId;
        } else if (filter === "my") {
            query.uploadedBy = userId;
        } else {
            query.$or = [
                { uploadedBy: userId },
                { "sharedWith.user": userId }
            ];
        }

        // If searching or all=true, search across all folders
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            const baseOr = query.$or || [{ uploadedBy: userId }, { "sharedWith.user": userId }];
            delete query.$or;
            query.$and = [
                { $or: baseOr },
                { $or: [{ name: regex }, { originalName: regex }] }
            ];
        } else if (all !== "true" && filter !== "shared") {
            if (folderId && folderId !== "all" && folderId !== "root" && folderId !== "null") {
                if (mongoose.Types.ObjectId.isValid(folderId)) {
                    query.folderId = folderId;
                }
            } else if (folderId === "root" || (!folderId && (!folder || folder === "all" || folder === "All Files"))) {
                // At root level
                query.folderId = null;
            } else if (folder && folder !== "all" && folder !== "All Files") {
                query.folder = folder;
            }
        }

        if (category && category !== "all") {
            query.category = category;
        }

        const files = await FileItem.find(query)
            .sort({ createdAt: -1 })
            .populate("uploadedBy", "fullName email profilePicture")
            .populate("sharedWith.user", "fullName email profilePicture")
            .populate("folderId", "name parentId")
            .lean();

        return res.status(200).json({
            success: true,
            files: files
        });
    } catch (error) {
        console.error("File Manager Get Files Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch files." });
    }
};

/**
 * Create a new custom folder or subfolder
 */
export const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Folder name is required." });
        }

        const userId = req.user?._id || req.user?.id;
        const trimmedName = name.trim();
        let validParentId = null;
        let ancestors = [];

        if (parentId && parentId !== "root" && parentId !== "null") {
            if (!mongoose.Types.ObjectId.isValid(parentId)) {
                return res.status(400).json({ success: false, message: "Invalid parent folder ID." });
            }
            const parentDoc = await Folder.findById(parentId);
            if (!parentDoc) {
                return res.status(404).json({ success: false, message: "Parent folder not found." });
            }
            validParentId = parentDoc._id;
            ancestors = [
                ...(parentDoc.ancestors || []),
                { _id: parentDoc._id, name: parentDoc.name }
            ];
        }

        // Check if sibling folder with the same name exists under this parent for this user
        const existing = await Folder.findOne({
            createdBy: userId,
            parentId: validParentId,
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `A folder named "${trimmedName}" already exists in this location.`
            });
        }

        const folder = await Folder.create({
            name: trimmedName,
            parentId: validParentId,
            ancestors: ancestors,
            createdBy: userId
        });

        return res.status(201).json({
            success: true,
            message: `Folder "${trimmedName}" created successfully.`,
            folder: {
                _id: folder._id,
                name: folder.name,
                parentId: folder.parentId,
                ancestors: folder.ancestors,
                count: 0,
                filesCount: 0,
                subfoldersCount: 0
            }
        });
    } catch (error) {
        console.error("Create Folder Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to create folder." });
    }
};

/**
 * Delete a custom folder
 */
export const deleteFolder = async (req, res) => {
    try {
        const target = decodeURIComponent(req.params.nameOrId || req.params.name || "").trim();
        const userId = req.user?._id || req.user?.id;
        if (!target) {
            return res.status(400).json({ success: false, message: "Folder ID or name is required." });
        }

        let folder = null;
        if (mongoose.Types.ObjectId.isValid(target)) {
            folder = await Folder.findById(target);
        }
        if (!folder) {
            folder = await Folder.findOne({
                createdBy: userId,
                name: { $regex: new RegExp(`^${target}$`, "i") }
            });
        }

        if (!folder) {
            return res.status(404).json({ success: false, message: "Folder not found." });
        }

        // Get all descendant subfolder IDs
        const allDescendantIds = await getAllDescendantFolderIds(folder._id);

        // Check if this folder OR any subfolder contains files
        const fileCount = await FileItem.countDocuments({
            folderId: { $in: allDescendantIds }
        });

        if (fileCount > 0) {
            return res.status(400).json({
                success: false,
                containsMedia: true,
                fileCount,
                message: "This folder contains some media, first delete them."
            });
        }

        // Safe to delete folder and all descendant subfolders
        await Folder.deleteMany({ _id: { $in: allDescendantIds } });

        return res.status(200).json({
            success: true,
            message: `Folder "${folder.name}" deleted successfully.`
        });
    } catch (error) {
        console.error("Delete Folder Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to delete folder." });
    }
};

/**
 * Get available folders (scoped per user)
 */
export const getFolders = async (req, res) => {
    try {
        const { parentId, all } = req.query;
        const userId = req.user?._id || req.user?.id;

        let query = {};
        if (all === "true") {
            query = { createdBy: userId };
        } else if (parentId && parentId !== "root" && parentId !== "null") {
            if (mongoose.Types.ObjectId.isValid(parentId)) {
                query = { parentId: parentId, createdBy: userId };
            } else {
                query = { parentId: null, createdBy: userId };
            }
        } else {
            // Root level folders for this user (or legacy folders)
            query = {
                parentId: null,
                $or: [{ createdBy: userId }, { createdBy: null }]
            };
        }

        const folders = await Folder.find(query).sort({ name: 1 }).lean();

        // Calculate direct files count and subfolders count for each folder
        const enrichedFolders = await Promise.all(
            folders.map(async (f) => {
                const [filesCount, subfoldersCount] = await Promise.all([
                    FileItem.countDocuments({
                        folderId: f._id,
                        $or: [
                            { uploadedBy: userId },
                            { "sharedWith.user": userId }
                        ]
                    }),
                    Folder.countDocuments({ parentId: f._id, createdBy: userId })
                ]);
                return {
                    _id: f._id,
                    name: f.name,
                    parentId: f.parentId,
                    ancestors: f.ancestors || [],
                    filesCount,
                    subfoldersCount,
                    count: filesCount + subfoldersCount,
                    createdAt: f.createdAt
                };
            })
        );

        // If parentId provided, fetch current folder details & breadcrumbs
        let currentFolder = null;
        let breadcrumbs = [{ _id: null, name: "Home" }];

        if (parentId && parentId !== "root" && parentId !== "null" && mongoose.Types.ObjectId.isValid(parentId)) {
            const currentDoc = await Folder.findById(parentId).lean();
            if (currentDoc) {
                currentFolder = currentDoc;
                if (currentDoc.ancestors && Array.isArray(currentDoc.ancestors)) {
                    currentDoc.ancestors.forEach((anc) => {
                        breadcrumbs.push({ _id: anc._id, name: anc.name });
                    });
                }
                breadcrumbs.push({ _id: currentDoc._id, name: currentDoc.name });
            }
        }

        return res.status(200).json({
            success: true,
            folders: enrichedFolders,
            currentFolder,
            breadcrumbs
        });
    } catch (error) {
        console.error("File Manager Get Folders Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch folders." });
    }
};

/**
 * Share a file with one or multiple users within HRMS
 */
export const shareFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { userIds } = req.body;
        const currentUserId = req.user?._id || req.user?.id;

        const file = await FileItem.findById(id);
        if (!file) {
            return res.status(404).json({ success: false, message: "File not found." });
        }

        const isOwner = file.uploadedBy.toString() === currentUserId.toString();
        const isGlobalAdmin = req.user?.role === "global_admin";
        if (!isOwner && !isGlobalAdmin) {
            return res.status(403).json({ success: false, message: "Only the file owner can modify sharing." });
        }

        if (!Array.isArray(userIds)) {
            return res.status(400).json({ success: false, message: "userIds must be an array." });
        }

        // Filter out the owner themselves
        const cleanIds = userIds.filter(uid => uid.toString() !== currentUserId.toString());

        file.sharedWith = cleanIds.map(uid => ({
            user: uid,
            sharedAt: new Date(),
            canEdit: true
        }));

        await file.save();
        await file.populate("uploadedBy", "fullName email profilePicture");
        await file.populate("sharedWith.user", "fullName email profilePicture");

        return res.status(200).json({
            success: true,
            message: `File shared with ${file.sharedWith.length} colleague(s).`,
            file
        });
    } catch (error) {
        console.error("Share File Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to share file." });
    }
};

/**
 * Create an in-app Excel Spreadsheet or Word Document
 */
export const createDocument = async (req, res) => {
    try {
        const { name, type, folderId, content } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Document name is required." });
        }

        const userId = req.user?._id || req.user?.id;
        const trimmedName = name.trim();
        const docType = type === "excel" ? "excel" : "word";
        const extension = docType === "excel" ? "xlsx" : "docx";
        const category = "document";

        const fullDisplayName = trimmedName.toLowerCase().endsWith(`.${extension}`) ? trimmedName : `${trimmedName}.${extension}`;

        let fileBuffer;
        let mimeType;

        if (docType === "excel") {
            mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            const wb = XLSX.utils.book_new();
            const initialData = Array.isArray(content) && content.length > 0
                ? content
                : [
                    ["Title", "Category", "Amount", "Notes"],
                    ["Item 1", "General", 100, "Example entry"],
                    ["Item 2", "Marketing", 250, "Sample note"]
                ];
            const ws = XLSX.utils.aoa_to_sheet(initialData);
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            fileBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        } else {
            mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            const htmlContent = typeof content === "string" && content.trim()
                ? content
                : `<h2>${trimmedName}</h2><p>Start drafting your document here...</p>`;
            fileBuffer = Buffer.from(htmlContent, "utf-8");
        }

        // Upload buffer to Cloudinary
        const uploadRes = await uploadToCloudinary(fileBuffer, "hrms_file_manager/documents", "raw");

        let validFolderId = null;
        let folderName = "";
        if (folderId && folderId !== "root" && mongoose.Types.ObjectId.isValid(folderId)) {
            const fDoc = await Folder.findById(folderId);
            if (fDoc) {
                validFolderId = fDoc._id;
                folderName = fDoc.name;
            }
        }

        const defaultData = docType === "excel"
            ? (Array.isArray(content) && content.length > 0 ? content : [
                ["Title", "Category", "Amount", "Notes"],
                ["Item 1", "General", 100, "Example entry"],
                ["Item 2", "Marketing", 250, "Sample note"]
            ])
            : (typeof content === "string" && content.trim() ? content : `<h2>${trimmedName}</h2><p>Start drafting your document here...</p>`);

        const fileDoc = await FileItem.create({
            name: fullDisplayName,
            originalName: fullDisplayName,
            url: uploadRes.secure_url || uploadRes.url,
            publicId: uploadRes.public_id || "",
            resourceType: "raw",
            mimeType: mimeType,
            extension: extension,
            sizeBytes: fileBuffer.length,
            formattedSize: formatBytes(fileBuffer.length),
            category: category,
            folder: folderName,
            folderId: validFolderId,
            uploadedBy: userId,
            documentContent: defaultData
        });

        await fileDoc.populate("uploadedBy", "fullName email profilePicture");
        await fileDoc.populate("sharedWith.user", "fullName email profilePicture");

        return res.status(201).json({
            success: true,
            message: `${docType === "excel" ? "Excel Spreadsheet" : "Word Document"} created successfully!`,
            file: fileDoc
        });
    } catch (error) {
        console.error("Create Document Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to create document." });
    }
};

/**
 * Update document content for an existing in-app doc/sheet
 */
export const updateDocumentContent = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user?._id || req.user?.id;

        const file = await FileItem.findById(id);
        if (!file) {
            return res.status(404).json({ success: false, message: "File not found." });
        }

        const isOwner = file.uploadedBy.toString() === userId.toString();
        const isShared = (file.sharedWith || []).some(s => s.user.toString() === userId.toString());
        const isGlobalAdmin = req.user?.role === "global_admin";

        if (!isOwner && !isShared && !isGlobalAdmin) {
            return res.status(403).json({ success: false, message: "You do not have permission to edit this document." });
        }

        file.documentContent = content;

        // If Excel, re-render xlsx buffer and re-upload to Cloudinary
        if (file.extension === "xlsx") {
            const wb = XLSX.utils.book_new();
            const sheetData = Array.isArray(content) ? content : [[""]];
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            const fileBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

            const uploadRes = await uploadToCloudinary(fileBuffer, "hrms_file_manager/documents", "raw");
            file.url = uploadRes.secure_url || uploadRes.url;
            file.sizeBytes = fileBuffer.length;
            file.formattedSize = formatBytes(fileBuffer.length);
        } else if (file.extension === "docx" || file.mimeType?.includes("word")) {
            const fileBuffer = Buffer.from(typeof content === "string" ? content : "", "utf-8");
            const uploadRes = await uploadToCloudinary(fileBuffer, "hrms_file_manager/documents", "raw");
            file.url = uploadRes.secure_url || uploadRes.url;
            file.sizeBytes = fileBuffer.length;
            file.formattedSize = formatBytes(fileBuffer.length);
        }

        await file.save();
        await file.populate("uploadedBy", "fullName email profilePicture");
        await file.populate("sharedWith.user", "fullName email profilePicture");

        return res.status(200).json({
            success: true,
            message: "Document saved successfully.",
            file
        });
    } catch (error) {
        console.error("Update Document Content Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to save document." });
    }
};

/**
 * Get active company employees for sharing
 */
export const getShareableEmployees = async (req, res) => {
    try {
        const users = await User.find({ status: { $ne: "inactive" } })
            .select("fullName firstName lastName email role department profilePicture employeeId")
            .sort({ fullName: 1, firstName: 1 })
            .lean();

        const formatted = users.map(u => ({
            _id: u._id,
            name: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
            email: u.email,
            role: u.role,
            department: u.department || "General",
            profilePicture: u.profilePicture || "",
            employeeId: u.employeeId || ""
        }));

        return res.status(200).json({
            success: true,
            employees: formatted
        });
    } catch (error) {
        console.error("Get Shareable Employees Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch employees." });
    }
};

/**
 * Rename / update file metadata
 */
export const updateFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, folder } = req.body;

        const updateData = {};
        if (name && name.trim()) updateData.name = name.trim();
        if (folder && folder.trim()) updateData.folder = folder.trim();

        const updated = await FileItem.findByIdAndUpdate(id, { $set: updateData }, { new: true })
            .populate("uploadedBy", "fullName email profilePicture")
            .populate("sharedWith.user", "fullName email profilePicture");

        if (!updated) {
            return res.status(404).json({ success: false, message: "File not found." });
        }

        return res.status(200).json({
            success: true,
            message: "File updated successfully.",
            file: updated
        });
    } catch (error) {
        console.error("File Manager Update File Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to update file." });
    }
};

/**
 * Delete file
 */
export const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id;
        const file = await FileItem.findById(id);

        if (!file) {
            return res.status(404).json({ success: false, message: "File not found." });
        }

        const isOwner = file.uploadedBy.toString() === userId.toString();
        const isGlobalAdmin = req.user?.role === "global_admin";
        if (!isOwner && !isGlobalAdmin) {
            return res.status(403).json({ success: false, message: "Only the file owner can delete this file." });
        }

        if (file.publicId) {
            try {
                await deleteFromCloudinary(file.publicId, file.resourceType || "raw");
            } catch (cloudErr) {
                console.warn("Could not delete from Cloudinary:", cloudErr.message);
            }
        }

        await FileItem.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "File deleted successfully."
        });
    } catch (error) {
        console.error("File Manager Delete File Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to delete file." });
    }
};

/**
 * Storage statistics & metrics (scoped to user)
 */
export const getStorageStats = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        const stats = await FileItem.aggregate([
            {
                $match: {
                    $or: [
                        { uploadedBy: new mongoose.Types.ObjectId(userId) },
                        { "sharedWith.user": new mongoose.Types.ObjectId(userId) }
                    ]
                }
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    totalSize: { $sum: "$sizeBytes" }
                }
            }
        ]);

        let totalBytes = 0;
        let totalCount = 0;
        const breakdown = {
            image: { count: 0, bytes: 0, formatted: "0 B" },
            document: { count: 0, bytes: 0, formatted: "0 B" },
            video: { count: 0, bytes: 0, formatted: "0 B" },
            audio: { count: 0, bytes: 0, formatted: "0 B" },
            archive: { count: 0, bytes: 0, formatted: "0 B" },
            other: { count: 0, bytes: 0, formatted: "0 B" }
        };

        stats.forEach(item => {
            const cat = item._id || "other";
            totalBytes += item.totalSize;
            totalCount += item.count;
            if (breakdown[cat]) {
                breakdown[cat].count = item.count;
                breakdown[cat].bytes = item.totalSize;
                breakdown[cat].formatted = formatBytes(item.totalSize);
            }
        });

        return res.status(200).json({
            success: true,
            stats: {
                totalFiles: totalCount,
                totalBytes: totalBytes,
                totalFormatted: formatBytes(totalBytes),
                breakdown: breakdown
            }
        });
    } catch (error) {
        console.error("File Manager Get Stats Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch storage stats." });
    }
};
