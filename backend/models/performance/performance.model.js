import mongoose from "mongoose";

const performanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    quarter: {
        type: String,
        required: true // e.g. "Q2 2026", "Q1 2026"
    },
    rating: {
        type: Number, // e.g. 4.8, 4.2
        required: true
    },
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reviewDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement"],
        required: true
    }
}, { timestamps: true });

const Performance = mongoose.model("Performance", performanceSchema);
export default Performance;
