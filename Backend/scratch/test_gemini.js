import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Note: genAI.listModels() might not be available in all SDK versions or might require different auth
    // But let's try a direct request if possible or just try a different model name
    console.log("Testing gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (error) {
    console.error("Error with gemini-1.5-flash:", error.status, error.statusText);
    
    try {
        console.log("Testing gemini-pro...");
        const model3 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result3 = await model3.generateContent("Hello");
        console.log("Success with gemini-pro:", result3.response.text());
    } catch (err) {
        console.error("Error with gemini-pro:", err.status, err.statusText);
    }
  }
}

listModels();
