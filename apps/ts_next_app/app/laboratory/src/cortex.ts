/**
 * Source code for cortex AI architecture
 * As of now (Mon Jan 27 09:51:48 CST 2025), will go with assuming STRUCTURED outputs are available, and nothing else 
 */
import { zodResponseFormat } from 'openai/helpers/zod' ;
import { z } from "zod" ;
import system_msg_template  from "./cortex_system_msg_template"
import * as common from "tidyscripts_common"

const {debug} = common.util ;
const log = common.logger.get_logger({'id':'cortex_base'})


/*
   
   Todo:  
   - integrate this into CortexUI 
   - support multiple function calls simultaneously 
      - probably best way is to change CortexOutput to be text of functionCallS
      - and to have functionCalls : FunctionCall[ ]  | null 
      - and just natively support multiple function calls (or 1 or none) 

 */




/* Define types */

/* FunctionParameters */
type FunctionParameters = ( Record<string,string> | null )
type FunctionReturnType = any 

/* Function */
type Function = {
    description  : string,
    name : string ,
    parameters : FunctionParameters , 
    return_type : FunctionReturnType , 
    fn  :  (p : FunctionParameters) => FunctionReturnType  
} 

/* FunctionCall */
type FunctionCall =  {
    name : string,
    parameters :  FunctionParameters  
}

/* FunctionResult */
type FunctionResult =  {
    name : string,
    error : boolean , 
    result  : FunctionReturnType
} 

/* FunctionResult */
type UserInput = {
    kind  : "text" | "functionResult"  ,
    text : string | null , 
    functionResult : FunctionResult | null , 
}


/* CortexOutput */
type CortexOutput = {
    kind  : "text" | "functionCall" ,
    thoughts : string, 
    text :  string | null ,
    functionCall : FunctionCall | null ,
} 

/*
Had some issues trying to collect functionName and functionParameters together , but seems to be working now... :) 
 */

const FunctionCallObject = z.object({
    name : z.union( [z.string() , z.null() ]) , 
    parameters : z.union( [z.record(z.string()) , z.null() ])    
})

const zrf  = z.object({
    kind : z.enum(['text', 'functionCall'])  , 
    thoughts : z.string() , 
    text : z.union( [z.string() , z.null() ] ) , 
    functionCall : z.union( [FunctionCallObject, z.null() ]) 
})

/* CortexOutputResponseFormat */
export const CortexOutputResponseFormat = zodResponseFormat( zrf,  'CortexOutput'  ) ;


/* FunctionDictionary */ 
type FunctionDictionary = {
    [ key : string ] : Function 
} 

/* Message types */ 
type SystemMessage = {
    role : 'system' ,
    content : string
} 
type UserMessage = {
    role : 'user' ,
    content : string, 
} 
type CortexMessage = {
    role : 'assistant' ,
    content : string, 
} 
type IOMessage  = (UserMessage | CortexMessage )
type IOMessages = IOMessage[] ; 




/* create mapping of function name to the function object */ 
export function get_function_dictionary(functions : Function[]) {
    var function_dic : FunctionDictionary  = {} ;
    functions.map( (f : Function) => function_dic[f.name] = f )
    return function_dic ; 
} 

/* convert all functions into JSON string for system msg */ 
export function get_functions_string(functions : Function[]) {
    let function_infos =  functions.map( (f : Function) =>  {
	let {description, name, parameters, return_type } = f ;
	log(`Adding function: ${name}`) 
	return { description, name, parameters, return_type } 
    })

    return JSON.stringify(function_infos, null, 2) ; 

} 


/* Generates the system message from an array of function objects */ 
export function generate_system_msg(functions : Function[]) {
    let FUNCTIONS_STRING = get_functions_string(functions) 
    return system_msg_template.replace("FUNCTIONS_STRING_HERE", FUNCTIONS_STRING) 
} 


interface CortexOps {
    model : string ,
    name  : string ,
    functions : Function[] , 
} 

/**
 * Defines the Cortex class, which provides a clean interface to Agent<->User IO  
 * 
 */ 
export class Cortex  {

    model : string;
    name  : string;
    log   : any; 
    functions : Function[]  ;
    system_msg : SystemMessage ; 
    function_dictionary : FunctionDictionary ;  
    messages  : IOMessages ;   //all messages (User and Cortex) that follow the system message 

