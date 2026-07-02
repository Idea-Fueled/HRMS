import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    day: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ["public_holiday", "company_holiday", "optional_holiday"],
        default: "public_holiday"
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, { timestamps: true })

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;