import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function testConnection() {
    console.log("Testing Hugging Face Connection...");
    console.log("Model:", "Qwen/Qwen2.5-7B-Instruct");
    
    const hf = new HfInference(process.env.HF_API_KEY);
    
    try {
        const response = await hf.chatCompletion({
            model: "Qwen/Qwen2.5-7B-Instruct",
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Hello, are you working?" }
            ],
            max_tokens: 50,
            temperature: 0.5
        });
        
        console.log("--- SUCCESS ---");
        console.log("Status: 200 OK");
        console.log("Response Received:", response.choices[0].message.content);
        process.exit(0);
    } catch (error) {
        console.error("--- FAILURE ---");
        console.error("Error Message:", error.message);
        process.exit(1);
    }
}

testConnection();
