'use client' ;

import * as tsc from "tidyscripts_common"
const { Cortex } = tsc.apis.cortex
import { getExecutor } from "./src/sandbox"
import * as fbu from "../../../src/firebase_utils"
import * as tsw from "tidyscripts_web"
import * as bashr from "../../../src/bashr/index";
import { create_cortex_functions_from_mcp_server } from "./mcp_adapter" ;
import { z } from "zod"
import * as graph_utils from "./graph_utils"
import { test_graph_utils, clear_graph_utils_test } from "./test_graph_utils"

// Bash client state
var BASH_CLIENT: any = null;

// Attach graph_utils to window for debugging
if (typeof window !== 'undefined') {
    (window as any).graph_utils = { ...graph_utils, test_graph_utils, clear_graph_utils_test };
}

const vi = tsw.util.voice_interface ;
const {common} = tsw;
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
export function get_agent(modelName: string = "gpt-5-mini", insightsClient?: any, authInfo?: { isAuthenticated: boolean }) {
    // init cortex with chosen model
    let model = modelName;
    let name  = "coer" ;
    let additional_system_msg = `
    Tidyscripts is the general name for your software architecture.
    ${!authInfo?.isAuthenticated ? `
    IMPORTANT: The user is NOT currently logged in. They should log in to access
    the cloud database backend, sync their data across devices, and customize their
    experience. You can suggest they log in when relevant (e.g., when they ask about
    saving data, accessing the database, or personalizing settings). Use the check_login_status
    function to get current auth details.
    ` : `
    The user is logged in and has full access to cloud storage and the database backend.
    `}
    `;

    let extra_msg = `
    Tidyscripts Ontology of Medicine (TOM) is the name of a medical knowledge graph / database which you have access to.

    When the user asks for information from TOM or from "the medical database", DO NOT PROVIDE information from anywhere else or from
    your memory.
    `;

    let enabled_functions = functions.filter( (f:any)=> (f.enabled == true) ) ;

    // Get web sandbox and utilities
    const sandbox = getExecutor();
    const utilities = {
        get_embedding: tsw.common.apis.ailand.get_cloud_embedding,
        sounds: {
            error: tsw.util.sounds.error,
            activated: tsw.util.sounds.input_ready,
            ok: tsw.util.sounds.proceed,
            success: tsw.util.sounds.success
        }
    };

    let ops   = { model , name, functions : enabled_functions, additional_system_msg, insights: insightsClient, sandbox, utilities  }
    let coer    = new Cortex( ops ) ;
    //
    return coer ;
}

/**
 * Creates a Cortex agent with MCP functions included
 * Asynchronously loads functions from the MCP server
 */
