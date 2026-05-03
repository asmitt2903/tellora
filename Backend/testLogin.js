import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import dbConnect from './config/dbConnect.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function testLogin() {
    try {
        await dbConnect();

        // 1. Create a user
        const testEmail = 'testlogin@example.com';
        const testPassword = 'mySecretPassword123';
        
        await User.deleteOne({ email: testEmail });

        const newUser = new User({
            name: 'Test User',
            email: testEmail,
            password: testPassword
        });

        await newUser.save();
        console.log("User saved.");

        // 2. Fetch the user
        const user = await User.findOne({ email: testEmail });
        console.log("Password hash in DB:", user.password);

        // 3. Test comparePassword
        const isMatch = await user.comparePassword(testPassword);
        console.log("comparePassword match:", isMatch);

        // 4. Test bcrypt.compare directly
        const isMatchDirect = await bcrypt.compare(testPassword, user.password);
        console.log("bcrypt.compare match:", isMatchDirect);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testLogin();
