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
        resignationDate: {
            type: Date,
            required: true
        },
        lastWorkingDay: {
            type: Date,
            required: true
        },
        reasonForLeaving: {
            type: String,
            default: "Better Opportunity"
        },
        noticePeriod: {
            type: String,
            default: "30 Days"
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
