
import { ChatOpenAI } from "@langchain/openai";



export function get_chat_model() { 
    return new ChatOpenAI({})
} 
