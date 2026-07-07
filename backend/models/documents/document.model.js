import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        type: {
            type: String,
            enum: ["company", "employee"],
            required: true
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        url: {
            type: String,
            required: true
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        fileSize: {
            type: String,
            default: ""
        },
        fileType: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);
export default Document;