    constructor(ops : CortexOps) {
	let { model, name, functions } = ops  ;
	this.model = model ;
	this.name  = name ;
	this.functions = functions ;
	this.messages = [ ] 
	let log = common.logger.get_logger({'id' : `cortex:${name}` }); this.log = log;

	log("Initializing")
	log("Generating system message")  
	let system_msg = {role :  'system' , content : generate_system_msg(functions) } as SystemMessage; this.system_msg = system_msg
	log("Building function dictionary")
	let function_dictionary = get_function_dictionary(functions) ; this.function_dictionary = function_dictionary ; 
	log("Done")

    }

    /**
     * Build the message array 
     */
    build_messages() { return [ this.system_msg , ...this.messages ]  } 

    
    /**
     * Add UserMessage 
     */
    add_user_message(msg : UserMessage) {
	this.messages = [ ...this.messages, msg ] ; 
	this.log(`Added user message`) 
    } 

    /**
     * Add CortexMessage 
     */
    add_cortex_message(msg : CortexMessage) {
	this.messages = [ ...this.messages, msg ] ; 
	this.log(`Added cortex message`) 
    } 

    _user_msg(content : string)  { return { role :'user', content } as UserMessage }
    _cortex_msg(content : string)  { return { role :'assistant', content }   as CortexMessage }    
    
    add_user_text_input(text : string) {
	let input : UserInput = {
	    kind : "text" ,
	    text  ,
	    functionResult : null 
	}
	let user_message = this._user_msg(JSON.stringify(input)) ; 
	this.add_user_message(user_message) 
    }

    add_user_result_input(functionResult : FunctionResult)  {
	let input : UserInput = {
	    kind : 'functionResult' ,
	    functionResult ,
	    text : null 
	}
	let user_message = this._user_msg(JSON.stringify(input))
	this.add_user_message(user_message) 
    }

    add_cortex_output(output : CortexOutput ) {
	let cortex_message = this._cortex_msg(JSON.stringify(output))
	this.add_cortex_message(cortex_message) 
    }
    
	
    /**
     * Run the LLM with the specified system message, message history, and parameters
     * If loop=N, after obtaining a function response another LLM call 
     * will be made automatically, until no more functions are called or until N calls have been made 
     */
    async run_llm(loop : number = 2) {

	
	let messages = this.build_messages() ;
	let model = this.model ; 
	let response_format = CortexOutputResponseFormat ;

	/* put these args together and call the API to get the response, and parse it into a CortexMessage */
	let args =  {
	    messages, model, response_format 
	} ;


	let result = await fetch("api/openai_structured_completion", {
	    method : 'POST',
	    headers : {'Content-Type' : 'application/json' } ,
	    body : JSON.stringify(args)
	})

	await this.handle_llm_response(result, loop )

	
    }


    async handle_llm_response(fetchResponse : any , loop : number ) {

	let jsonData = await fetchResponse.json()
	let output  = jsonData.choices[0].message.parsed ;

	//add the message 
	this.add_cortex_output(output)	

	//at this point parsed is a CortexOutput object
	if (output.kind == "text" ) {
	    this.log(`thinking::> ${output.thoughts}`)	    
	    this.log(`OUTPUT::> ${output.text}`)
	    return 
	}

	if (output.kind == "functionCall" ) {
	    this.log(`Loop=${loop}`) 
	    if (loop < 1 ) {
		this.log(`Loop counter ran out!`)
		return 
	    }
	    
	    this.log(`thinking::> ${output.thoughts}`)
	    let function_result = await this.handle_function_call(output) ;

	    this.add_user_result_input(function_result) ;

	    this.run_llm(loop-1) 

	    
	} 

	return 
    }

    async handle_function_call(fMsg : CortexOutput) {
	let { thoughts,  functionCall }  = fMsg ;
	let { name, parameters }  = functionCall as FunctionCall  ;

	let F = this.function_dictionary[name] ;
	var error : any  ; 
	if (! F ) {
	    error = `The function ${name} was not found`
	    this.log(error) 
	    return {
		error , 
		result :  null ,
		name 
	    }
	}

	this.log(`Running function: ${name} with args=${JSON.stringify(parameters)}`) 
	try {
	    let result = await F.fn(parameters)
	    error = null ; 
	    this.log(`Ran ${name} function successfully and got result:`)
	    this.log(result) ; 
	    return {
		error,
		result,
		name 
	    }
	} catch (e : any ) {
	    error =  e ;
	    this.log(error) 	    
	    return {
		error , 
		result : null ,
		name 
	    } 
	}


	
    }

    

    
    
    
} 
