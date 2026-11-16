import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        originalName: {
            type: String,
            required: true,
            trim: true
        },
        url: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            default: ""
        },
        resourceType: {
            type: String,
            default: "auto"
        },
        mimeType: {
            type: String,
            default: "application/octet-stream"
        },
        extension: {
            type: String,
            default: ""
        },
        sizeBytes: {
            type: Number,
            default: 0
        },
        formattedSize: {
            type: String,
            default: "0 B"
        },
        category: {
            type: String,
            enum: ["image", "document", "video", "audio", "archive", "other"],
            default: "other"
        },
        folder: {
            type: String,
            trim: true,
            default: "General"
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

fileSchema.index({ folder: 1, category: 1, createdAt: -1 });

const FileItem = mongoose.model("FileItem", fileSchema);
export default FileItem;

