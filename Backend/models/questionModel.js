import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    mediaUrl: {
        type: String,
        default: ""
    },
    mediaType: {
        type: String,
        enum: ["text", "image", "video"],
        default: "text"
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    downvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    spaces: {
        type: String,
        default: "General"
    },
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Question = mongoose.model("Question", questionSchema);

export default Question;
