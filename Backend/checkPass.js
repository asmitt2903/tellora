import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import dbConnect from './config/dbConnect.js';

dotenv.config();

async function checkUserPassword() {
    try {
        await dbConnect();
        const user = await User.findOne({ email: 'happyalfi915545@gmail.com' });
        console.log('--- USER PASSWORD ---');
        console.log(user ? user.password : 'User not found');
        console.log('--- END USER PASSWORD ---');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUserPassword();
