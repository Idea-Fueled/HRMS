import mongoose from "mongoose";

const clearanceItemSchema = new mongoose.Schema({
    completed: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    clearedBy: { type: String, default: "" },
    date: { type: Date, default: null }
}, { _id: false });

const offboardingSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        exitType: {
            type: String,
            enum: ["resignation", "termination"],
            default: "resignation"
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        initiatedRole: {
            type: String,
            enum: ["employee", "global_admin", "admin", "hr"],
            default: "employee"
        },
        hadDiscussionWithManager: {
            type: Boolean,
            default: false
        },
        hadDiscussionWithEmployee: {
            type: Boolean,
            default: false
        },
        discussionSummary: {
            type: String,
            default: ""
        },
        reasonForLeaving: {
            type: String,
            default: "Better Opportunity"
        },
        resignationDate: {
            type: Date,
            required: true
        },
        lastWorkingDay: {
            type: Date,
            required: true
        },
        preferenceEarlyLwd: {
            type: Boolean,
            default: false
        },
        noticePeriod: {
            type: String,
            default: "30 Days"
        },
        noticePeriodDays: {
            type: Number,
            default: 30
        },
        recommendedLwdType: {
            type: String,
            default: "original"
        },
        eligibleForRehire: {
            type: Boolean,
            default: true
        },
        additionalComments: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["Initiated", "In Progress", "Clearance Pending", "Completed"],
            default: "Initiated"
        },
        clearanceActivities: {
            assetReturn: { type: clearanceItemSchema, default: () => ({}) },
            hrClearance: { type: clearanceItemSchema, default: () => ({}) },
            managerClearance: { type: clearanceItemSchema, default: () => ({}) },
            financeClearance: { type: clearanceItemSchema, default: () => ({}) },
            documentation: { type: clearanceItemSchema, default: () => ({}) }
        },
        notes: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

const Offboarding = mongoose.model("Offboarding", offboardingSchema);
export default Offboarding;
