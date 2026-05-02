import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";
dotenv.config();

const hf = new HfInference(process.env.HF_API_KEY);
const HF_MODEL = "HuggingFaceH4/zephyr-7b-beta";

async function test() {
    try {
        console.log("Testing HF with key:", process.env.HF_API_KEY.slice(0, 5) + "...");
        const response = await hf.chatCompletion({
            model: HF_MODEL,
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 10
        });
        console.log("Success:", response.choices[0].message.content);
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Response body:", await e.response.text());
        }
    }
}

test();
