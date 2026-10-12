import mongoose from "mongoose";

const payslipSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    month: {
        type: String,
        required: true // e.g. "JUN" or "JUNE" or "AUG"
    },
    year: {
        type: Number,
        required: true // e.g. 2026
    },
    periodString: {
        type: String,
        required: true // e.g. "JUN 2026" or "AUG 2026"
    },
    companyEntity: {
        type: String,
        enum: ["Idea Fueled", "Idea Fueled LLP"],
        required: true,
        default: "Idea Fueled"
    },
    llpPin: {
        type: String,
        default: "ACZ-5286"
    },

    // Employee snapshot details at time of generation
    employeeDetails: {
        name: { type: String, required: true },
        employeeNumber: { type: String, required: true },
        dateJoined: { type: String, default: "" },
        department: { type: String, default: "" },
        designation: { type: String, default: "" },
        paymentMode: { type: String, default: "Bank Transfer" },
        bankName: { type: String, default: "" },
        bankIfsc: { type: String, default: "" },
        bankAccount: { type: String, default: "" },
        panNumber: { type: String, default: "" }
    },

    // Attendance & days summary
    attendanceDetails: {
        actualPayableDays: { type: Number, default: 30 },
        totalWorkingDays: { type: Number, default: 30 },
        lossOfPayDays: { type: Number, default: 0 },
        daysPayable: { type: Number, default: 30 }
    },

    // Earnings breakdown
    earnings: {
        basic: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        medicalAllowance: { type: Number, default: 0 },
        conveyanceAllowance: { type: Number, default: 0 },
        specialAllowance: { type: Number, default: 0 },
        otherAllowances: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 }
    },

    // Net Salary
    netSalaryPayable: {
        type: Number,
        required: true
    },
    netSalaryInWords: {
        type: String,
        required: true
    },

    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
});

payslipSchema.index({ employeeId: 1, periodString: 1 }, { unique: true });

const Payslip = mongoose.model("Payslip", payslipSchema);
export default Payslip;
