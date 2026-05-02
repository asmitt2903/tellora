import express from "express"
import dbConnect from './config/dbConnect.js'
import path from "path"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import User from "./models/userModel.js"
import Question from "./models/questionModel.js"
import Answer from "./models/answerModel.js"
import Notification from "./models/notificationModel.js"
import AIChat from "./models/aiChatModel.js"
import Chat from "./models/chatModel.js"
import Message from "./models/messageModel.js"
import http from "http"
import { Server } from "socket.io"
import { HfInference } from "@huggingface/inference"
import { fileURLToPath } from "url"
import multer from "multer"
import fs from "fs"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"

import dotenv from "dotenv"
dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const hf = new HfInference(process.env.HF_API_KEY);
const HF_MODEL = "Qwen/Qwen2.5-7B-Instruct";
const app = express()
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const frontendPath = path.join(__dirname,"..","Frontend")

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())

dbConnect()


app.use(express.static(frontendPath))

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath)
}
app.use("/uploads", express.static(uploadsPath))

// --- Multer & Cloudinary Config ---
let storage;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: "mindforum_media",
            resource_type: "auto", // Important: Allows both images and videos
        },
    });
    console.log("Using Cloudinary for media storage.");
} else {
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    console.log("Using local disk for media storage (Cloudinary credentials not set).");
}
const upload = multer({ storage })


async function auth(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/login");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie("token");
        res.redirect("/login");
    }
}



app.get("/",(req,res)=>{
    res.redirect("/login")
})

app.get("/login",(req,res)=>{
    res.sendFile(path.join(frontendPath,"login.html"))
})

app.get("/signup",(req,res)=>{
    res.sendFile(path.join(frontendPath,"signup.html"))
})

app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("User already exists");
        }

        // Create new user
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.send("Signup Successful");
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).send("Registration failed: " + error.message);
    }
});


app.get("/home",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"home.html"))
})

app.get("/philosophy",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"philosophy.html"))
})

app.get("/psychology",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"psychology.html"))
})

app.get("/technology",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"technology.html"))
})

app.get("/science",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"science.html"))
})

app.get("/business",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"business.html"))
})

app.get("/ai-assistant",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"ai-assistant.html"))
})

app.get("/messages",auth,(req,res)=>{
    res.sendFile(path.join(frontendPath,"messages.html"))
})



app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.send("Invalid Email or Password");
        }

        // Validate password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.send("Invalid Email or Password");
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Send token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 3600000
        });

        res.send("Login Successful");
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Login failed");
    }
});


app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// User API Routes
app.get("/api/user/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user" });
    }
});

app.get("/api/ai/history", auth, async (req, res) => {
    try {
        const chats = await AIChat.find({ user: req.user.id }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chat history" });
    }
});

app.post("/api/ai/ask", auth, async (req, res) => {
    try {
        const { prompt, chatId } = req.body;
        
        // Fetch context from the forum
        const recentQuestions = await Question.find()
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .limit(10);
            
        const context = recentQuestions.map(q => 
            `Space: ${q.spaces}, Question: ${q.content}, Author: ${q.user.name}`
        ).join("\n");

        const systemPrompt = `You are MindForum AI, an elite Editorial Intelligence designed for the MindForum knowledge-sharing platform.
        Your purpose is to provide deep, analytical, and highly intellectual responses.
        Structure your responses to be engaging, professional, and insightful. 
        Context from recent forum discussions:
        ${context}`;

        console.log("Generating AI response with Hugging Face (Qwen)...");
        const response = await hf.chatCompletion({
            model: HF_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.7,
            top_p: 0.95
        });
        
        const responseText = response.choices[0].message.content;
        console.log("AI response generated.");

        // Update or create chat history
        let chat;
        if (chatId) {
            chat = await AIChat.findById(chatId);
            chat.messages.push({ role: "user", content: prompt });
            chat.messages.push({ role: "assistant", content: responseText });
            await chat.save();
        } else {
            chat = new AIChat({
                user: req.user.id,
                title: prompt.substring(0, 30) + "...",
                messages: [
                    { role: "user", content: prompt },
                    { role: "assistant", content: responseText }
                ]
            });
            await chat.save();
        }

        res.json({ response: responseText, chatId: chat._id });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ message: "AI Assistant failed to respond" });
    }
});

app.post("/api/user/upload-profile-pic", auth, upload.single("profilePic"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const profilePicUrl = req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user.id, { profilePic: profilePicUrl });

        res.json({ message: "Upload successful", profilePic: profilePicUrl });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
});

app.patch("/api/user/profile", auth, async (req, res) => {
    try {
        const { bio, interests, title } = req.body;
        
        // Convert comma-separated string to array if necessary
        const interestsArray = Array.isArray(interests) 
            ? interests 
            : (interests ? interests.split(",").map(i => i.trim()) : []);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { bio, interests: interestsArray, title },
            { new: true }
        ).select("-password");

        res.json(updatedUser);
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Update failed" });
    }
});

// GET Public Profile
app.get("/api/user/public/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -email")
            .populate("followers", "name profilePic")
            .populate("following", "name profilePic");
            
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile" });
    }
});

