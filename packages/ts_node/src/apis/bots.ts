/**
 * Thu Jun 13 12:09:27 CDT 2024
 * This module defines AI bots or agents 
 * 
 * Generated with the help of ChatGPT GPT-4o web interface.
 * @packageDocumentation
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history"; // We use an ephemeral, in-memory chat history

import chat_bot_system_msg_template from "./chat_bot_system_msg_template"

import * as common from "tidyscripts_common"

const log   = common.logger.get_logger({'id' : 'node_bots'})
const util  = common.util 

/*
   Bots can make use of functions (also called tools in langchain) to accomplish tasks 
   that they need to accomplish or to retrieve information. 

   The function interfaces are provided to the bot in the system message, as well as the protocol 
   for the bot to use for communication. 
 */ 

type Function = {
    description  : string,
    name : string ,
    args : string ,
    return_type : string,
    fn  : any  
} 


type FunctionCall =  {
    function_name : string,
    args : any 
} 

/**
 * Converts a function object into a string representation that can be included into a system msg
 * @param function 
 */
export function convert_function_object_to_string(fn : Function) {
    let {description, name, args, return_type } = fn ;
    return `
      - BEGIN Function - 
      Function name = ${name} 
      Function description = ${description}
      Function args = ${args} 
      Function return type = ${return_type}
      - END FUNCTION -
    `
} 


/**
 * Returns the chat_bot itself. 
 * The chat bot parses any json and calls any necessary functions and passes information to its 
 * "brain" for processing  
 * @param functions - An argument which specifies the functions available to the bot
 */
export function get_chat_bot(functions : Function[]) {

    /* create mapping of function name to the function object */ 
    var function_dic : any  = {} ;
    functions.map( (f : Function) => function_dic[f.name] = f ) 

    /* Convert functions to string representation */
    
    const functions_string = `
 
      ${  functions.map( convert_function_object_to_string  ).join("\n\n")  }     
 
    `; 
    let chat_bot_system_msg = chat_bot_system_msg_template.replace("FUNCTIONS_STRING_HERE", functions_string) ;

    log(`Creating chat bot brain using system message: ${chat_bot_system_msg}`) ;

    let brain = get_chat_bot_brain(chat_bot_system_msg)    

    /* 
       Create the functionality of parsing the json output and calling it
       handle_output is a recursive function that will eventually retun a 
       bot answer 
     */

    let call_function = async function(fc : FunctionCall ) {
	/* 1. first look up to see if the function exists in the function dic */
	let fn_obj = function_dic[fc.function_name]
	let result : any  = null ;
	
	if (! fn_obj) {

	    /* 2. if does not exist then notify that */	    
	    
	    log(`Function ${fc.function_name} not found`)
	    result = { function_name : fc.function_name , return_value : "function not found" }
	    
	} else {

	    /* 3. if does exist then run it that */	    	    
	    log(`Running function ${fc.function_name} with args ${JSON.stringify(fc.args)}`)
	    
	    try {
		result = await fn_obj.fn(fc.args)
		log(`Got result: ${JSON.stringify(result)}`)
		result = { function_name : fc.function_name , return_value : result }		
	    } catch (e:any) {
		log(`Got error: ${e}`)
		result = { function_name : fc.function_name , return_value : `Error with function execution: ${e}` }
		
	    } 
	    
	}

	/* 4. Whatever the result object is can now returned */
	return result 
	
    } 
    
    let handle_output = async function(output : string) {

	if (util.is_json_string(output) ) {

	    log("Detected json output")
	    log(output) 
	    let function_call = (JSON.parse(output) as FunctionCall) 
	    
	    //this is a function call and thus needs to be handled
	    log("Processing function call:")
	    log(function_call)
	    let result = await call_function(function_call) ; 

	    log(`Got function result:`);
	    log(result) 

	    //now the result should be passed back to the brain
	    let msg = JSON.stringify(result)

	    // @ts-expect-error	    
	    let new_result = await brain.process_input(msg)

	    return handle_output(new_result)
	    
	} else {

	    return output 
	    
	}

	
    } 
    


    let bot : any = {} ;
    
    bot.chat = async function(user_input : string) {
	//pass the input to the brain and get the output

	// @ts-expect-error	
	let result = await brain.process_input(user_input) ;
	//handle the result
	return await handle_output(result) 
    }

    //pass a reference to its brain as well
    bot.brain = brain ;

    //and to the function dic 
    bot.fn_dic = function_dic  ; 

    return bot

} 

/**
 * Returns the "brain" of the chat_bot. The brain accepts an input string and returns an output string
 * The functionality of the bot is specified by the system message, which is passed as a string 
 * @param chat_bot_system_msg - A string specifying the desired system message 
 * 
 */

export function get_chat_bot_brain(chat_bot_system_msg : string) {

    const model = new ChatOpenAI({model : "gpt-4o", temperature : 0}) ; 

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

    const brain = new RunnableWithMessageHistory({
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

    var process_input = async function(input : string) { 
	const response = await brain.invoke(
	    {
		input 
	    },
	    config
	);
	return response.content
    }

    // @ts-expect-error
    brain.process_input = process_input 
    
    return brain
} 
