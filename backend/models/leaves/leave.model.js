import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    leaveType: {
        type: String,
        enum: ["casual_leave", "sick_leave", "earned_leave", "unpaid_leave", "partial_leave", "comp_off", "comp_off_leave"],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalDays: {
        type: Number,
        required: true
    },
    partialMinutes: {
        type: Number,
        default: 0
    },
    partialTiming: {
        type: String,
        default: ""
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["pending", "manager_approved", "approved", "rejected", "cancelled"],
        default: "pending",
    },
    managerApproval: {
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        actionBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        actionAt: {
            type: Date,
            default: null
        },
        remarks: {
            type: String,
            default: ""
        }
    },
    adminApproval: {
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        actionBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        actionAt: {
            type: Date,
            default: null
        },
        remarks: {
            type: String,
            default: ""
        }
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    cancellationReason: {
        type: String,
        default: "",
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    remarks: {
        type: String,
        default: "",
    },
}, { timestamps: true })

const Leave = mongoose.model("Leave", leaveSchema);
export default Leave;