// Follow/Unfollow Toggle
app.post("/api/user/follow/:id", auth, async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user.id);

        if (!userToFollow) return res.status(404).json({ message: "User not found" });
        if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot follow yourself" });

        const isFollowing = currentUser.following.includes(req.params.id);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
            userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user.id);
        } else {
            // Follow
            currentUser.following.push(req.params.id);
            userToFollow.followers.push(req.user.id);
        }

        await currentUser.save();
        await userToFollow.save();

        // Create Notification (only if following)
        if (!isFollowing) {
            const notification = new Notification({
                recipient: req.params.id,
                sender: req.user.id,
                type: "follow",
                message: `${currentUser.name} followed you.`
            });
            await notification.save();
        }

        res.json({ isFollowing: !isFollowing, followersCount: userToFollow.followers.length });
    } catch (error) {
        res.status(500).json({ message: "Follow action failed" });
    }
});

// User Stats (Questions & Answers count + Reach)
app.get("/api/user/stats/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const qCount = await Question.countDocuments({ user: req.params.id });
        const aCount = await Answer.countDocuments({ user: req.params.id });
        
        // Sum of all views for user's questions
        const questions = await Question.find({ user: req.params.id });
        const totalReach = questions.reduce((acc, q) => acc + (q.views || 0), 0);

        res.json({ 
            questions: qCount, 
            answers: aCount, 
            totalReach,
            followersCount: user.followers.length,
            followingCount: user.following.length
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching stats" });
    }
});

// --- Notification API ---

// Get User Notifications
app.get("/api/notifications", auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate("sender", "name profilePic")
            .populate("questionId", "content")
            .sort({ createdAt: -1 })
            .limit(30);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
});

// Mark Notification as Read
app.patch("/api/notifications/:id/read", auth, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notification" });
    }
});

// Mark All as Read
app.patch("/api/notifications/read-all", auth, async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notifications" });
    }
});

// Mark as Browser Notified
app.patch("/api/notifications/browser-notified", auth, async (req, res) => {
    try {
        const { ids } = req.body;
        await Notification.updateMany({ _id: { $in: ids } }, { isBrowserNotified: true });
        res.json({ message: "Updated browser notification state" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notifications" });
    }
});

// Get User Questions
app.get("/api/user/:id/questions", async (req, res) => {
    try {
        const questions = await Question.find({ user: req.params.id })
            .populate("user", "name profilePic")
            .sort({ createdAt: -1 });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user questions" });
    }
});

// Get User Answers
app.get("/api/user/:id/answers", async (req, res) => {
    try {
        const answers = await Answer.find({ user: req.params.id })
            .populate("user", "name profilePic")
            .populate("question", "content")
            .sort({ createdAt: -1 });
        res.json(answers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user answers" });
    }
});

// --- Question API ---

app.post("/api/questions", auth, upload.single("media"), async (req, res) => {
    try {
        const { content, spaces } = req.body;
        let mediaUrl = "";
        let mediaType = "text";

        if (req.file) {
            mediaUrl = req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                mediaType = "image";
            } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                mediaType = "video";
            }
        }

        const newQuestion = new Question({
            user: req.user.id,
            content,
            mediaUrl,
            mediaType,
            spaces: spaces || "General"
        });

        await newQuestion.save();
        res.status(201).json(newQuestion);
    } catch (error) {
        console.error("Question error:", error);
        res.status(500).json({ message: "Failed to post question" });
    }
});

app.get("/api/questions", auth, async (req, res) => {
    try {
        const spaceFilter = req.query.space ? { spaces: req.query.space } : {};
        const questions = await Question.find(spaceFilter)
            .populate("user", "name profilePic")
            .sort({ createdAt: -1 });

        // Increment views for each question (informal tracking)
        // We'll increment only if the current user is not the author
        const questionIds = questions.map(q => q._id);
        await Question.updateMany(
            { _id: { $in: questionIds }, user: { $ne: req.user.id } },
            { $inc: { views: 1 } }
        );

        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching questions" });
    }
});

app.delete("/api/questions/:id", auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" });

        // Check ownership
        if (question.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to delete this question" });
        }

        // Delete associated answers
        await Answer.deleteMany({ question: req.params.id });
        
        // Delete notifications related to this question
        await Notification.deleteMany({ questionId: req.params.id });

        await Question.findByIdAndDelete(req.params.id);

        res.json({ message: "Question deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Failed to delete question" });
    }
});

app.post("/api/questions/:id/like", auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" });
        const userId = req.user.id;

        if (question.upvotes.includes(userId)) {
            question.upvotes = question.upvotes.filter(id => id.toString() !== userId);
        } else {
            question.upvotes.push(userId);
            question.downvotes = question.downvotes.filter(id => id.toString() !== userId);
        }
        await question.save();

        // Create Notification (only if liked)
        if (question.upvotes.includes(userId) && question.user.toString() !== userId) {
            const sender = await User.findById(userId);
            const notification = new Notification({
                recipient: question.user,
                sender: userId,
                type: "upvote",
                questionId: question._id,
                message: `${sender.name} upvoted your question: "${question.content.substring(0, 30)}..."`
            });
            await notification.save();
        }

        res.json(question);
    } catch (error) {
        res.status(500).json({ message: "Like action failed" });
    }
});

