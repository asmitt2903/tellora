import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testConnect = async () => {
    try {
        console.log("Connecting to:", process.env.DATABASEURL.split('@')[1]); // Log host part only for safety
        await mongoose.connect(process.env.DATABASEURL);
        console.log("Connection successful!");
        process.exit(0);
    } catch (err) {
        console.error("Connection failed:", err.message);
        process.exit(1);
    }
};

testConnect();
