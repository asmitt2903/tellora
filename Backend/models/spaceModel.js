import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    icon: {
        type: String,
        default: "fas fa-users"
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

const Space = mongoose.model("Space", spaceSchema);

export default Space;
