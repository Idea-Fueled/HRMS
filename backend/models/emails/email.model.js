import mongoose from "mongoose";

const userStateSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        folder: {
            type: String,
            enum: ["inbox", "sent", "draft", "trash", "archive"],
            default: "inbox",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isStarred: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { _id: true }
);

const attachmentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, default: 0 },
        type: { type: String, default: "application/octet-stream" },
        publicId: { type: String },
    },
    { _id: true }
);

const emailSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // can be null for system/external
        },
        senderEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        senderName: {
            type: String,
            default: "Team Member",
        },
        senderAvatar: {
            type: String,
            default: "",
        },
        senderRole: {
            type: String,
            default: "employee",
        },
        to: [
            {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
            },
        ],
        cc: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
        bcc: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
        subject: {
            type: String,
            default: "(No Subject)",
            trim: true,
        },
        body: {
            type: String,
            default: "",
        },
        snippet: {
            type: String,
            default: "",
        },
        attachments: [attachmentSchema],
        priority: {
            type: String,
            enum: ["low", "normal", "high", "urgent"],
            default: "normal",
        },
        labels: [
            {
                type: String,
                trim: true,
            },
        ],
        threadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Email",
            index: true,
        },
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Email",
        },
        isDraft: {
            type: Boolean,
            default: false,
        },
        userStates: [userStateSchema],
    },
    {
        timestamps: true,
    }
);

// Indexes for high performance querying
emailSchema.index({ "userStates.user": 1, "userStates.folder": 1, createdAt: -1 });
emailSchema.index({ "userStates.email": 1, "userStates.folder": 1, createdAt: -1 });
emailSchema.index({ subject: "text", body: "text", senderName: "text", senderEmail: "text" });

const Email = mongoose.model("Email", emailSchema);

export default Email;
