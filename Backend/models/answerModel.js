import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
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
    }]
}, { timestamps: true });

const Answer = mongoose.model("Answer", answerSchema);

export default Answer;