export async function get_agent_with_mcp(modelName: string = "gpt-5-mini", insightsClient?: any, authInfo?: { isAuthenticated: boolean }) {
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

    // Get web sandbox and utilities
    const sandbox = getExecutor();
    const utilities = {
        get_embedding: tsw.common.apis.ailand.get_cloud_embedding,
        sounds: {
            error: tsw.util.sounds.error,
            activated: tsw.util.sounds.input_ready,
            ok: tsw.util.sounds.proceed,
            success: tsw.util.sounds.success
        }
    };

    let ops   = { model , name, functions : all_functions, additional_system_msg, insights: insightsClient, sandbox, utilities  }
    let coer    = new Cortex( ops ) ;
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
	    // debug.add("embedding" , embedding) ;  // Removed - debug system no longer used
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
	   Stores FACTUAL RELATIONSHIPS to your knowledge graph as entity-relation-entity triples.

	   USE THIS FOR: Facts, relationships between things, ontological knowledge
	   - "X created Y", "A is_a B", "P lives_in Q"
	   - Permanent facts that won't change
	   - Things you want to recall via semantic search later

	   DO NOT USE FOR: User logs, conversation history, temporal events, raw text
	   - Use access_database_with_surreal_ql with the 'logs' or 'cortex' table instead

	   Provide an array of triples: [subject, relation, object]

	   Examples:
	   - ["shay", "created", "tidyscripts"]
	   - ["san_francisco", "is_in", "california"]
	   - ["aspirin", "treats", "headache"]

	   The function automatically:
	   - Normalizes IDs (lowercase, underscores)
	   - Computes embeddings for semantic search
	   - Deduplicates (won't re-insert existing items)
	   ` ,
	name        : "store_declarative_knowledge" ,
	parameters  : { triples : "array" }  ,
	fn          : async (ops : any) => {
	    let {triples} = ops.params ;
	    let {log} = ops.util ;
	    log(`Storing ${triples.length} knowledge triples`) ;
	    let result = await graph_utils.store_knowledge(triples);
	    log(`Store result: ${JSON.stringify(result)}`) ;
	    return result
	} ,
	return_type : "any"
    },

    {
	enabled : true,
	description : `
	   Searches your knowledge graph for FACTS and RELATIONSHIPS using semantic similarity.

	   USE THIS FOR: Finding stored facts, relationships, ontological knowledge
	   - "who created tidyscripts" -> finds shay->created->tidyscripts
	   - "what treats headaches" -> finds aspirin->treats->headache
	   - Any conceptual/relational query

	   DO NOT USE FOR: User history, logs, conversation records
	   - Use access_database_with_surreal_ql with the 'logs' table instead

	   Returns entities and relations ranked by semantic similarity to your query.
	   Lower distance = more relevant.

	   IMPORTANT: Search this before telling the user you don't know something!
	   ` ,
	name        : "retrieve_declarative_knowledge" ,
	parameters  : { query : "string", limit : "number" }  ,
	fn          : async (ops : any) => {
	    let {query, limit} = ops.params ;
	    let {log} = ops.util ;
	    limit = limit || 10 ;
	    log(`Searching knowledge graph for: "${query}"`) ;
	    let result = await graph_utils.search_knowledge(query, { limit });
	    let formatted = graph_utils.format_search_results(result) ;
	    log(`Search complete`) ;
	    return formatted
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
Renders HTML to the user interface with support for interactive elements that can store data to workspace.

## Purpose
Renders arbitrary HTML with secure JavaScript execution. Use this to display rich content, interactive elements,
visualizations, or any custom UI components. User interactions can store data to workspace and optionally
trigger your next invocation automatically.

## Parameters
- html: An HTML string containing the content to render. May include inline JavaScript and CSS.

## Interactive HTML - Bridge Functions

Your HTML has access to two special bridge functions:

### 1. store_in_workspace(data)
Stores data to workspace without triggering the agent.

**Usage:**
- data: A plain JavaScript object containing key-value pairs to store
- Data is immediately saved to COR.workspace
- Values persist across agent iterations and are available in the workspace variable
- Dangerous keys (__proto__, constructor, prototype) are automatically filtered for security

### 2. complete_html_interaction(message)
Stores data AND automatically triggers the agent.

**Usage:**
- message (optional): A custom message to send as user input. Defaults to "I'm done interacting with the HTML form"
- Call this to immediately invoke the agent with a message
- The agent will be invoked and can access any workspace data you've stored
- Use this to create automatic workflows after user interaction

## Retrieving Form Data
On your next iteration, access stored data via the workspace variable:

` , 
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
            SELECT name, description, params_schema, id
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
    },

    {
	enabled: true,
	description: `
Checks the current login and storage status. Returns authentication state,
storage mode (local or cloud), and a helpful message about what the user
can do. Use this when the user asks about their account, login status,
data storage, or syncing across devices.
	`,
	name: "check_login_status",
	parameters: null,
	fn: async (ops: any) => {
	    const { log } = ops.util;
	    log("Checking login status");

	    let isAuthenticated = false;
	    let storageMode = 'unknown';
	    let userName = '';

	    try {
		if (typeof window !== 'undefined' && window.getAuth) {
		    const auth = window.getAuth();
		    isAuthenticated = !!auth?.currentUser;
		    if (auth?.currentUser) {
			userName = auth.currentUser.displayName || auth.currentUser.email || '';
		    }
		}
	    } catch {}

	    try {
		const modeKey = 'appdata::cortex_0::__backend_mode__';
		storageMode = (typeof window !== 'undefined' && localStorage.getItem(modeKey)) || 'cloud';
	    } catch {}

	    let message: string;
	    if (isAuthenticated) {
		message = `You are logged in${userName ? ` as ${userName}` : ''} with ${storageMode} storage. Your data syncs across devices.`;
	    } else if (storageMode === 'cloud') {
		message = 'You are not logged in. You are in cloud mode but your data cannot sync until you log in. You can log in via the login button, or switch to local storage if you prefer to use Cortex without an account.';
	    } else {
		message = 'You are using local storage mode. Your data is saved in this browser only and will not sync across devices. You can log in and switch to cloud storage to enable cross-device sync.';
	    }

	    return { isAuthenticated, storageMode, userName, message };
	},
	return_type: "object"
    }

]
