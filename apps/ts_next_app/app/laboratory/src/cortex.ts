/**
 * Source code for cortex AI architecture
 * As of now (Mon Jan 27 09:51:48 CST 2025), will go with assuming STRUCTURED outputs are available, and nothing else 
 */
import { zodResponseFormat } from 'openai/helpers/zod' ;
import { z } from "zod" ;
import { buildPrompt, codeOutputFormat, DEFAULT_CORTEX_SECTIONS } from "./cortex_prompt_blocks"
import type { SectionName } from "./cortex_prompt_blocks"
import { PromptManager } from "./prompt_manager"
import type { SectionOverrides } from "./prompt_manager"
import * as tsw from "tidyscripts_web"
import {EventEmitter} from 'events'  ;
const {debug} = tsw.common.util ;
const log = tsw.common.logger.get_logger({'id':'cortex_base'})
import * as Channel from "./channel"

// Import sandbox for code execution
import type { SandboxLog, SandboxEvent } from "../cortex_0/src/sandbox"
import { DEFAULT_SANDBOX_TIMEOUT } from '../cortex_0/src/IframeSandbox' 


/*
   
   Todo:  
   [x] implemented call chains 
   
 */


/* Provider types and helpers */
type Provider = 'openai' | 'anthropic' | 'gemini';

function getProviderFromModel(model: string): Provider {
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'gemini';
    return 'openai';
}

function getEndpointForProvider(provider: Provider): string {
    switch (provider) {
        case 'anthropic': return '/api/claude_structured_response';
        case 'gemini': return '/api/gemini_structured_response';
        default: return '/api/openai_structured_response';
    }
}

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
    result  : FunctionReturnType,
    events? : SandboxEvent[]  // Optional events for observability and control flow
}

type CodeExecutionResult =  {
    name : string,
    error : boolean | string ,
    result  : FunctionReturnType
} 


/* UserInput */
type UserInput = {
    kind  : "text" | "CodeExecutionResult"  ,
    text : string | null ,
    codeExecutionResult : CodeExecutionResult | null ,
}


/* CortexOutput */
type CortexOutput = {
    thoughts : string,
    calls : FunctionCall[], //change output to array of function calls
    return_indeces : number[]
}

