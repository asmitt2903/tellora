import mongoose from 'mongoose';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.DATABASEURL);
        const user = await User.findById('67b66df7576a91d1796d11e5');
        if (user) {
            console.log("User found:");
            console.log(JSON.stringify(user, null, 2));
        } else {
            console.log("User 67b66df7576a91d1796d11e5 not found.");
            const allUsers = await User.find({}, 'name');
            console.log("Existing users:", allUsers);
        }
        process.exit(0);
    } catch (error) {
        console.error("DB Error:", error);
        process.exit(1);
    }
}

checkUser();
