import mongoose from "mongoose";

const assetRequestSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        assetType: {
            type: String,
            enum: ["Monitor", "Mouse", "Keyboard", "Earphone/Headphone", "Other"],
            required: true
        },
        comment: {
            type: String,
            default: "",
            trim: true
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending"
        }
    },
    { timestamps: true }
);

const AssetRequest = mongoose.model("AssetRequest", assetRequestSchema);
export default AssetRequest;
