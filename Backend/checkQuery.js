import mongoose from 'mongoose';
import User from './models/userModel.js';
import dbConnect from './config/dbConnect.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkQuery() {
    try {
        await dbConnect();
        
        console.log("Testing with exact lowercase:");
        const user1 = await User.findOne({ email: "happyalfi915545@gmail.com" });
        console.log(user1 ? user1.email : "Not found");

        console.log("Testing with uppercase:");
        const user2 = await User.findOne({ email: "HAPPYALFI915545@GMAIL.COM" });
        console.log(user2 ? user2.email : "Not found");

        console.log("Testing with trailing space:");
        const user3 = await User.findOne({ email: "happyalfi915545@gmail.com " });
        console.log(user3 ? user3.email : "Not found");

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkQuery();
