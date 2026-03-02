require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_GENAI_API_KEY is missing");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Say hello");
        console.log("API Success:", result.response.text());
    } catch (error) {
        console.error("API Error:", error.message);
    }
}

test();
