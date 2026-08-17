import mongoose from "mongoose";

const onboardingSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        joiningDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ["Upcoming", "In Progress", "Completed"],
            default: "Upcoming"
        },
        checklist: {
            profileDetailsCompleted: { type: Boolean, default: false },
            documentsUploaded: { type: Boolean, default: false },
            assetAllocated: { type: Boolean, default: false },
            welcomeEmailSent: { type: Boolean, default: false },
            orientationCompleted: { type: Boolean, default: false }
        },
        notes: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

const Onboarding = mongoose.model("Onboarding", onboardingSchema);
export default Onboarding;
