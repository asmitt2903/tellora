import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import dbConnect from '../config/dbConnect.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function fixLogin() {
    try {
        await dbConnect();
        const email = 'happyalfi915545@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log("User not found!");
            process.exit(1);
        }

        console.log("Current hash in DB:", user.password);

        const testPassword = 'Password123!'; // We'll set it to this for testing
        
        console.log("Setting password to:", testPassword);
        user.password = testPassword;
        await user.save();
        
        console.log("New hash in DB:", user.password);

        const isMatch = await user.comparePassword(testPassword);
        console.log("Comparison result with new password:", isMatch);

        if (isMatch) {
            console.log("SUCCESS: Password updated and verified.");
        } else {
            console.log("FAILURE: Comparison still failing after update!");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

fixLogin();
