import mongoose from "mongoose";

const reviewCommentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    review: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ReviewComment"
    }],
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ReviewComment",
        default: null
    }
}, { timestamps: true });

const ReviewComment = mongoose.model("ReviewComment", reviewCommentSchema);

export default ReviewComment;
