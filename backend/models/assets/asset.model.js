import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
    {
        assetId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            trim: true,
            default: "Laptop"
        },
        brandModel: {
            type: String,
            trim: true,
            default: ""
        },
        condition: {
            type: String,
            enum: ["New", "Excellent", "Good", "Fair", "Poor", "Damaged"],
            default: "Excellent"
        },
        status: {
            type: String,
            enum: ["Available", "Assigned", "In Maintenance", "Not Assigned", "Retired", "Lost"],
            default: "Available"
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        assignedDate: {
            type: Date,
            default: null
        },
        purchaseDate: {
            type: Date,
            default: null
        },
        warrantyInfo: {
            type: String,
            trim: true,
            default: ""
        },
        serialNumber: {
            type: String,
            trim: true,
            default: ""
        },
        notes: {
            type: String,
            trim: true,
            default: ""
        }
    },
    { timestamps: true }
);

const Asset = mongoose.model("Asset", assetSchema);
export default Asset;
