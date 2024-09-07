/*
 * From google website 
 */

import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey as string);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

export async function get_chat() {
    
    const chatSession = model.startChat({
	generationConfig,
	// safetySettings: Adjust safety settings
	// See https://ai.google.dev/gemini-api/docs/safety-settings
	history: [
	],
    });

    let fn = async function(msg : string) { 
	const result = await chatSession.sendMessage(msg);
	console.log(result.response.text());
    }

    return fn 
}


