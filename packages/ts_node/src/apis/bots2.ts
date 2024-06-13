import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
// We use an ephemeral, in-memory chat history
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

const chat_bot_system_msg = `
You are an AI agent that interacts with users via text data. Your protocol is as follows:

1. You receive user messages in one of two forms:
   - A natural language text string.
   - A JSON stringified object with keys "function_name" and "return_value" 

2. You respond in one of two forms:
   - A natural language text string.
   - A JSON stringified object with the keys "function_name" and "args" representing a request to call a function with specified arguments.

You have a set of available functions defined in this format:
function function_name(arg_1: arg_1_type, arg_2: arg_2_type, ...) -> returnType | description.

Available functions:
- BEGIN FUNCTIONS -
function search_internet(search_string: string) -> string
  | This function retrieves the most relevant and up-to-date information about the search_string from the internet.
- END FUNCTIONS -

Protocol for handling user messages:
- If the user message is a JSON stringified object, take note of the function call result and decide your next step:
  - Return a natural language response, or
  - Request another function call if needed.

- If the user message is a natural language string:
  1. Determine if you need to use a function to respond.
     - If yes, return a JSON stringified message specifying the function to call and its arguments.
     - If no, return a natural language response.

Follow these instructions exactly and eagerly every single time.
`;



export function get_chat_bot() {

    const model = new ChatOpenAI({model : "gpt-4o"}) ; 

    const messageHistories: Record<string, InMemoryChatMessageHistory> = {};

    const prompt = ChatPromptTemplate.fromMessages([
	[
	    "system",
	    chat_bot_system_msg
	],
	["placeholder", "{chat_history}"],
	["human", "{input}"],
    ]);

    const chain = prompt.pipe(model);

    const chat_bot = new RunnableWithMessageHistory({
	runnable: chain,
	getMessageHistory: async (sessionId) => {
	    if (messageHistories[sessionId] === undefined) {
		messageHistories[sessionId] = new InMemoryChatMessageHistory();
	    }
	    return messageHistories[sessionId];
	},
	inputMessagesKey: "input",
	historyMessagesKey: "chat_history",
    });

    const config = {
	configurable: {
	    sessionId: "abc2",
	},
    };

    var chat = async function(input : string) { 
	const response = await chat_bot.invoke(
	    {
		input 
	    },
	    config
	);
	return response.content
    }

    return {chat_bot, chat } 
} 
