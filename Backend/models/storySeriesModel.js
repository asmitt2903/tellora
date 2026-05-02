import mongoose from "mongoose";

const storySeriesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    stories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story"
    }],
    coverImage: {
        type: String,
        default: ""
    },
    genre: {
        type: String,
        enum: ["Adventure", "Mystery", "Romance", "Fantasy", "Science Fiction", "Horror", "Thriller", "Historical Fiction", "Literary Fiction", "Other"],
        default: "Other"
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

const StorySeries = mongoose.model("StorySeries", storySeriesSchema);

export default StorySeries;
