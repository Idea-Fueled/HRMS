import mongoose from "mongoose";

const compOffRequestSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        workedDates: [
            {
                type: Date,
                required: true,
            },
        ],
        daysCount: {
            type: Number,
            default: 1,
        },
        isHalfDay: {
            type: Boolean,
            default: false,
        },
        attachments: [
            {
                name: String,
                url: String,
            },
        ],
        note: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        adminRemarks: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

const CompOffRequest = mongoose.model("CompOffRequest", compOffRequestSchema);
export default CompOffRequest;
