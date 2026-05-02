import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["answer", "upvote", "follow", "mention", "space_invite", "message"],
        required: true
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
    },
    answerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Answer"
    },
    spaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Space"
    },
    upvoteCount: {
        type: Number,
        default: 1
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isBrowserNotified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
