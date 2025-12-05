/**
 * Source code for cortex AI architecture
 * As of now (Mon Jan 27 09:51:48 CST 2025), will go with assuming STRUCTURED outputs are available, and nothing else 
 */
import { zodResponseFormat } from 'openai/helpers/zod' ;
import { z } from "zod" ;
import system_msg_template  from "./cortex_system_msg_template"
import * as tsw from "tidyscripts_web"
import {EventEmitter} from 'events'  ;  
const {debug} = tsw.common.util ;
const log = tsw.common.logger.get_logger({'id':'cortex_base'})
import * as Channel from "./channel" 


/*
   
   Todo:  
   [ ] implemented multicall 

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

type CallChainResult =  {
    name : string,
    error : boolean | string , 
    result  : FunctionReturnType
} 


/* UserInput */
type UserInput = {
    kind  : "text" | "CallChainResult"  ,
    text : string | null , 
    callChainResult : CallChainResult | null , 
}


/* CortexOutput */
type CortexOutput = {
    thoughts : string,
    calls : FunctionCall[], //change output to array of function calls
    return_indeces : number[]
} 


const FunctionCallObject = z.object({
    name : z.string() ,
    parameters : z.union( [z.record(z.string()) , z.null() ])    
})

const zrf  = z.object({
    thoughts : z.string() , 
    calls : z.array( FunctionCallObject ),
    return_indeces : z.array( z.number() )  }
)

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


