/**
 * Source code for cortex AI architecture
 * As of now (Mon Jan 27 09:51:48 CST 2025), will go with assuming STRUCTURED outputs are available, and nothing else 
 */
import { zodResponseFormat } from 'openai/helpers/zod' ;
import { z } from "zod" ;
import system_msg_template  from "./cortex_system_msg_template"
import * as common from "tidyscripts_common"
import * as tsw from "tidyscripts_web"
import {EventEmitter} from 'events'  ;  
const {debug} = common.util ;
const log = common.logger.get_logger({'id':'cortex_base'})
import * as Channel from "./channel" 

/*
   
   Todo:  
   - support multiple function calls simultaneously 
      - probably best way is to change CortexOutput to be text of functionCallS
      - and to have functionCalls : FunctionCall[ ]  | null 
      - and just natively support multiple function calls (or 1 or none) 

 */


/* Define types */

/* FunctionParameters */
type FunctionParameters = ( Record<string,any> | null )
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
    error : boolean | string , 
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
    thoughts : string, 
    function_name :  string 
    function_args : string[] 
} 

/*
Had some issues trying to collect functionName and functionParameters together , but seems to be working now... :) 
 */

const FunctionCallObject = z.object({
    name : z.union( [z.string() , z.null() ]) , 
    parameters : z.union( [z.record(z.string()) , z.null() ])    
})

const zrf  = z.object({
    thoughts : z.string() , 
    function_name : z.string() , 
    function_args : z.array( z.string() )  , 
})

/* CortexOutputResoponseFormat */
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
export function generate_system_msg(functions : Function[], additional_system_msg : string) {
    let FUNCTIONS_STRING = get_functions_string(functions) 
    return system_msg_template.replace("FUNCTIONS_STRING_HERE", FUNCTIONS_STRING).replace("ADDITIONAL_SYSTEM_MESSAGE_HERE", additional_system_msg)
} 


interface CortexOps {
    model : string ,
    name  : string ,
    functions : Function[] ,
    additional_system_msg : string, 
} 

/**
 * Defines the Cortex class, which provides a clean interface to Agent<->User IO  
 * 
 */ 
export class Cortex extends EventEmitter  {

    model : string;
    name  : string;
    log   : any;
    functions : Function[]  ;
    system_msg : SystemMessage ; 
    function_dictionary : FunctionDictionary ;  
    messages  : IOMessages ;   //all messages (User and Cortex) that follow the system message 

    is_running_function : boolean ; //tracks whether a function is currently being called
    function_input_ch  : Channel.Channel ;

    prompt_history : any[];

    user_output : any ; 
    
    constructor(ops : CortexOps) {

	super() ;
	
	let { model, name, functions , additional_system_msg } = ops  ;
	this.model = model ;
	this.name  = name ;
	this.functions = functions ;
	this.messages = [ ] ;
	this.is_running_function = false;
	this.function_input_ch = new Channel.Channel({name}) ;
	this.prompt_history = [ ]; 
	
	let log = common.logger.get_logger({'id' : `cortex:${name}` }); this.log = log;

	this.user_output = function(x : any) {
	    log(`User output not yet configured: received output:`)
	    log(x) ; 
	} 
	

	log("Initializing")
	log("Generating system message")  
	let system_msg = {role :  'system' , content : generate_system_msg(functions,additional_system_msg) } as SystemMessage; this.system_msg = system_msg
	log("Building function dictionary")
	let function_dictionary = get_function_dictionary(functions) ; this.function_dictionary = function_dictionary ; 
	log("Done")

    }

    emit_event(evt : any) {
	this.log(`emitting event: ${JSON.stringify(evt)}`) ; 
	this.emit('event' , evt) ; 
    }
    
    configure_user_output(fn : any ) {
	this.log("Linking user output") 
	this.user_output  = fn 
    }
    
    /**
     * Build the message array 
     */
    build_messages() { return [ this.system_msg , ...this.messages ]  } 

    /**
     * Running function
     */
    set_is_running_function(v : boolean) {
	this.log(`Function running=${v}`) ; 
	this.is_running_function  = v ; 
    }
    

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
    async run_llm(loop : number = 2) : Promise<string> {

	
	let messages = this.build_messages() ;
	let model = this.model ; 
	let response_format = CortexOutputResponseFormat ;

	/* put these args together and call the API to get the response, and parse it into a CortexMessage */
	let args =  {
	    messages, model, response_format 
	} ;


	let result = await fetch(`${window.location.origin}/api/openai_structured_completion`, {
	    method : 'POST',
	    headers : {'Content-Type' : 'application/json' } ,
	    body : JSON.stringify(args)
	})

	return await this.handle_llm_response(result, loop )

	
    }

