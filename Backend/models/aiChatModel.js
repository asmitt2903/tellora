import mongoose from "mongoose";

const aiChatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        default: "New Discussion"
    },
    messages: [{
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    isDraft: {
        type: Boolean,
        default: false
    },
    isSaved: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const AIChat = mongoose.model("AIChat", aiChatSchema);

export default AIChat;
