import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        employeeId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        userName: {
            type: String,
            trim: true
        },
        userEmail: {
            type: String,
            trim: true
        },
        userRole: {
            type: String,
            trim: true
        },
        userDepartment: {
            type: String,
            trim: true
        },
        actionType: {
            type: String,
            enum: [
                "PAGE_VIEW",
                "BUTTON_CLICK",
                "PUNCH_CLOCK",
                "FORM_SUBMIT",
                "MODAL_ACTION",
                "DOWNLOAD",
                "CUSTOM_ACTION"
            ],
            default: "PAGE_VIEW",
            index: true
        },
        page: {
            type: String,
            trim: true,
            default: "/"
        },
        pageTitle: {
            type: String,
            trim: true,
            default: ""
        },
        action: {
            type: String,
            required: true,
            trim: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        ipAddress: {
            type: String,
            trim: true,
            default: ""
        },
        userAgent: {
            type: String,
            trim: true,
            default: ""
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Compound indices for fast timeline queries
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ employeeId: 1, timestamp: -1 });
activityLogSchema.index({ actionType: 1, timestamp: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
