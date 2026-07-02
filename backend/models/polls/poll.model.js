import mongoose from "mongoose";

const pollSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: [{
        type: String,
        required: true
    }],
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    votes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        optionIndex: {
            type: Number,
            required: true
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    visibility: {
        audience: {
            type: String,
            enum: ["all", "department", "team", "individual"],
            default: "all"
        },
        departments: [{
            type: String
        }],
        teams: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        individuals: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }]
    }
}, { timestamps: true });

const Poll = mongoose.model("Poll", pollSchema);
export default Poll;
