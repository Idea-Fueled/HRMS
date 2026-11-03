import mongoose from "mongoose";

const probationPolicySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Probation policy name is required"],
            unique: true,
            trim: true
        },
        months: {
            type: Number,
            default: 0,
            min: [0, "Months cannot be negative"]
        },
        days: {
            type: Number,
            default: 0,
            min: [0, "Days cannot be negative"]
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

const ProbationPolicy = mongoose.model("ProbationPolicy", probationPolicySchema);
export default ProbationPolicy;
