import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function debugConnection() {
    console.log("Debugging Hugging Face Connection with v1/chat/completions (Mistral v0.2)...");
    const API_URL = "https://api-inference.huggingface.co/v1/chat/completions";
    const API_TOKEN = process.env.HF_API_KEY;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "mistralai/Mistral-7B-Instruct-v0.2",
                messages: [
                    { role: "user", content: "Hello, are you working?" }
                ],
                max_tokens: 50
            })
        });

        console.log("Status:", response.status);
        console.log("Headers:", JSON.stringify([...response.headers.entries()], null, 2));

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("--- RAW RESPONSE (Not JSON) ---");
            console.error(responseText);
            return;
        }
        
        if (response.ok) {
            console.log("--- SUCCESS ---");
            console.log("Status:", response.status);
            console.log("Response:", JSON.stringify(data, null, 2));
        } else {
            console.error("--- FAILURE ---");
            console.error("Status:", response.status);
            console.error("Error Info:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("--- FETCH ERROR ---");
        console.error(error);
    }
}

debugConnection();
