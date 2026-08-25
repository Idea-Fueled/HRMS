import mongoose from "mongoose";

const attendanceLogSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ["clock_in", "clock_out"],
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    }
}, { _id: false })

const attendaceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["present", "absent", "half_day", "week_off", "holiday"],
        default: "present"
    },
    logs: [attendanceLogSchema],
    firstClockIn: {
        type: Date,
        default: null
    },
    lastClockOut: {
        type: Date,
        default: null
    },
    totalWorkMinutes: {
        type: Number,
        default: 0,
    },
    totalBreakMinutes: {
        type: Number,
        default: 0,
    },
    totalSessions: {
        type: Number,
        default: 0,
    },
    remarks: {
        type: String,
        default: "",
    },
    workMode: {
        type: String,
        default: "Office"
    },
    wfhMessage: {
        type: String,
        default: "",
    },
    dailyWorkPlan: {
        type: String,
        default: "",
    },
}, { timestamps: true })

attendaceSchema.index(
    {
        employeeId: 1,
        date: 1
    },
    { unique: true }
)
const Attendance = mongoose.model("Attendance", attendaceSchema)
export default Attendance;