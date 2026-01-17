'use client' ;

import * as c from "../src/cortex"  ;
//import jdoc from "../../../../docs/jdoc.json"
import * as fbu from "../../../src/firebase_utils"
import * as fnu from "../src/fn_util"
import * as tsw from "tidyscripts_web"
import { create_cortex_functions_from_mcp_server } from "./mcp_adapter" ;
import * as cu from "./src/cortex_utils"
import { z } from "zod" 

const vi = tsw.util.voice_interface ;
const {common} = tsw;
const {debug} =  common.util ;
declare var window : any ;

// MCP server configuration
const MCP_SERVER_URL = "http://localhost:8003/mcp";

/**
 * Defines the cortex agent used in the Cortex UI 
 */

/*
   Todo :

   [x] improve the error handling so when fn error messages are passed back to cortex it also says to pause and report the error to the user

   [x]
   Help cortex learn how to create function templates.
   Have claude review the code on function templates -- then generate a new function that tells
   cortex how to test a function template (called test_function_template) , it should take the template_name, template_args, the function_name, and
   function args, as well as a test_template_args.

   It will then run the test_template with the provided args and report the result back to cortex (including the error if it errored). If it runs successfully the function template is also saved to CortexRAM and the id is reported back to Cortex

   [x]
   Next - claude should make another function called save_function_template, which will take the reference to a function template (explaining that it must be tested first and successful testing produces the referencable id) and actually stores it into the cortex table with type=function_template and with template=the_actual_template_object

   [x]
   After the above is done: coach cortex (via chat) on developing a template called create_user_log which takes a category parameter and then uses accumulate text to get a log and then computes the embedding of the text and saves everything into the logs table with { category, text, embedding }


   [ ]
   Next: actually need to load the function templates at init time and make them available!
   - [ ] 1st pass - just create an init function
   - [ ] 2nd pass - dynamic SYSTEM_PROMPT management ? may be overkill

   [ ]
   Next: ability to search surreal db with embeddings: -- consider coaching cortex using the MCP surreal tool and the query function, to make a function_template that can do this





   UI updates -- top right (context usage bar green/red/ etc ) , last tool call (implement as small
   widgets that can be placed)

   Separate UI - show function call stack (including arugments)

   Pattern -> Create a useObservability hook that collects all state and state updates into one place
   Then build components which are view ontop of this!

 */


/**
 * Loads MCP functions from the MCP server
 * Returns empty array if server is not available
 */
export async function load_mcp_functions() {
    try {
        console.log("Loading MCP functions from server...");
        const mcpFunctions = await create_cortex_functions_from_mcp_server(MCP_SERVER_URL);
        console.log(`Loaded ${mcpFunctions.length} MCP functions`);
        return mcpFunctions;
    } catch (error) {
        console.warn("Failed to load MCP functions (server may not be running):", error);
        return [];
    }
}

/**
 * Creates a Cortex agent with standard functions only
 */
export function get_agent(modelName: string = "gpt-5-mini") {
    // init cortex with chosen model
    let model = modelName;
    let name  = "coer" ;
    let additional_system_msg = `
    Tidyscripts is the general name for your software architecture.
    `;

    let extra_msg = `
    Tidyscripts Ontology of Medicine (TOM) is the name of a medical knowledge graph / database which you have access to.

    When the user asks for information from TOM or from "the medical database", DO NOT PROVIDE information from anywhere else or from
    your memory.
    `;

    let enabled_functions = functions.filter( (f:any)=> (f.enabled == true) ) ;

    let ops   = { model , name, functions : enabled_functions, additional_system_msg  }
    let coer    = new c.Cortex( ops ) ;
    //
    return coer ;
}

/**
 * Creates a Cortex agent with MCP functions included
 * Asynchronously loads functions from the MCP server
 */
