import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    breakMinutes: {
        type: Number,
        default: 45
    },
    workingDays: [{
        type: String,
        required: true
    }],
    description: {
        type: String,
        default: ""
    },
    assignedEmployees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

const Shift = mongoose.model("Shift", shiftSchema);
export default Shift;
