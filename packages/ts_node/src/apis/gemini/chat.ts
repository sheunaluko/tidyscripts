/**
 * Chat interface to gemini chat agent, which offers gemini-1.5-pro that has >200k token context length 
 *
 * Alternatively can also use the chat_completion function for one off prompting 
 * ``` 
 * jtext = node.io.read_file("/Users/sheunaluko/dev/tidyscripts/apps/docs/jdoc.json")
 * chat = node.apis.gemini.chat.get_chat()
 * await chat(`Here is the entire documentation of the tidyscripts library in json format: -beginJsonText ${jtext} -endJsonText. I would like to ask you a question about the library now.`)
 * 
 * ```
 * 
 * @packageDocumentation
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

export function get_chat() {
    
    const chatSession = model.startChat({
	generationConfig,
	// safetySettings: Adjust safety settings
	// See https://ai.google.dev/gemini-api/docs/safety-settings
	history: [
	],
    });

    let fn = async function(msg : string) { 
	const result = await chatSession.sendMessage(msg);
	//console.log(result.response.text());
	return result.response.text 
    }

    return fn 
}

export async function completion(prompt : string) {
    /* 
       Implement gemini chat completion 
    */
    return await ( get_chat()(prompt) )  ; 
} 
