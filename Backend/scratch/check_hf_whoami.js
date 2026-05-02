import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function checkWhoami() {
    console.log("Checking Hugging Face Token (whoami)...");
    const API_URL = "https://huggingface.co/api/whoami-v2";
    const API_TOKEN = process.env.HF_API_KEY;

    try {
        const response = await fetch(API_URL, {
            headers: {
                "Authorization": `Bearer ${API_TOKEN}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("--- SUCCESS ---");
            console.log("Status:", response.status);
            console.log("User Info:", JSON.stringify(data, null, 2));
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

checkWhoami();
