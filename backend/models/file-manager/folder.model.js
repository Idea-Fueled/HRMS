import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder",
            default: null,
            index: true
        },
        ancestors: [
            {
                _id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Folder"
                },
                name: {
                    type: String,
                    trim: true
                }
            }
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Compound index so sibling folders under the same parent cannot have duplicate names
folderSchema.index({ name: 1, parentId: 1 });

const Folder = mongoose.model("Folder", folderSchema);
export default Folder;