/* CodeOutput - for JavaScript code generation */
type CodeOutput = {
    thoughts: string,
    code: string
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

/* CortexOutputResoponseFormat - legacy, kept for reference */
export const CortexOutputResponseFormat = zodResponseFormat( zrf,  'CortexOutput'  ) ;

/* Extract raw JSON schema for new Responses API */
export const CortexOutputSchema = CortexOutputResponseFormat.json_schema.schema;
export const CortexOutputSchemaName = 'CortexOutput';

/* New CodeOutput schema for JavaScript code generation */
const CodeOutputZod = z.object({
    thoughts: z.string(),
    code: z.string()
})

export const CodeOutputResponseFormat = zodResponseFormat(CodeOutputZod, 'CodeOutput');
export const CodeOutputSchema = CodeOutputResponseFormat.json_schema.schema;
export const CodeOutputSchemaName = 'CodeOutput';

/* Helper to extract raw JSON schema from zodResponseFormat result */
export function extractJsonSchema(zodFormat: ReturnType<typeof zodResponseFormat>) {
    return {
        schema: zodFormat.json_schema.schema,
        schema_name: zodFormat.json_schema.name
    };
}


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
export function generate_system_msg(functions : Function[], additional_system_msg? : string) {
    // Extract function info for the prompt
    const functionInfos = functions.map(f => ({
        description: f.description,
        name: f.name,
        parameters: f.parameters,
        return_type: f.return_type
    }))

    // Build sections list, adding 'additional' only if provided
    const sectionsList: SectionName[] = additional_system_msg
        ? [...DEFAULT_CORTEX_SECTIONS, 'additional']
        : [...DEFAULT_CORTEX_SECTIONS]

    return buildPrompt({
        sections: sectionsList,
        sectionArgs: {
            functions: [functionInfos],
            outputFormat: [codeOutputFormat.types, codeOutputFormat.examples],
            ...(additional_system_msg && { additional: [additional_system_msg] })
        }
    })
} 


interface CortexOps {
    model : string ,
    name  : string ,
    functions : Function[] ,
    additional_system_msg : string,
    provider? : Provider  // optional, auto-detected from model if not provided
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
    provider : Provider;
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

    workspace? : { [k:string] : any } ; // Persistent workspace for sandbox executions
    last_result: any = null; // Result from previous code execution

    promptManager : PromptManager ;

    constructor(ops : CortexOps) {

	super() ;

	let { model, name, functions , additional_system_msg, provider } = ops  ;
	this.model = model ;
	this.name  = name ;
	this.provider = provider ?? getProviderFromModel(model) ;
	this.functions = functions ;
	this.messages = [ ] ;
	this.is_running_function = false;
	this.function_input_ch = new Channel.Channel({name}) ;
	this.prompt_history = [ ];
	this.CortexRAM = {}
	this.last_result = null;

	let log = tsw.common.logger.get_logger({'id' : `cortex:${name}` }); this.log = log;

	this.user_output = function(x : any) {
	    log(`User output not yet configured: received output:`)
	    log(x) ;
	}


	log("Initializing")
	log("Generating system message via PromptManager")

	// Build function infos for prompt
	const functionInfos = functions.map(f => ({
	    description: f.description,
	    name: f.name,
	    parameters: f.parameters,
	    return_type: f.return_type
	}))

	// Build sections list, adding 'additional' only if provided
	const sectionsList: SectionName[] = additional_system_msg
	    ? [...DEFAULT_CORTEX_SECTIONS, 'additional']
	    : [...DEFAULT_CORTEX_SECTIONS]

	// Create PromptManager with resolved args
	this.promptManager = new PromptManager({
	    sections: sectionsList,
	    sectionArgs: {
		codeGeneration: [functionInfos],
		outputFormat: [codeOutputFormat.types, codeOutputFormat.examples],
		...(additional_system_msg && { additional: [additional_system_msg] })
	    }
	})

	let system_msg = { role: 'system', content: this.promptManager.build() } as SystemMessage
	this.system_msg = system_msg

	log("Building function dictionary")
	let function_dictionary = get_function_dictionary(functions) ; this.function_dictionary = function_dictionary ;
	log(`Initialized: model=${model}, provider=${this.provider}`)
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

    /**
     * Run a structured completion with a custom Zod schema
     * Allows functions to invoke their own LLM completions with custom output formats
     */
    async run_structured_completion<T extends z.ZodType>(options: {
	schema: T
	schema_name: string
	messages: { role: 'system' | 'user' | 'assistant', content: string }[]
    }): Promise<z.infer<T>> {
	const { schema, schema_name, messages } = options

	this.log(`[Structured Completion] schema=${schema_name}, model=${this.model}, provider=${this.provider}`)
	this.log(`Message count: ${messages.length}`)
	this.log_event(`Structured completion: ${schema_name} | Provider: ${this.provider}`)

	// Extract raw JSON schema from Zod schema for new Responses API
	const zodFormat = zodResponseFormat(schema, schema_name)
	const { schema: jsonSchema, schema_name: schemaName } = extractJsonSchema(zodFormat)

	// Use provider-based endpoint
	const endpoint = getEndpointForProvider(this.provider);

	debug.add('structured_completion_request', { schema_name, messages, model: this.model, provider: this.provider })

	const result = await fetch(`${window.location.origin}${endpoint}`, {
	    method: 'POST',
	    headers: { 'Content-Type': 'application/json' },
	    body: JSON.stringify({
		model: this.model,
		input: messages,
		schema: jsonSchema,
		schema_name: schemaName
	    })
	})

	const jsonData = await result.json()

	debug.add('structured_completion_response', jsonData)

	if (jsonData.error) {
	    this.log(`Structured completion error: ${JSON.stringify(jsonData.error)}`)
	    this.log_event(`Structured completion failed: ${schema_name}`)
	    throw new Error(`Structured completion failed: ${jsonData.error.message || jsonData.error}`)
	}

	const { prompt_tokens, completion_tokens, total_tokens } = jsonData.usage || {}
	if (total_tokens) {
	    this.log_event(`Structured completion tokens: ${total_tokens}`)
	}

	// New Responses API returns output_text
	let parsed: z.infer<T>
	if (jsonData.output_text) {
	    parsed = JSON.parse(jsonData.output_text)
	} else if (jsonData.choices?.[0]?.message?.parsed) {
	    // Fallback for old API format
	    parsed = jsonData.choices[0].message.parsed
	} else {
	    throw new Error('Unexpected response format: no output_text or parsed content')
	}

	this.log(`Structured completion result received for: ${schema_name}`)
	debug.add('structured_completion_parsed', parsed)

	return parsed
    }

    /**
     * Re-run LLM with a different output format using existing conversation history
     *
     * This "time travels" by:
     * 1. Taking the current message history (minus the last cortex message that triggered this call)
     * 2. Rebuilding the system prompt with section overrides via PromptManager
     * 3. Running a structured completion with the custom schema
     *
     * By default, preserves all original prompt sections. Use sectionOverrides to:
     * - Replace section args: { responseGuidance: ['Custom guidance...'] }
     * - Exclude a section entirely: { functions: null }
     *
     * Useful when a function needs the LLM to extract structured data from the conversation
     * but the main CortexOutput format isn't granular enough.
     */
    async rerun_llm_with_output_format<T extends z.ZodType>(options: {
	schema: T
	schema_name: string
	sectionOverrides?: SectionOverrides
    }): Promise<z.infer<T>> {
	const { schema, schema_name, sectionOverrides = {} } = options

	this.log(`Rerunning LLM with custom output format: ${schema_name}`)

	// Get messages and drop the last one (the cortex message that called the function)
	const messages_without_last = this.messages.slice(0, -1)
	this.log(`Using ${messages_without_last.length} messages (dropped last cortex message)`)

	// Build custom output format documentation
	const outputFormatTypes = `
You must respond with a JSON object matching this schema: ${schema_name}
The response will be validated against this structure.
`

	// Merge caller's overrides with outputFormat override
	const finalOverrides = {
	    outputFormat: [outputFormatTypes],
	    ...sectionOverrides
	}

	// Use PromptManager to build modified prompt
	const system_content = this.promptManager.buildWith(finalOverrides)

	const new_system_msg = { role: 'system' as const, content: system_content }

	// Build full message array with new system message
	const full_messages = [new_system_msg, ...messages_without_last]

	this.log(`Calling structured completion with ${full_messages.length} messages`)
	debug.add('rerun_llm_messages', full_messages)

	// Use existing run_structured_completion infrastructure
	const result = await this.run_structured_completion({
	    schema,
	    schema_name,
	    messages: full_messages
	})

	this.log(`Rerun completed successfully for: ${schema_name}`)
	return result
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
	    codeExecutionResult : null
	}
	let user_message = this._user_msg(JSON.stringify(input)) ;
	this.add_user_message(user_message)
    }

    add_user_result_input(codeExecutionResult : CodeExecutionResult)  {
	let input : UserInput = {
	    kind : 'CodeExecutionResult' ,
	    codeExecutionResult ,
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
    async run_llm(loop : number = 6) : Promise<string> {

	let messages = this.build_messages() ;
	let model = this.model ;

	/* Use provider-based endpoint */
	const endpoint = getEndpointForProvider(this.provider);
	let args = {
	    model,
	    input: messages,
	    schema: CodeOutputSchema,
	    schema_name: CodeOutputSchemaName
	};

	this.log(`[LLM Call] model=${this.model}, provider=${this.provider}, endpoint=${endpoint}`);
	this.log_event(`Provider: ${this.provider} | Model: ${this.model}`);

	let result = await fetch(`${window.location.origin}${endpoint}`, {
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

    /**
     * Sets up real-time event listener for sandbox execution
     * Returns cleanup function
     */
    private setup_realtime_event_listener(): () => void {
	const handler = (event: MessageEvent) => {
	    if (!event.data.executionId) return;

	    const { type, payload } = event.data;

	    switch (type) {
		case 'log':
		    // Emit immediately to UI
		    this.emit_event({
			type: 'sandbox_log',
			level: payload.level,
			args: payload.args,
			timestamp: payload.timestamp
		    });
		    break;

		case 'event':
		    // Emit execution events immediately
		    this.emit_event({
			type: 'sandbox_event',
			eventType: payload.type,
			data: payload.data,
			timestamp: payload.timestamp
		    });
		    break;
	    }
	};

	window.addEventListener('message', handler);
	return () => window.removeEventListener('message', handler);
    }

    /**
     * Builds sandbox context with all cortex functions
     */
    private build_sandbox_context(): Record<string, any> {
	const context: Record<string, any> = {};

	// Inject all enabled cortex functions
	for (const fn of this.functions) {
	    // Expect single object parameter
	    context[fn.name] = async (params: any = {}) => {
		try {
		    // Build ops object
		    const ops = {
			params, // Always an object
			util: {
			    log: this.log,
			    event: this.emit_event.bind(this),
			    user_output: this.user_output,
			    get_user_data: async () => {
				return await this.function_input_ch.read();
			    },
			    get_var: this.get_var.bind(this),
			    set_var: this.set_var.bind(this),
			    set_var_with_id: this.set_var_with_id.bind(this),
			    get_embedding: tsw.common.apis.ailand.get_cloud_embedding,
			    handle_function_call: this.handle_function_call.bind(this),
			    collect_args: this.collect_args.bind(this),
			    resolve_args: this.resolve_args.bind(this),
			    run_cortex_output: this.run_cortex_output.bind(this),
			    run_structured_completion: this.run_structured_completion.bind(this),
			    rerun_llm_with_output_format: this.rerun_llm_with_output_format.bind(this),
			    build_system_message: buildPrompt,
			    cortex_functions: this.functions,
			    feedback: {
				error: tsw.util.sounds.error,
				activated: tsw.util.sounds.input_ready,
				ok: tsw.util.sounds.proceed,
				success: tsw.util.sounds.success
			    }
			}
		    };

		    // Execute function
		    const result = await fn.fn(ops);

		    // Ensure serializable
		    return structuredClone(result);
		} catch (error: any) {
		    throw new Error(error.message || String(error));
		}
	    };
	}

	// Add workspace reference - use persistent workspace from instance
	context.workspace = this.workspace || {};

	// Add last_result from previous execution (null on first run)
	context.last_result = this.last_result;

	return context;
    }

    /**
     * Executes JavaScript code in sandbox instead of running function calls
     */
    async run_code_output(output: CodeOutput): Promise<FunctionResult> {
	const { code } = output;

	// Setup real-time event listener BEFORE execution starts
	const cleanup = this.setup_realtime_event_listener();

	try {
	    // Build context with all cortex functions
	    const context = this.build_sandbox_context();

	    // Dynamically import sandbox to avoid circular dependencies
	    const { getExecutor } = await import('../cortex_0/src/sandbox');

	    // Execute in sandbox (workspace is passed by reference and auto-updates)
	    const sandbox = getExecutor();
	    const result = await sandbox.execute(code, context, DEFAULT_SANDBOX_TIMEOUT);

	    this.log(`Sandbox execution complete: ok=${result.ok}, duration=${result.duration}ms`);

	    // Log all console outputs from sandbox
	    if (result.logs && result.logs.length > 0) {
		this.log(`Sandbox logs: ${result.logs.length} entries`);
	    }

	    // Extract workspace and user result from wrapped execution
	    let userResult = result.data;
	    if (result.ok && result.data?.__workspace) {
		// Update workspace from sandbox
		this.workspace = result.data.__workspace;
		this.emit_event({ type: 'workspace_update', workspace: this.workspace });
		this.log(`Workspace updated: ${Object.keys(this.workspace || {}).length} keys`);

		// Extract the actual user result
		userResult = result.data.__userResult;

		// Store for next execution's last_result
		this.last_result = structuredClone(userResult);
		this.log(`Stored last_result for next execution`);
	    }

	    return {
		name: 'code_execution',
		error: result.ok ? false : result.error || 'Unknown error',
		result: userResult,
		events: result.events || []  // Include events for loop decision
	    };
	} catch (error: any) {
	    const errorMsg = `Sandbox execution failed: ${error.message}`;
	    this.log(errorMsg);
	    this.log_event(errorMsg);

	    // Clear last_result on error
	    this.last_result = null;
	    this.log(`Cleared last_result due to execution error`);

	    return {
		name: 'code_execution',
		error: errorMsg,
		result: null,
		events: []
	    };
	} finally {
	    // Cleanup event listener
	    cleanup();
	}
    }

    async handle_llm_response(fetchResponse : any , loop : number ) {

	/*
	   ---
	*/

	let jsonData = await fetchResponse.json()
	debug.add('model_json_response', jsonData) ;
	this.prompt_history.push(jsonData) ;

	// Handle error responses
	if (jsonData.error) {
	    this.log(`API Error: ${jsonData.error}`);
	    throw new Error(jsonData.error);
	}

	let {prompt_tokens, completion_tokens, total_tokens} = jsonData.usage || {};
	if (total_tokens) {
	    this.log_event(`Token Usage=${total_tokens}`) ;
	}

	// New Responses API returns output_text instead of choices[0].message.parsed
	let output: CodeOutput;
	if (jsonData.output_text) {
	    output = JSON.parse(jsonData.output_text);
	} else if (jsonData.choices?.[0]?.message?.parsed) {
	    // Fallback for old API format
	    output = jsonData.choices[0].message.parsed;
	} else {
	    throw new Error('Unexpected response format: no output_text or parsed content');
	}

	console.log(output)
	debug.add("output", output) ;

	// Add code output as cortex message
	this.add_cortex_message(this._cortex_msg(JSON.stringify(output)));

	// Emit thoughts
	this.emit_event({'type': 'thought', 'thought' : output.thoughts})

	// Emit code execution start event
	this.emit_event({
	    type: 'code_execution_start',
	    code: output.code,
	    executionId: `exec_${Date.now()}`
	});

	this.set_is_running_function(true) ; //function running indicator

	// Execute code in sandbox
	const startTime = Date.now();
	let result = await this.run_code_output(output);
	const duration = Date.now() - startTime;
	this.set_is_running_function(false) ;  //turn off function running indicator

	// Emit code execution complete event
	this.emit_event({
	    type: 'code_execution_complete',
	    status: result.error ? 'error' : 'success',
	    error: result.error,
	    duration: duration,
	    result: result.result
	});

	// Check if execution succeeded
	const executionFailed = result.error;

	// Check if the LAST function call was respond_to_user
	// This allows the agent to call respond_to_user for status updates, then continue working
	let lastFunctionCallWasRespondToUser = false;
	if (!executionFailed && result.events && result.events.length > 0) {
		// Find the last function_start event
		const functionStartEvents = result.events.filter((e: any) => e.type === 'function_start');
		if (functionStartEvents.length > 0) {
			const lastFunctionCall = functionStartEvents[functionStartEvents.length - 1];
			lastFunctionCallWasRespondToUser = lastFunctionCall.data?.name === 'respond_to_user';
			this.log(`Last function call: ${lastFunctionCall.data?.name}`);
		}
	}

	// Strip events before adding to LLM context (they're for observability, not LLM consumption)
	const resultForLLM = {
		name: result.name,
		error: result.error,
		result: result.result
	};
	this.add_user_result_input(resultForLLM);

	// Only consider it done if execution succeeded and last function call was respond_to_user
	const isComplete = !executionFailed && lastFunctionCallWasRespondToUser;

	if (isComplete) {
	    // User got response, conversation ends
	    return "done";
	}

	// Code didn't call respond_to_user or failed, LLM needs to continue
	if (loop > 0) {
	    // Re-invoke LLM with decremented loop counter
	    this.log(`Continuing LLM invocation::  [loops remaining: ${loop}] - Error=${result.error}`);
	    return await this.run_llm(loop - 1);
	} else if (loop === 0) {
	    // Out of loops - add simulated message instructing LLM to respond
	    this.log(`Loop limit reached without respond_to_user, adding instruction message`);
	    const loopLimitMessage: CodeExecutionResult = {
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

	this.log(`Appending embedding fn to parameters`)		
	aux_parameters.get_embedding =  tsw.common.apis.ailand.get_cloud_embedding ; 	

	this.log(`Including cortex get/set var`)
	aux_parameters.get_var = (this.get_var.bind(this)) ;
	aux_parameters.set_var = (this.set_var.bind(this)) ;

	this.log(`Including handle_function_call and collect_args`)
	aux_parameters.handle_function_call = (this.handle_function_call.bind(this)) ;
	aux_parameters.collect_args = (this.collect_args.bind(this)) ;

	this.log(`Including resolve_args and run_cortex_output`)	;

	aux_parameters.resolve_args = (this.resolve_args.bind(this)) ;
	aux_parameters.run_cortex_output = (this.run_cortex_output.bind(this)) ;

	this.log(`Including run_structured_completion, rerun_llm_with_output_format, build_system_message, and cortex_functions`)
	aux_parameters.run_structured_completion = this.run_structured_completion.bind(this) ;
	aux_parameters.rerun_llm_with_output_format = this.rerun_llm_with_output_format.bind(this) ;
	aux_parameters.build_system_message = buildPrompt ;
	aux_parameters.cortex_functions = this.functions ;

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
