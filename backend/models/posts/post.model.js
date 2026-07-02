import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxLenght: 1000
    },
    attachments: [{
        type: String,
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: String,
        default: "Post"
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
}, { timestamps: true })

const Post = new mongoose.model("Post", postSchema);
export default Post;