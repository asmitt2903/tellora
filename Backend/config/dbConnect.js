import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const dbConnect = async () => {
    try {
        const uri = process.env.DATABASEURL;
        if (!uri || uri === "undefined") {
            throw new Error("DATABASEURL is not defined in the environment variables. Please check your .env file.");
        }
        await mongoose.connect(uri)
        console.log("Database Connected Successfully")
    } catch (err) {
        console.error("Database connection failed:", err.message)
    }
}

export default dbConnect
