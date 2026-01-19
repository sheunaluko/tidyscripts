'use client' ;

import * as c from "../src/cortex"  ;
//import jdoc from "../../../../docs/jdoc.json"
import * as fbu from "../../../src/firebase_utils"
import * as fnu from "../src/fn_util"
import * as tsw from "tidyscripts_web"
import * as bashr from "../../../src/bashr/index";
import { create_cortex_functions_from_mcp_server } from "./mcp_adapter" ;
import { z } from "zod" 

// Bash client state
var BASH_CLIENT: any = null;


const vi = tsw.util.voice_interface ;
const {common} = tsw;
const {debug} =  common.util ;
declare var window : any ;

// MCP server configuration
const MCP_SERVER_URL = "http://localhost:8003/mcp";

/**
 * Defines the cortex agent used in the Cortex UI 
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
        enabled: true,
        description: "Connect to the bash websocket server. The bash websocket server exposes an API for running bash commands on machine.",
        name: "connect_to_bash_server",
        parameters: null,
        fn: async (ops: any) => {
            BASH_CLIENT = await bashr.connect_client();
            return "done";
        },
        return_type: "string"
    },

    {
        enabled: true,
        description: "Runs a bash command using the bash server. Need to connect first. You can then provide any unix bash command to be executed, in order to accomplish the desired task. Please be careful and do not issue any dangerous commands that could harm the underlying system.",
        name: "run_bash_command",
        parameters: { command: "string" },
        fn: async (ops: any) => {
            return await BASH_CLIENT.runCommand(ops.params.command);
        },
        return_type: "string"
    },

    
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

	This function takes an input named text and computes the vector embedding of it.
	Returns the embedding as an array of numbers.

	` ,
	name        : "compute_embedding" ,
	parameters  : { text : "string" }   ,
	fn          : async (ops : any) => {
	    let { log  } = ops.util ;
	    let { text } = ops.params ;
	    log(`Retrieved request to compute embedding of: ${text}`) ;
	    let embedding = await tsw.common.apis.ailand.get_cloud_embedding(text) ;
	    log(`Got embedding result`)
	    debug.add("embedding" , embedding) ;
	    return embedding ;
	} ,
	return_type : "array"
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
Utility function that helps to accumulate a block of text from the user. Only call this function if you need to accumulate a block of text that will be passed to another function for input. Finishes accumulating text when the user says the word finished. When you call this function please give the user some helpful instructions, including the keyword to complete the accumulation (unless you have already told them this earlier in the conversation.

Please note: A subfunction runs to accumulate the users text until they say finished and only then is it routed back to you. Thus when you get any text back from the user that is the completed accumulated text and you can assume the user is done.

In order to retrieve the result you must RETURN the result of this function 

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

	There is a logs table that stores user logs
	There is a cortex table that you can use for your own purposes (long term memory, other use cases)

        Note: The query parameter can optionally include variable references using the $ syntax ($varname).
              If you use variables in the query, you must pass the variable values in the variables fields (as a key value map) 

	`, 
	name        : "access_database_with_surreal_ql" ,
	parameters  :  {
	    query : "string" ,
	    variables : "object" 
	}  ,
	fn          : async (ops : any) => {
	    let {query, variables} = ops.params ;
	    let {log} = ops.util ;
	    
	    log(`Surreal QL: \n${query}`); 
	    let response = await fbu.surreal_query({query, variables }) as any; 
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


    // ============================================================
    // DYNAMIC FUNCTIONS - Reusable JavaScript functions in sandbox
    // ============================================================

    {
	enabled: true,
	description: `
Creates and saves a dynamic function to the database.

Dynamic functions are full JavaScript async functions that can be executed in the sandbox.
They have access to all cortex functions via closure and provide more power than templates.

Parameters:
- name (string): Unique identifier for the function (snake_case)
- description (string): Clear description of what the function does
- code (string): Full async function code (e.g., "async function my_func(args) { ... }")
- params_schema (object): Map of parameter names to types (e.g., {"text": "string", "count": "number"})

Example:
{
    name: "embed_and_store",
    description: "Computes embedding for text and stores in database",
    code: "async function embed_and_store(args) { const {text, category} = args; const emb = await compute_embedding({text}); return await access_database_with_surreal_ql({query: 'INSERT INTO logs {text: $text, category: $category, embedding: $emb}', variables: {text, category, emb}}); }",
    params_schema: {"text": "string", "category": "string"}
}
	`,
	name: "create_dynamic_function",
	parameters: {
	    name: "string",
	    description: "string",
	    code: "string",
	    params_schema: "object"
	},
	fn: async (ops: any) => {
	    const { name, description, code, params_schema } = ops.params;
	    const { log, get_embedding } = ops.util;

	    log(`Creating dynamic function: ${name}`);

	    // Validate code with eval (syntax check)
	    try {
		eval(code);
		log(`Code validation passed for ${name}`);
	    } catch (error: any) {
		throw new Error(`Invalid function code syntax: ${error.message}`);
	    }

	    // Compute embedding for semantic search
	    const embeddingText = `${name} ${description}`;
	    log(`Computing embedding for: ${embeddingText}`);
	    const embedding = await get_embedding(embeddingText);

	    // Insert into database
	    const query = `
            INSERT INTO cortex_dynamic_functions {
                type: 'dynamic_function',
                name: $name,
                description: $description,
                code: $code,
                params_schema: $params_schema,
                embedding: $embedding,
                created_at: time::now(),
                updated_at: time::now()
            }
        `;

	    await fbu.surreal_query({
		query,
		variables: { name, description, code, params_schema, embedding }
	    });

	    log(`Dynamic function "${name}" created successfully`);
	    return {
		success: true,
		name,
		message: `Dynamic function "${name}" created and saved to database`
	    };
	},
	return_type: "object"
    },

    {
	enabled: true,
	description: `
Loads a dynamic function from the database by name.

Returns the complete function object including code, description, and params_schema.

Parameters:
- name (string): The name of the function to load
	`,
	name: "load_dynamic_function",
	parameters: {
	    name: "string"
	},
	fn: async (ops: any) => {
	    const { name } = ops.params;
	    const { log } = ops.util;

	    log(`Loading dynamic function: ${name}`);

	    const query = `
            SELECT * FROM cortex_dynamic_functions
            WHERE name = $name
            LIMIT 1
        `;

	    const response = await fbu.surreal_query({
		query,
		variables: { name }
	    }) as any;

	    const functions = response?.data?.result?.result;

	    if (!functions || functions.length === 0 || !functions[0].result || functions[0].result.length === 0) {
		throw new Error(`Dynamic function "${name}" not found`);
	    }

	    const func = functions[0].result[0];
	    log(`Dynamic function "${name}" loaded successfully`);
	    return func;
	},
	return_type: "object"
    },

    {
	enabled: true,
	description: `
Lists all available dynamic functions from the database.

Returns an array of function summaries with name, description, and params_schema.
	`,
	name: "list_dynamic_functions",
	parameters: null,
	fn: async (ops: any) => {
	    const { log } = ops.util;

	    log(`Listing all dynamic functions`);

	    const query = `
            SELECT name, description, params_schema
            FROM cortex_dynamic_functions
        `;

	    const response = await fbu.surreal_query({ query }) as any;

	    const functions = response?.data?.result?.result;

	    if (!functions || functions.length === 0) {
		return [];
	    }

	    return functions[0].result || [];
	},
	return_type: "array"
    },

    {
	enabled: true,
	description: `
Updates an existing dynamic function in the database.

You can update the code, description, and/or params_schema. Only provide fields you want to update.

Parameters:
- name (string): The name of the function to update
- code (string, optional): New function code
- description (string, optional): New description
- params_schema (object, optional): New params schema
	`,
	name: "update_dynamic_function",
	parameters: {
	    name: "string",
	    code: "string",
	    description: "string",
	    params_schema: "object"
	},
	fn: async (ops: any) => {
	    const { name, code, description, params_schema } = ops.params;
	    const { log, get_embedding } = ops.util;

	    log(`Updating dynamic function: ${name}`);

	    // Build SET clause dynamically based on provided fields
	    const updates: string[] = [];
	    const variables: any = { name };

	    if (code !== undefined) {
		// Validate new code
		try {
		    eval(code);
		    log(`Code validation passed for updated ${name}`);
		} catch (error: any) {
		    throw new Error(`Invalid function code syntax: ${error.message}`);
		}
		updates.push('code = $code');
		variables.code = code;
	    }

	    if (description !== undefined) {
		updates.push('description = $description');
		variables.description = description;

		// Recompute embedding if description changed
		const embeddingText = `${name} ${description}`;
		log(`Recomputing embedding for: ${embeddingText}`);
		const embedding = await get_embedding(embeddingText);
		updates.push('embedding = $embedding');
		variables.embedding = embedding;
	    }

	    if (params_schema !== undefined) {
		updates.push('params_schema = $params_schema');
		variables.params_schema = params_schema;
	    }

	    if (updates.length === 0) {
		throw new Error('No fields provided to update');
	    }

	    // Always update timestamp
	    updates.push('updated_at = time::now()');

	    const query = `
            UPDATE cortex_dynamic_functions
            SET ${updates.join(', ')}
            WHERE name = $name
        `;

	    await fbu.surreal_query({ query, variables });

	    log(`Dynamic function "${name}" updated successfully`);
	    return {
		success: true,
		name,
		message: `Dynamic function "${name}" updated`
	    };
	},
	return_type: "object"
    },

    {
	enabled: true,
	description: `
Deletes a dynamic function from the database.

Parameters:
- name (string): The name of the function to delete
	`,
	name: "delete_dynamic_function",
	parameters: {
	    name: "string"
	},
	fn: async (ops: any) => {
	    const { name } = ops.params;
	    const { log } = ops.util;

	    log(`Deleting dynamic function: ${name}`);

	    const query = `
            DELETE FROM cortex_dynamic_functions
            WHERE name = $name
        `;

	    await fbu.surreal_query({
		query,
		variables: { name }
	    });

	    log(`Dynamic function "${name}" deleted successfully`);
	    return {
		success: true,
		name,
		message: `Dynamic function "${name}" deleted from database`
	    };
	},
	return_type: "object"
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
