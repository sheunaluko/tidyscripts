
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { createOpenAIFunctionsAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { END, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";


// Define the state interface
interface AgentState {
    messages: HumanMessage[];
}

export async function go(){ 

    // Define the graph state
    const graphState: StateGraphArgs<AgentState>["channels"] = {
	messages: {
	    value: (x: HumanMessage[], y: HumanMessage[]) => x.concat(y),
	    default: () => [],
	},
    };

    // Define the tools for the agent to use
    const tools = [new TavilySearchResults({ maxResults: 1 })];
    const toolNode = new ToolNode<AgentState>(tools as any);

    const model = new ChatOpenAI({ temperature: 0 }).bindTools(tools);

    // Define the function that determines whether to continue or not
    function shouldContinue(state: AgentState): "tools" | typeof END {
	const messages = state.messages;
	const lastMessage = messages[messages.length - 1];

	// If the LLM makes a tool call, then we route to the "tools" node
	if (lastMessage.additional_kwargs.tool_calls) {
	    return "tools";
	}
	// Otherwise, we stop (reply to the user)
	return END;
    }

    // Define the function that calls the model
    async function callModel(state: AgentState) {
	const messages = state.messages;
	const response = await model.invoke(messages);

	// We return a list, because this will get added to the existing list
	return { messages: [response] };
    }

    // Define a new graph
    const workflow = new StateGraph<AgentState>({ channels: graphState })
	.addNode("agent", callModel)
	.addNode("tools", toolNode)
	.addEdge(START, "agent")
	.addConditionalEdges("agent", shouldContinue)
	.addEdge("tools", "agent");

    // Initialize memory to persist state between graph runs
    const checkpointer = new MemorySaver();

    // Finally, we compile it!
    // This compiles it into a LangChain Runnable.
    // Note that we're (optionally) passing the memory when compiling the graph
    const app = workflow.compile({ checkpointer });

    // Use the Runnable
    const finalState = await app.invoke(
	{ messages: [new HumanMessage("what is the current price of bitcoin")] },
	{ configurable: { thread_id: "42" } }
    );
    console.log(finalState.messages[finalState.messages.length - 1].content);
}


export async function search_tavily(search : string) { 
    const searchTool = new TavilySearchResults();
    const toolResult = await searchTool.invoke(search);
    console.log(toolResult);
}

export async function get_search_agent(id : string) {

    const searchTool = new TavilySearchResults();
    const tools = [searchTool]

    const llm = new ChatOpenAI({
	model: "gpt-4o",
	temperature: 0,
    });

    const prompt = await pull<ChatPromptTemplate>(
	"hwchase17/openai-functions-agent"
    );

    const agent = await createOpenAIFunctionsAgent({
	llm,
	tools,
	prompt,
    });    

    const agentExecutor = new AgentExecutor({
	agent,
	tools,
    });

    const messageHistory = new ChatMessageHistory();

    const agentWithChatHistory = new RunnableWithMessageHistory({
	runnable: agentExecutor,
	// This is needed because in most real world scenarios, a session id is needed per user.
	// It isn't really used here because we are using a simple in memory ChatMessageHistory.
	getMessageHistory: (_sessionId) => messageHistory,
	inputMessagesKey: "input",
	historyMessagesKey: "chat_history",
    });

    // @ts-expect-error
    agentWithChatHistory.chat = function(input :string) {
	return agentWithChatHistory.invoke({input }, {configurable : { sessionId : id }}) 
    }
    
    return agentWithChatHistory ;
    
} 