    /*
       Converts [ name1, value, name2, value ]  into
       { name1 : value, name2 : value } 
     */
    collect_args(arg_array : string[]) {
	let args = {} 
	for (var i=0; i< arg_array.length -1 ; i++ ) {
	    if ( (i % 2 ) == 0 ) {
		//its an even index and thus a param name
		let elem = arg_array[i]
		args[elem] = arg_array[i+1]
	    }
	}
	return args 
    }

    async handle_llm_response(fetchResponse : any , loop : number ) {

	let jsonData = await fetchResponse.json()
	debug.add('model_json_response', jsonData) ;
	this.prompt_history.push(jsonData) ; 

	//debugger;
	let {prompt_tokens, completion_tokens, total_tokens} = jsonData.usage ;
	this.log_event(`Token Usage=${total_tokens}`) ;
	
	let output  = jsonData.choices[0].message.parsed ;

	//add the message 
	this.add_cortex_output(output)	

	//at this point parsed is a CortexOutput object

	//also everything is upgraded to always be a function!
	let args = this.collect_args(output.function_args) ;  
	this.log(`Processed args and got:`)
	this.log(args) ; 
	
	if (output.function_name == "respond_to_user" ) {
	    this.log(`Got respond_to_user function`) 	    
	    this.emit_event({'type': 'thought', 'thought' : output.thoughts})
	    //this.log(`thinking::> ${output.thoughts}`)	    
	    this.log(`OUTPUT::> ${args.response}`)
	    return args.response
	}

	if (output.function_name != "respond_to_user" ) {

	    this.log(`Got some function`) 

	    this.set_is_running_function(true) ; //function running indicator 

	    try {
		this.log(`Loop=${loop}`)
		this.emit_event({'type': 'thought', 'thought' : output.thoughts}) 		
		
		if (loop < 1 ) {
		    this.log(`Loop counter ran out!`)

		    let name = output.function_name ;
		    let functionCall =  {
			name ,
			parameters : args 
			
		    }
		    
		    let function_result = {
			name,
			error : "too many repeated function calls, please request user  permission to proceed", 
			result : null , 
		    }
		    
		    this.set_is_running_function(false) ;  //turn off function running indicator
		    this.add_user_result_input(function_result) ;
		    return await this.run_llm(1) ; // 

		}


		let name = output.function_name ;
		let functionCall =  {
		    name ,
		    parameters : args 
		    
		}
		

		let function_result = await this.handle_function_call(functionCall) ;
		this.set_is_running_function(false) ;  //turn off function running indicator
		this.add_user_result_input(function_result) ;
		
	    } catch (e : any ) {
		
		//error with function call
		this.log(`Uncaught error with function execution!`)
		throw new Error(e)
		
	    }

	    
	    return await this.run_llm(loop-1)


	    
	}

	return "LLM output kind unrecognized" 


    }

    log_event(msg: string) {
	this.emit_event({'type' : 'log' , log : msg })  		
    } 

    //allows for passing user text to an active function 
    async handle_function_input(i :any ) {
	let msg = `Sending to function_input_ch: ${i}` 
	this.log(msg)
	this.function_input_ch.write(i) ;
	this.log_event(msg) 
    } 

    async handle_function_call(fCall : functionCall ) {
	let { name, parameters }  = fCall ;
	
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

	let fn_msg = `Running function: ${name} with args=${JSON.stringify(parameters)}`
	this.log(fn_msg)
	this.log_event(fn_msg)  

	parameters = parameters || {} ; // -- 

	//prepare the function_input
	const get_user_data = (async function() {
	    // @ts-ignore 
	    return await this.function_input_ch.read() 
	}).bind(this)

	const fn_log = common.logger.get_logger({id : `fn:${name}`}); 

	this.log(`Appending get_user_data to function parameters`)	
	parameters.get_user_data = get_user_data ;
	parameters.log = fn_log ; 	

	//also prepare the feedback object
	let sounds = tsw.util.sounds ; 
	const feedback = {
	    error : sounds.error,
	    activated  : sounds.input_ready, 
	    ok : sounds.proceed,
	    success : sounds.success , 
	}

	this.log(`Appending feedback object to function parameters`)	
	parameters.feedback  = feedback  ;

	this.log(`Appending user_output to function parameters`)	
	parameters.user_output  = this.user_output  ;

	this.log(`Appending event to function parameters`)	
	parameters.event  = this.emit_event.bind(this)  ; 
	
	
	
	try {
	    let result = await F.fn(parameters)
	    error = null ;
	    this.log_event(`Ran ${name} function successfully`)
	    this.log(`Ran ${name} function successfully and got result:`)
	    this.log(result) ; 
	    return {
		error,
		result,
		name 
	    }
	} catch (e : any ) {
	    error =  e.message ;
	    this.log(error)
	    this.log_event(`[ERROR] - Error with function: ${name}: ${error}`)	    
	    return {
		error , 
		result : null ,
		name 
	    } 
	}


	
    }

    

    
    
    
} 
