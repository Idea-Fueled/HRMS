import FileItem from "../../models/file-manager/file.model.js";
import Folder from "../../models/file-manager/folder.model.js";
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

/**
 * Upload one or multiple files
 */
export const uploadFiles = async (req, res) => {
    try {
        const files = req.files || (req.file ? [req.file] : []);
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "No files provided for upload." });
        }

        const folder = (req.body.folder || "").trim();
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
            const folderSlug = folder ? folder.toLowerCase().replace(/[^a-z0-9_-]/g, "_") : "general";
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
                folder: folder,
                uploadedBy: uploadedBy
            });

            await fileDoc.populate("uploadedBy", "fullName email profilePicture");
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
 * Get all files with filtering and search
 */
export const getFiles = async (req, res) => {
    try {
        const { folder, category, search } = req.query;
        const query = {};

        if (folder && folder !== "all" && folder !== "All Files") {
            query.folder = folder;
        }

        if (category && category !== "all") {
            query.category = category;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [{ name: regex }, { originalName: regex }];
        }

        const files = await FileItem.find(query)
            .sort({ createdAt: -1 })
            .populate("uploadedBy", "fullName email profilePicture")
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
 * Create a new custom folder
 */
export const createFolder = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Folder name is required." });
        }

        const trimmedName = name.trim();
        const existing = await Folder.findOne({
            name: { $regex: new RegExp(`^${trimmedName}$`, "i") }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "A folder with this name already exists." });
        }

        const folder = await Folder.create({
            name: trimmedName,
            createdBy: req.user?.id || req.user?._id || null
        });

        return res.status(201).json({
            success: true,
            message: `Folder "${trimmedName}" created successfully.`,
            folder: { name: folder.name, count: 0 }
        });
    } catch (error) {
        console.error("Create Folder Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to create folder." });
    }
};

/**
 * Get all available folders
 */
export const getFolders = async (req, res) => {
    try {
        const explicitFolders = await Folder.find().sort({ createdAt: -1 });
        const distinctFolders = await FileItem.distinct("folder");

        // Only include user-created folders or folders on files, NO hardcoded default folders
        const allFolders = Array.from(
            new Set([
                ...explicitFolders.map(f => f.name),
                ...distinctFolders
            ])
        ).filter(name => Boolean(name && name.trim() && name.toLowerCase() !== "general"));

        // Also calculate counts per folder
        const counts = await FileItem.aggregate([
            { $group: { _id: "$folder", count: { $sum: 1 } } }
        ]);

        const countMap = {};
        counts.forEach(c => {
            if (c._id) countMap[c._id] = c.count;
        });

        const folderList = allFolders.map(name => ({
            name,
            count: countMap[name] || 0
        }));

        return res.status(200).json({
            success: true,
            folders: folderList
        });
    } catch (error) {
        console.error("File Manager Get Folders Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch folders." });
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
            .populate("uploadedBy", "fullName email profilePicture");

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
        const file = await FileItem.findById(id);

        if (!file) {
            return res.status(404).json({ success: false, message: "File not found." });
        }

        // Delete from Cloudinary
        if (file.url) {
            await deleteFromCloudinary(file.url, file.resourceType);
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
 * Storage statistics & metrics
 */
export const getStorageStats = async (req, res) => {
    try {
        const stats = await FileItem.aggregate([
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