export async function get_variable_hash_id(v : any ) {
    let o =  {
	data : v 
    }
    let r = await tsw.common.apis.cryptography.object_hash_short(o)
    return r 
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

    CortexRAM : { [k:string] : any } ; 
    
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
	this.CortexRAM = {} 
	
	let log = tsw.common.logger.get_logger({'id' : `cortex:${name}` }); this.log = log;

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

    async set_var(v : any )  {

	let id = await get_variable_hash_id(v) ; 
	this.CortexRAM[id] = v; 
	this.log(`Wrote var with id hash=${id}`)
	debug.add(id, v)
	return id  ; 
    }

    async set_var_with_id(v : any , id : string )  {

	this.CortexRAM[id] = v; 
	this.log(`Wrote var with id=${id}`)
	debug.add(id, v)
	return id  ; 
    }
    
    get_var(id : string) {
	this.log(`Returning var ${id}`)	
	return this.CortexRAM[id] 
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
	    callChainResult : null 
	}
	let user_message = this._user_msg(JSON.stringify(input)) ; 
	this.add_user_message(user_message) 
    }

    add_user_result_input(callChainResult : CallChainResult)  {
	let input : UserInput = {
	    kind : 'CallChainResult' ,
	    callChainResult ,
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
    async run_llm(loop : number = 1) : Promise<string> {

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


    resolve_cortex_ram_reference(v : string) {
	//the reference starts with @
	if (v[0] == "@" ) {
	    this.log(`Detected CRAM reference ${v}`) ;
	    //search
	    let value = this.get_var( v.slice(1) ) ;
	    if (value ) {
		this.log(`Returning resolved value`)
		debug.add('resolved_cram_ref' , value ) ; 
		return value 
	    } else {
		this.log(`Reference is undefined!`) ;
		return null  //this behavior may need to be updated @check 
	    }
	} else {
	    this.log(`No CRAM ref found: passing var through`) 
	    return v 
	}
    }
    
    /*
       Converts [ name1, value, name2, value ]  into
       { name1 : value, name2 : value } 
     */
    collect_args(arg_array : string[]) {
	let args = {} as any ; 
	for (var i=0; i< arg_array.length -1 ; i++ ) {
	    if ( (i % 2 ) == 0 ) {
		//its an even index and thus a param name
		let k = arg_array[i] ; var v = null ; 

		/*
		   For collecting the value:
		   1st try json parse it
		   2nd check to see if it is a reference to CortexRAM and resolve it if so 
		 */
		
		let tmp = arg_array[i+1]
		
		try {
		    
		    v = JSON.parse(tmp)
		    
		}   catch (error : any ) {
		    
		    v = this.resolve_cortex_ram_reference(tmp) ;
		    
		}
		
		args[k] = v   ; 
	    }
	}
	return args 
    }

    resolve_args(args : any): any {
	// Handle null/undefined
	if (args === null || args === undefined) {
	    return args;
	}

	// Handle strings - most complex case
	if (typeof args === 'string') {
	    // Check for CortexRAM reference (@id)
	    if (args[0] === '@') {
		this.log(`Resolving CortexRAM reference: ${args}`);
		return this.resolve_cortex_ram_reference(args);
	    }

	    // Check for result reference ($N)
	    if (args.match(/^\$\d+$/)) {
		this.log(`Resolving result reference: ${args}`);
		const value = this.get_var(args);
		if (value !== undefined) {
		    return this.resolve_args(value);
		} else {
		    this.log(`Warning: ${args} not found in CortexRAM, returning as-is`);
		    return args;
		}
	    }

	    // Try to parse as JSON
	    try {
		const parsed = JSON.parse(args);
		// Successfully parsed - recursively resolve in case it contains references
		return this.resolve_args(parsed);
	    } catch (e) {
		// Not valid JSON - return as plain string
		return args;
	    }
	}

	// Handle arrays - recursively resolve each element
	if (Array.isArray(args)) {
	    return args.map(item => this.resolve_args(item));
	}

	// Handle objects - recursively resolve each value
	if (typeof args === 'object') {
	    const resolved: any = {};
	    for (const key in args) {
		if (args.hasOwnProperty(key)) {
		    resolved[key] = this.resolve_args(args[key]);
		}
	    }
	    return resolved;
	}

	// Handle primitives (number, boolean, etc.) - return as-is
	return args;
    }

    async run_cortex_output(co : CortexOutput): Promise<FunctionResult> {
	try {
	    const { calls, return_indeces } = co;

	    if (!calls || calls.length === 0) {
		this.log('No function calls to execute');
		return {
		    name: 'run_result',
		    error: false,
		    result: "There were no functions to execute" 
		};
	    }

	    this.log(`Executing cortex output with ${calls.length} function calls`);
	    const results: FunctionResult[] = [];

	    // Execute each call serially
	    for (let i = 0; i < calls.length; i++) {
		const call = calls[i];
		this.log(`Executing call ${i + 1}/${calls.length}: ${call.name}`);

		// Execute function (handle_function_call will resolve parameters)
		const result = await this.handle_function_call({
		    name: call.name,
		    parameters: call.parameters
		});

		results.push(result);

		// Store result for $N references
		await this.set_var_with_id(result.result, `$${i}`);

		// Fail fast on error
		if (result.error) {
		    const filtered = this.filter_results_by_indices(results, return_indeces);
		    const errorMsg = `Execution failed at call ${i + 1}/${calls.length} (${call.name}): ${result.error}`;
		    this.log(errorMsg);
		    this.log_event(errorMsg);
		    return {
			name: 'run_result',
			error: errorMsg,
			result: { results: filtered }
		    };
		}
	    }

	    // Success - filter and return
	    const filtered = this.filter_results_by_indices(results, return_indeces);
	    this.log(`All ${calls.length} calls completed successfully`);
	    this.log_event(`Run execution completed: ${calls.length} functions`);
	    debug.add("results", results)
	    this.log(results)	    
	    debug.add("filtered", filtered)
	    this.log(filtered) 

	    
	    return {
		name: 'call_chain_results',
		error: false,
		result: { results: filtered }
	    };

	} catch (error: any) {
	    const errorMsg = `Unexpected error in run execution: ${error.message}`;
	    this.log(errorMsg);
	    this.log_event(errorMsg);
	    return {
		name: 'run_result',
		error: errorMsg,
		result: null 
	    };
	}
    }

    private filter_results_by_indices(results: FunctionResult[], indices: number[]): Record<number, FunctionResult> {
	// Return all if no indices specified
	if (!indices || indices.length === 0) {
	    const all: Record<number, FunctionResult> = {};
	    results.forEach((result, idx) => {
		all[idx] = result;
	    });
	    return all;
	}

	// Filter by indices
	const filtered: Record<number, FunctionResult> = {};
	indices.forEach(idx => {
	    if (idx >= 0 && idx < results.length) {
		filtered[idx] = results[idx];
	    } else {
		this.log(`Warning: return_indeces contains invalid index ${idx}`);
	    }
	});
	return filtered;
    }

    async handle_llm_response(fetchResponse : any , loop : number ) {

	/*
	   ---
	*/

	let jsonData = await fetchResponse.json()
	debug.add('model_json_response', jsonData) ;
	this.prompt_history.push(jsonData) ; 

	//debugger;
	let {prompt_tokens, completion_tokens, total_tokens} = jsonData.usage ;
	this.log_event(`Token Usage=${total_tokens}`) ;
	
	let output  = jsonData.choices[0].message.parsed ;
	console.log(output) 
	debug.add("output", output) ; 

	//add the message 
	this.add_cortex_output(output)	

	//at this point parsed is a CortexOutput object
	this.log(`Got respond_to_user function`) 	    
	this.emit_event({'type': 'thought', 'thought' : output.thoughts})


	this.set_is_running_function(true) ; //function running indicator 	


	let result = await this.run_cortex_output(output);
	this.set_is_running_function(false) ;  //turn off function running indicator
	this.add_user_result_input(result)

	// Check if last function was respond_to_user AND execution succeeded
	const executionFailed = result.error;
	const lastCall = output.calls[output.calls.length - 1];
	const plannedRespondToUser = lastCall && lastCall.name === "respond_to_user";

	// Only consider it done if respond_to_user actually executed successfully
	const isRespondToUser = !executionFailed && plannedRespondToUser;

	if (isRespondToUser) {
	    // User got response, conversation ends
	    return "done";
	}

	// Last call wasn't respond_to_user, LLM needs to process results
	if (loop > 0) {
	    // Re-invoke LLM with decremented loop counter
	    this.log(`Continuing LLM invocation::  [loops remaining: ${loop}] - Error=${result.error}`);
	    return await this.run_llm(loop - 1);
	} else if (loop === 0) {
	    // Out of loops - add simulated message instructing LLM to respond
	    this.log(`Loop limit reached without respond_to_user, adding instruction message`);
	    const loopLimitMessage: CallChainResult = {
		name: "system_message",
		error: false,
		result: "Loop limit reached. You must now call respond_to_user with the current status of the task."
	    };
	    this.add_user_result_input(loopLimitMessage);

	    // Give LLM one final chance to respond (loop=-1 to prevent further loops)
	    return await this.run_llm(-1);
	} else {
	    // loop < 0 (safety limit reached after instruction message)
	    this.log(`Final loop limit reached without respond_to_user, forcing stop`);
	    return "done";
	} 


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

    async handle_function_call(fCall : FunctionCall ) {
	let { name, parameters }  = fCall ;

	// Resolve any references in parameters (idempotent - safe to call multiple times)
	parameters = this.resolve_args(parameters);

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

	var aux_parameters = {} as any; 

	//prepare the function_input
	const get_user_data = (async function() {
	    // @ts-ignore 
	    return await this.function_input_ch.read() 
	}).bind(this)

	const fn_log = tsw.common.logger.get_logger({id : `fn:${name}`}); 

	this.log(`Appending get_user_data to function parameters`)	
	aux_parameters.get_user_data = get_user_data ;
	aux_parameters.log = fn_log ; 	

	//also prepare the feedback object
	let sounds = tsw.util.sounds ; 
	const feedback = {
	    error : sounds.error,
	    activated  : sounds.input_ready, 
	    ok : sounds.proceed,
	    success : sounds.success , 
	}

	this.log(`Appending feedback object to function parameters`)	
	aux_parameters.feedback  = feedback  ;

	this.log(`Appending user_output to function parameters`)	
	aux_parameters.user_output  = this.user_output  ;

	this.log(`Appending event to function parameters`)	
	aux_parameters.event  = this.emit_event.bind(this)  ; 
	

	this.log(`Including cortex get/set var`)
	aux_parameters.get_var = (this.get_var.bind(this)) ;
	aux_parameters.set_var = (this.set_var.bind(this)) ;

	this.log(`Including handle_function_call and collect_args`)
	aux_parameters.handle_function_call = (this.handle_function_call.bind(this)) ;
	aux_parameters.collect_args = (this.collect_args.bind(this)) ;

	this.log(`Including resolve_args and run_cortex_output`)	;

	aux_parameters.resolve_args = (this.resolve_args.bind(this)) ;
	aux_parameters.run_cortex_output = (this.run_cortex_output.bind(this)) ;	

	try {
	    let result = await F.fn({params : parameters, util : aux_parameters})
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
	    let error_msg = `
                [ERROR] - Error with function: ${name}: ${error}
                DO NOT proceed any further
                Instead think about what caused this error 
                Immediately report this error and your thoughts regarding the reason to the user and await further instructions 
	    `
	    this.log(error_msg)
	    this.log_event(error_msg)
	    
	    return {
		error : error_msg , 
		result : null ,
		name 
	    } 
	}


	
    }

    

    
    
    
} 