export async function get_agent_with_mcp(modelName: string = "gpt-5-mini") {
    // init cortex with chosen model
    let model = modelName;
    let name  = "coer" ;
    let additional_system_msg = `
    Tidyscripts is the general name for your software architecture.


    Before telling the user you do not know something, try searching your external knowledge
    graph (called the matrix) by using the function retrieve_declarative_knowledge 

    Do not make any assumptions about what the KG  contains! 

    `;

    // Load MCP functions
    const mcpFunctions = await load_mcp_functions();

    // Combine standard functions with MCP functions
    let enabled_functions = functions.filter( (f:any)=> (f.enabled == true) ) ;
    let all_functions = [...enabled_functions, ...mcpFunctions];

    let ops   = { model , name, functions : all_functions, additional_system_msg  }
    let coer    = new c.Cortex( ops ) ;
    //
    return coer ;
}


export async function tes(fn_path  : string[], fn_args : any[] ) {
    
    let t =  await fetch('http://localhost:8001/call', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json',
	},
	body: JSON.stringify({fn_path, fn_args})
    });

    return await t.json()
} 



const functions = [
    {
	enabled : true ,
	description : `Formats a string based on the provided template and arguments. Returns the string.
Uses {key} placeholders in the template which get replaced with values from args.
Example: format_string("Hello {name}!", {name: "World"}) => "Hello World!"`,
	name : "format_string" ,
	parameters : { string_template : 'string' , args : "object" } ,
	fn  : async ( ops : any ) => {
	    let { string_template, args } = ops.params
	    let { log } = ops.util

	    log(`Formatting string`)
	    if (typeof args == 'string') {
	       log(`Received string arguments will parse`)
	       args = JSON.parse(args) 
	    }  

	    log(`Formatting string template with args: ${JSON.stringify(args)}`)

	    let result = string_template
	    for (const [key, value] of Object.entries(args || {})) {
		const strValue = (typeof value === 'object' && value !== null)
		    ? JSON.stringify(value)
		    : String(value)
		result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), strValue)
	    }

	    return result
	},
	return_type : "string"
    }, 
   {
      enabled : true,
      description : `Function for responding to the user` ,
      name : "respond_to_user",
      parameters : { response : "string" } ,
	  fn : async (ops : any) => {
	      let {user_output, log} = ops.util ;
	      let {response} = ops.params ; 
	      log(`user response: ${String(response)}`) ;
	      await user_output(response) ;
	      return `Responded to user with: ${response}` ; 
	  },
       return_type : "string" , 
   },

    {
	enabled : true, 
	description : `
	Compute vector embedding for a text input.

	This function takes an input named text and computes the vector embedding of it
	The result is stored in CortexRAM with a unique id, which you can use to reference it for future function invocations

        The return value is a reference to the embedding which is automatically resolved in future calls 

	` ,
	name        : "compute_embedding" ,
	parameters  : { text : "string" }   ,
	fn          : async (ops : any) => {
	    let { get_var, set_var, log  } = ops.util ;
	    let { text } = ops.params ;
	    log(`Retrieved request to compute embedding of: ${text}`) ; 
	    let embedding = await tsw.common.apis.ailand.get_cloud_embedding(text) ;
	    log(`Got embedding result`)
	    debug.add("embedding" , embedding) ;
	    //now we ---
	    let id = await set_var(embedding)  ;
	    return `@${id}`  ; 
	} ,
	return_type : "string"
    },

    {
	enabled : true, 
	description : `
           Return the nth value of an array 
	` ,
	name        : "array_nth_value" ,
	parameters  : { a : "array"  , n : "number" }   ,
	fn          : async (ops : any) => {
	    let { a, n   } = ops.params ;
	    return (a as any)[Number(n)]  ; 
	} ,
	return_type : "any"
    },

    {
	enabled : true, 
	description : `
 	   Stores declarative knowledge to your knowledge graph. The knowledge graph is called the Matrix. 
	   Use this function to persist relational / conceptual / declarative knowledge into your knowledge graph
	   memory.

	   This is great for storing relationships between entities like city -> in -> state
	   or shay  is -> human

	   Provide the knowledge in simple narrative/textual form, with clearly idenfitied identies
	   And relationships, and it will be converted and saved for you. 
	   ` ,
	name        : "store_declarative_knowledge" ,
	parameters  : { knowledge : "string" }  ,
	fn          : async (ops : any) => {
	    let {knowledge} = ops.params ;
	    let result = await common.tes.localhost.dev.matrix._add_knowledge(knowledge);
	    return result
	} ,
	return_type : "any"
    },

    {
	enabled : true, 
	description : `
 	   Retrievs declarative knowledge from your knowledge graph. The knowledge graph is called the Matrix. 

	   Use this function to query the Matrix for potentially relevant information regarding an entity 
           or entity of interest 

	   Provide the query in simple narrative/textual form 

           Use this to search if you think you do not know something, to try get an answer before telling the user
           you do no know! 
	   ` ,
	name        : "retrieve_declarative_knowledge" ,
	parameters  : { query : "string" }  ,
	fn          : async (ops : any) => {
	    let {query} = ops.params ;
	    let result = await common.tes.localhost.dev.matrix._search_for_knowledge(query, {limit : 20});
	    return result
	} ,
	return_type : "any"
    },
    


    {
	enabled : false, 
	description : "use the javascript interpreter" ,
	name        : "evaluate_javascript" ,
	parameters  : { input : "string" }  ,
	fn          : async (ops : any) => {
	    let {input} = ops.params
	    let result = eval(input)
	    return result 
	} ,
	return_type : "any"
    },

    {
	enabled : true, 	
	description : `
Displays code to the user interface. Use this when the user requests to see code.
The code parameter is the string representing the code, and the language parameter is the coding language 

The following languages are supported:

json
typescript
javascript
python
html
css
markdown
sh
golang
rust
swift


	`,
	name        : "display_code" ,
	parameters  : { code : "string" , language : "string" }  ,
	fn : async ( ops :any) => {
	    
	    let {event,log } = ops.util ;
	    
	    log(`got params:`) ; log(ops.params); 
	    
	    let {code, language } = ops.params ; 
	    
	    
	    let code_params = {code, mode : language} 
	    event({'type' : 'code_update' , code_params}); 
	    return "done" 
	}  , 
	return_type : "any"
    },

    

    {
	enabled : true, 	
	description : `
 Renders HTML to the user interface. Use this when the user requests to view rendered HTML. The parameter html is an html string that will be rendered. This must be an html string that contain the DOM content that should be rendered` , 
	name        : "display_html" ,
	parameters  : { html : "string" }, 
	fn : async ( ops :any) => {
	    let {html } = ops.params ;
	    let {event } = ops.util ; 
	    event({'type' : 'html_update' , html }); 
	    return "done" 
	}  , 
	return_type : "any"
    },





    
    {
	enabled : true	, 
	description : `
The workspace is a toplevel nested object named workspace which exists within the javascript environment.
You update the workspace by providing javascript code to this function.
The code should directly provide the necessary manipulations to the workspace, and will be evaluated.
After that, the user will automatically see the updated changes. 
	`,
	name        : "update_workspace" ,
	parameters  : { code : "string" }  ,
	fn          : async (ops : any) => {
	    
	    let {code } = ops.params ;
	    let {event , log} = ops.util;
	    
	    log(`Running this code:`); log(code); 
	    let result = window.eval(code)
	    // update the workspace UI here
	    event({'type' : 'workspace_update' })
	    return result 
	} ,
	return_type : "any"
    },

    
    {
	enabled : true	, 	
	description : `
Utility function that helps to accumulate a block of text from the user. Only call this function if you need to accumulate a block of text that will be passed to another function for input. Finishes accumulating text when the user says the word finished. When you call this function please give the user some helpful instructions, including the keyword to complete the accumulation (unless you have already told them this earlier in the conversation.

Please note: A subfunction runs to accumulate the users text until they say finished and only then is it routed back to you. Thus when you get any text back from the user that is the completed accumulated text and you can assume the user is done. 
` , 
	name        : "accumulate_text" ,
	parameters  : {  user_instructions : "string" }  ,
	fn          : async (ops : any) => {

	    
	    let {get_user_data, feedback, user_output, log} = ops.util;
	    feedback.activated()
	    await user_output(ops.params.user_instructions || "") ; 
	    
	    let text = [ ] ; 
	    let chunk = await get_user_data() ;

	    let clean = function(s:string){
		return s.toLowerCase().trim().replace(".","") 
	    }	


	    while (clean(chunk) != "finished" ) {
		
		if (clean(chunk) == "cancel" ) {
		    return "User cancelled the text accumulation" 
		}
		
		text.push(chunk)
		feedback.ok()
		chunk = await get_user_data() ;
	    }

	    feedback.success() ; 

	    return text.join("\n") 
	} ,
	return_type : "any"
    },
    {
	enabled : true	, 	
	description : "logs data to the console" , 
	name        : "console_log" ,
	parameters  : {  data : "any" }  ,
	fn          : async (ops : any) => {
	    console.log(ops.params.data)
	    return "console data logged" 
	} ,
	return_type : "string"
    },


    {
	enabled : true	, 	
	description : `
           Retrieves initialization instructions from the database 
           Call this function to initialize your session with the user     
           Perform next steps based on what is returned 
	`, 
	name        : "initialize" ,
	parameters  :  null, 
	fn          : async (ops : any) => {
	    let {log} = ops.util ;

	    let query = "select * from cortex where type = 'init'" ; 
	    log(`Surreal QL: \n${query}`); 
	    let response = await fbu.surreal_query({query }) as any; 
	    log(`Got response`)
	    log(response) 
	    try {
		return response?.data?.result?.result
		
	    }	catch (error : any) {
		
		return `Received error: ${JSON.stringify(error)}`
	    }
	},
	return_type : "any"
    },


    
    {
	enabled : true	, 	
	description : `
	Universal gateway for accessing the database. This function lets you provide a SURREAL QL Query that will be run on the remote database.

	There is a logs table that stores user logs (schemaless)
	There is a cortex table that you can use for your own purposes (long term memory, other use cases)

        Note: The query parameter can optionally include variable references using the $ syntax ($varname).
              If you use variables in the query, you must pass the variable values as  additional parameters in the function_args array !

        For example, the following would be a valid function call output to store a message:
        {
           function_name: "access_database_with_surreal_ql" ,
           function_args: ["query" , "sql query with var... $msg", "msg" , "the message here" ...] 
        }
        

	`, 
	name        : "access_database_with_surreal_ql" ,
	parameters  :  {
	    query : "string" ,
	}  ,
	fn          : async (ops : any) => {
	    let {query} = ops.params ;
	    let {log} = ops.util ;
	    
	    log(`Surreal QL: \n${query}`); 
	    let response = await fbu.surreal_query({query, variables : ops.params }) as any; 
	    log(`Got response`)
	    log(response) 
	    try {
		return response?.data?.result?.result
		
	    }	catch (error : any) {
		
		return `Received error: ${JSON.stringify(error)}`
	    }
	},
	return_type : "string"
    },


    {
	enabled: true,
	description: `
Creates a Call Chain Template by using a specialized LLM to design the template structure.

Simply describe what you want the template to do in natural language, and this function
will generate a properly structured template with the correct calls, parameters, and references.

The template will be stored in CortexRAM and its id returned. You can then use save_call_chain_template
to persist it to the database, or run_call_chain_template to test it.

Do not specify the template name or params_schema, this function will handle it on its own. Just use natural language. 

Parameters:
- description (string): Natural language description of what the template should do
  Example: "Create a template that takes text input, computes its embedding, and stores both in the logs table"
	`,
	name: "create_call_chain_template",
	parameters: {
	    description: "string"
	},
	fn: async (ops: any) => {
	    const { description } = ops.params
	    const { log, set_var, run_structured_completion, build_system_message, cortex_functions } = ops.util

	    log(`Creating call chain template from description: ${description}`)

	    // Define the Zod schema for template structure
	    // Using z.union([z.record(z.string()), z.null()]) pattern from cortex.ts FunctionCallObject
	    const TemplateSchema = z.object({
		name: z.string().describe("Unique identifier for the template, snake_case"),
		description: z.string().describe("Clear description of what the template does"),
		params_schema: z.union([z.record(z.string()), z.null()]).describe("Map of parameter names to types, or null if no params"),
		calls: z.array(z.object({
		    name: z.string(),
		    parameters: z.union([z.record(z.string()), z.null()])
		})),
		return_indices: z.array(z.number())
	    })

	    // Build output format documentation
	    const outputFormatTypes = `
type CallChainTemplate = {
    name: string,              // Unique template name (snake_case)
    description: string,       // What the template does
    params_schema: Record<string, string>,  // Parameter names -> types
    calls: FunctionCall[],     // Sequence of calls to execute
    return_indices: number[]   // Which results to return
}

type FunctionCall = {
    name: string,
    parameters: Record<string, any> | null
}
`

	    const outputFormatExamples = `
[Example] Template to compute embedding and store in database:
{
    name: "embed_and_store",
    description: "Computes embedding for text and stores both in logs table",
    params_schema: { "text": "string", "category": "string" },
    calls: [
        { name: "compute_embedding", parameters: { text: "&text" } },
        { name: "access_database_with_surreal_ql", parameters: { query: "INSERT INTO logs { text: '&text', category: '&category', embedding: $0 }" } }
    ],
    return_indices: [1]
}
`

	    // Build system message with function awareness
	    const system_msg = build_system_message({
		sections: ['intro', 'templateCallChains', 'outputFormat', 'functions', 'responseGuidance'],
		sectionArgs: {
		    intro: ['TemplateBuilder'],
		    outputFormat: [outputFormatTypes, outputFormatExamples],
		    functions: [cortex_functions],
		    responseGuidance: ['Create a valid call chain template based on the user description. Use only functions from the available list.']
		}
	    })

	    // Run structured completion
	    const template = await run_structured_completion({
		schema: TemplateSchema,
		schema_name: 'CallChainTemplate',
		messages: [
		    { role: 'system', content: system_msg },
		    { role: 'user', content: description }
		]
	    })

	    log(`Template created: ${template.name}`)

	    // Store in CortexRAM
	    const id = await set_var(template)
	    log(`Template stored in CortexRAM with id: ${id}`)

	    return `@${id}` 
	},
	return_type: "object"
    },

    {
	enabled: true,
	description: `
Saves a Call Chain Template to the database.

Accepts either:
1. A CortexRAM reference (string starting with @) pointing to a template created by create_call_chain_template
2. A full template object with: name, description, params_schema, calls, return_indices

The template will be saved with an embedding computed from name + description for semantic search.

Parameters:
- template: Either a CortexRAM reference string (e.g., "@abc123") OR a template object
	`,
	name: "save_call_chain_template",
	parameters: {
	    template: "object"
	},
	fn: async (ops: any) => {
	    
	    const { template } = ops.params;
	    const { log, get_embedding } = ops.util;

	    const { name, description, params_schema, calls, return_indices } = template;

	    log(`Saving call chain template: ${name}`);

	    // Compute embedding for semantic search
	    const embeddingText = `${name} ${description}`;
	    log(`Computing embedding for: ${embeddingText}`);
	    const embedding = await get_embedding(embeddingText);

	    const query = `
            INSERT INTO cortex_call_chain_templates {
                name: $name,
                description: $description,
                params_schema: $params_schema,
                calls: $calls,
                return_indices: $return_indices,
                embedding: $embedding,
            }
        `;

	    const response = await fbu.surreal_query({
		query,
		variables: { name, description, params_schema, calls, return_indices, embedding }
	    }) as any;

	    log(`Template saved successfully`);
	    return {
		success: true,
		name,
		message: `Template "${name}" saved to database with embedding`
	    };
	},
	return_type: "object"
    },

    {
	enabled: true,
	description: `
Retrieves a Call Chain Template by name from the database.

Returns the template object with its calls array and parameter schema.
	`,
	name: "get_call_chain_template",
	parameters: {
	    name: "string"
	},
	fn: async (ops: any) => {
	    const { name } = ops.params;
	    const { log } = ops.util;

	    log(`Fetching call chain template: ${name}`);

	    const query = `
            SELECT * FROM cortex_call_chain_templates
            WHERE name = $name
            LIMIT 1
        `;

	    const response = await fbu.surreal_query({
		query,
		variables: { name }
	    }) as any;

	    const templates = response?.data?.result?.result;

	    if (!templates || templates.length === 0) {
		throw new Error(`Template "${name}" not found`);
	    }

	    return templates[0].result[0];
	},
	return_type: "object"
    },

    {
	enabled: true,
	description: `
Lists all available Call Chain Templates from the database.

Returns an array of template objects showing their names and descriptions.
Useful for discovering which templates are available to run.
	`,
	name: "list_call_chain_templates",
	parameters: null,
	fn: async (ops: any) => {
	    const { log } = ops.util;

	    log(`Listing all call chain templates`);

	    const query = `
            SELECT name, description, params_schema
            FROM cortex_call_chain_templates
        `;

	    const response = await fbu.surreal_query({ query }) as any;

	    return response?.data?.result?.result || [];
	},
	return_type: "array"
    },

    {
	enabled: true,
	description: `
Executes a Call Chain Template.

Simply describe in natural language which template you want to run and what arguments to use.
The function will extract the structured parameters internally using the conversation context.

For example, if the user says "run the embed_and_store template with text 'hello world' and category 'test'",
just forward that request to this function via the description parameter.

Parameters:
- description: string - Natural language description of which template to run and with what arguments
	`,
	name: "run_call_chain_template",
	parameters: {
	    description: "string"
	},
	fn: async (ops: any) => {
	    const { description } = ops.params;
	    const {
		log,
		handle_function_call,
		run_cortex_output,
		rerun_llm_with_output_format
	    } = ops.util;

	    log(`run_call_chain_template called with description: ${description}`);

	    // Step 1: Define schema for extracting template_name and template_args
	    const TemplateRunSchema = z.object({
		template_name: z.string(),
		template_args: z.union([z.record(z.string()), z.null()])
	    });

	    // Step 2: Use rerun_llm_with_output_format to extract structured parameters
	    log(`Extracting structured parameters from conversation context`);
	    const extracted = await rerun_llm_with_output_format({
		schema: TemplateRunSchema,
		schema_name: 'TemplateRunParams',
		sectionOverrides: {
		    functions: null,  // Exclude functions to prevent recursion
		    responseGuidance: [`
Extract the template name and arguments from the user's request.
Return the template_name as a string and template_args as an object with the parameter values.
For example, if the user wants to run "embed_and_store" with text="hello" and category="test",
return: { template_name: "embed_and_store", template_args: { text: "hello", category: "test" } }
`]
		}
	    });

	    const { template_name, template_args } = extracted;
	    log(`Extracted template_name: ${template_name}`);
	    log(`Extracted template_args: ${JSON.stringify(template_args)}`);

	    // Step 3: Fetch the template
	    const template_result = await handle_function_call({
		name: "get_call_chain_template",
		parameters: { name: template_name }
	    });

	    if (template_result.error) {
		throw new Error(`Failed to fetch template: ${template_result.error}`);
	    }

	    const template = template_result.result;
	    log(`Retrieved template: ${template.name}`);

	    // Step 4: Resolve & placeholders in calls array
	    const resolved_calls = cu.resolve_call_chain_template_args(
		template.calls,
		template_args || {}
	    );

	    log(`Resolved calls: ${JSON.stringify(resolved_calls)}`);

	    // Step 5: Build CortexOutput
	    const cortex_output = {
		thoughts: `Executing call chain template: ${template_name}`,
		calls: resolved_calls,
		return_indeces: template.return_indices || []
	    };

	    // Step 6: Execute via run_cortex_output
	    const execution_result = await run_cortex_output(cortex_output);

	    log(`Template execution completed`);

	    // Step 7: Return the result
	    if (execution_result.error) {
		throw new Error(`Template execution failed: ${execution_result.error}`);
	    }

	    return execution_result.result;
	},
	return_type: "any"
    },

    {
	enabled: true,
	description: "Resets the JavaScript execution environment, clearing all variables and state. The iframe persists but all JavaScript context is cleared. Use this when you need a fresh start.",
	name: "reset_sandbox",
	parameters: null,
	signature: "async reset_sandbox(): Promise<string>",
	fn: async (ops: any) => {
	    const { log } = ops.util;
	    log("Resetting sandbox environment");

	    // Dynamically import resetSandbox
	    const { resetSandbox } = await import("./src/sandbox");
	    await resetSandbox();

	    return "Sandbox environment reset successfully";
	},
	return_type: "string"
    }

]
