import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findById('69de5ca360132b13a8058011');
    console.log('User ProfilePic:', user ? user.profilePic : 'User not found');
    process.exit();
}

check();
