import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import dbConnect from './config/dbConnect.js';

dotenv.config();

async function checkUsers() {
    try {
        await dbConnect();
        const users = await User.find({}, '_id name email');
        console.log('--- USERS ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('--- END USERS ---');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUsers();