app.post("/api/questions/:id/dislike", auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ message: "Question not found" });
        const userId = req.user.id;

        if (question.downvotes.includes(userId)) {
            question.downvotes = question.downvotes.filter(id => id.toString() !== userId);
        } else {
            question.downvotes.push(userId);
            question.upvotes = question.upvotes.filter(id => id.toString() !== userId);
        }
        await question.save();
        res.json(question);
    } catch (error) {
        res.status(500).json({ message: "Dislike action failed" });
    }
});

// --- Answer API ---

app.post("/api/questions/:id/answers", auth, upload.single("media"), async (req, res) => {
    try {
        const { content } = req.body;
        const questionId = req.params.id;
        let mediaUrl = "";
        let mediaType = "text";

        if (req.file) {
            mediaUrl = req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`;
            const ext = path.extname(req.file.originalname).toLowerCase();
            if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
                mediaType = "image";
            } else if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) {
                mediaType = "video";
            }
        }

        const newAnswer = new Answer({
            user: req.user.id,
            question: questionId,
            content,
            mediaUrl,
            mediaType
        });

        await newAnswer.save();

        // Create Notification for Question Owner
        const question = await Question.findById(questionId);
        if (question && question.user.toString() !== req.user.id) {
            const sender = await User.findById(req.user.id);
            const notification = new Notification({
                recipient: question.user,
                sender: req.user.id,
                type: "answer",
                questionId: question._id,
                answerId: newAnswer._id,
                message: `${sender.name} answered your question: "${question.content.substring(0, 40)}..."`
            });
            await notification.save();
        }

        res.status(201).json(newAnswer);
    } catch (error) {
        console.error("Answer error:", error);
        res.status(500).json({ message: "Failed to post answer" });
    }
});

// Questions & Answers API
app.get("/api/questions/:id/answers", auth, async (req, res) => {
    try {
        const answers = await Answer.find({ question: req.params.id })
            .populate("user", "name profilePic")
            .sort({ createdAt: 1 });
        res.json(answers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching answers" });
    }
});

// --- Direct Messaging API ---
app.post("/api/chat/initiate", auth, async (req, res) => {
    try {
        const { recipientId } = req.body;
        const currentUserId = req.user.id;

        let chat = await Chat.findOne({
            participants: { $all: [currentUserId, recipientId] }
        });

        if (!chat) {
            chat = new Chat({ participants: [currentUserId, recipientId] });
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
        console.error("Initiate chat error:", error);
        res.status(500).json({ message: "Failed to initiate chat" });
    }
});

app.get("/api/chat", auth, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: { $in: [req.user.id] } })
            .populate("participants", "name profilePic title")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: "Failed to load chats" });
    }
});

app.get("/api/chat/:chatId/messages", auth, async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .populate("sender", "name profilePic")
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: "Failed to load messages" });
    }
});

// Quick Reply POST endpoint
app.post("/api/chat/:chatId/messages/reply", auth, async (req, res) => {
    try {
        const { text } = req.body;
        const chatId = req.params.chatId;
        const senderId = req.user.id;

        const newMessage = new Message({
            chatId,
            sender: senderId,
            text
        });
        await newMessage.save();

        const chat = await Chat.findByIdAndUpdate(chatId, { 
            lastMessage: newMessage._id 
        }, { 
            timestamps: { updatedAt: true } 
        });

        const recipientId = chat.participants.find(p => p.toString() !== senderId.toString());
        if (recipientId) {
            const notification = new Notification({
                recipient: recipientId,
                sender: senderId,
                type: "message",
                chatId: chatId,
                message: `New message: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
            });
            await notification.save();
        }

        await newMessage.populate("sender", "name profilePic");
        io.to(chatId).emit("receiveMessage", newMessage);
        
        res.json(newMessage);
    } catch (error) {
        console.error("Reply error:", error);
        res.status(500).json({ message: "Failed to send reply" });
    }
});

// --- Socket.IO Chat Setup ---
io.on("connection", (socket) => {
    socket.on("joinChat", (chatId) => {
        socket.join(chatId);
    });

    socket.on("sendMessage", async (data) => {
        try {
            const { chatId, senderId, text } = data;
            
            const newMessage = new Message({
                chatId,
                sender: senderId,
                text
            });
            await newMessage.save();

            const chat = await Chat.findByIdAndUpdate(chatId, { 
                lastMessage: newMessage._id 
            }, { 
                timestamps: { updatedAt: true } 
            });

            // Notification
            const recipientId = chat.participants.find(p => p.toString() !== senderId.toString());
            if (recipientId) {
                const notification = new Notification({
                    recipient: recipientId,
                    sender: senderId,
                    type: "message",
                    chatId: chatId,
                    message: `New message: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
                });
                await notification.save();
            }

            await newMessage.populate("sender", "name profilePic");
            io.to(chatId).emit("receiveMessage", newMessage);
        } catch (error) {
            console.error("Socket error:", error);
        }
    });
});


// ✅ Correct for Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
