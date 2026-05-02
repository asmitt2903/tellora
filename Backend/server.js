import express from "express"
import dbConnect from './config/dbConnect.js'
import path from "path"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import User from "./models/userModel.js"
import Story from "./models/storyModel.js"
import StoryChapter from "./models/storyChapterModel.js"
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
import dotenv from "dotenv"
dotenv.config()


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

// --- Multer Config ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
console.log("Using local disk for media storage.");
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

app.post("/api/user/upload-profile-pic", auth, upload.single("profilePic"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const profilePicUrl = `/uploads/${req.file.filename}`;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profilePic: profilePicUrl },
            { new: true }
        );

        res.json({ 
            message: "Profile picture updated successfully", 
            profilePic: profilePicUrl 
        });
    } catch (error) {
        console.error("Profile upload error:", error);
        res.status(500).json({ message: "Failed to upload profile picture" });
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
        const recentStories = await Story.find()
            .populate("author", "name")
            .sort({ createdAt: -1 })
            .limit(10);
            
        const context = recentStories.map(s => 
            `Genre: ${s.genre}, Story Title: ${s.title}, Author: ${s.author.name}`
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

// User Stats (Stories & Chapters count + Reach)
app.get("/api/user/stats/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const sCount = await Story.countDocuments({ author: req.params.id });
        const cCount = await StoryChapter.countDocuments({ story: { $in: await Story.find({author: req.params.id}).distinct('_id') } });
        
        // Sum of all views for user's stories
        const stories = await Story.find({ author: req.params.id });
        const totalReach = stories.reduce((acc, s) => acc + (s.views || 0), 0);

        res.json({ 
            questions: sCount, // keeping keys same for frontend compatibility for now
            answers: cCount, 
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

// Get User Stories
app.get("/api/user/:id/questions", async (req, res) => {
    try {
        const stories = await Story.find({ author: req.params.id })
            .populate("author", "name profilePic")
            .sort({ createdAt: -1 });
        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user stories" });
    }
});

// --- Story & Chapter API ---

app.post("/api/stories", auth, upload.single("coverImage"), async (req, res) => {
    try {
        const { title, description, genre, tags } = req.body;
        let coverImageUrl = "";

        if (req.file) {
            coverImageUrl = req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`;
        }

        const newStory = new Story({
            author: req.user.id,
            title,
            description,
            genre: genre || "Other",
            tags: tags ? tags.split(",").map(t => t.trim()) : [],
            coverImage: coverImageUrl,
            status: "published"
        });

        await newStory.save();
        res.status(201).json(newStory);
    } catch (error) {
        console.error("Story creation error:", error);
        res.status(500).json({ message: "Failed to create story" });
    }
});

app.get("/api/stories", auth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.genre) filter.genre = req.query.genre;
        if (req.query.author) filter.author = req.query.author;
        const stories = await Story.find(filter)
            .populate("author", "name profilePic")
            .sort({ createdAt: -1 });


        res.json(stories);
    } catch (error) {
        res.status(500).json({ message: "Error fetching stories" });
    }
});

app.get("/api/stories/:id", auth, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id).populate("author", "name profilePic");
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Increment views if viewer is not author
        if (story.author._id.toString() !== req.user.id) {
            story.views = (story.views || 0) + 1;
            await story.save();
        }

        res.json(story);
    } catch (error) {
        res.status(500).json({ message: "Error fetching story" });
    }
});

app.delete("/api/stories/:id", auth, async (req, res) => {
    try {
        const story = await Story.findById(req.params.id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Check ownership
        if (story.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this story" });
        }

        // Delete associated chapters
        await StoryChapter.deleteMany({ story: req.params.id });

        await Story.findByIdAndDelete(req.params.id);

        res.json({ message: "Story deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Failed to delete story" });
    }
});

app.post("/api/stories/:id/chapters", auth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const storyId = req.params.id;

        const story = await Story.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        if (story.author.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to add chapters to this story" });
        }

        const chapterCount = await StoryChapter.countDocuments({ story: storyId });

        const newChapter = new StoryChapter({
            story: storyId,
            chapterNumber: chapterCount + 1,
            title,
            content,
            isPublished: true
        });

        await newChapter.save();
        
        story.chapters.push(newChapter._id);
        await story.save();

        res.status(201).json(newChapter);
    } catch (error) {
        console.error("Chapter creation error:", error);
        res.status(500).json({ message: "Failed to create chapter" });
    }
});

app.get("/api/stories/:id/chapters", auth, async (req, res) => {
    try {
        const chapters = await StoryChapter.find({ story: req.params.id }).sort({ chapterNumber: 1 });
        res.json(chapters);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chapters" });
    }
});

app.post("/api/stories/generate", auth, async (req, res) => {
    try {
        const { prompt, genre } = req.body;

        const systemPrompt = `You are a professional story writer. Write the first chapter of a ${genre} story. 
        Format: Title ||| Chapter Content. 
        Only return the title, the separator '|||', and the story text.`;

        console.log(`Generating story with Hugging Face (${HF_MODEL})...`);
        const response = await hf.chatCompletion({
            model: HF_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: 1500,
            temperature: 0.8,
            top_p: 0.95
        });
        
        const responseText = response.choices[0].message.content;
        console.log("Story generated.");

        const parts = responseText.split('|||');
        const title = parts[0] ? parts[0].trim() : "Generated Story";
        const content = parts[1] ? parts[1].trim() : responseText;

        const newStory = new Story({
            author: req.user.id,
            title: title.replace(/"/g, ''), // clean title
            description: `An AI generated ${genre} story.`,
            genre: genre || "Other",
            status: "published"
        });
        await newStory.save();

        const newChapter = new StoryChapter({
            story: newStory._id,
            chapterNumber: 1,
            title: "Chapter 1",
            content: content,
            isPublished: true
        });
        await newChapter.save();

        newStory.chapters.push(newChapter._id);
        await newStory.save();

        res.json({ story: newStory, chapter: newChapter });
    } catch (error) {
        console.error("Story Generation Error:", error);
        if (error.httpResponse) {
            try {
                const errorData = await error.httpResponse.json();
                console.error("HF Error Details:", JSON.stringify(errorData, null, 2));
            } catch (e) {}
        }
        res.status(500).json({ message: "Failed to generate story" });
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
