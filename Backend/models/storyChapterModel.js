import mongoose from "mongoose";

const storyChapterSchema = new mongoose.Schema({
    story: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
        required: true
    },
    chapterNumber: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    readingTime: {
        type: Number,
        default: 0 // in minutes
    },
    wordCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    coverImage: {
        type: String,
        default: ""
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const StoryChapter = mongoose.model("StoryChapter", storyChapterSchema);

export default StoryChapter;
