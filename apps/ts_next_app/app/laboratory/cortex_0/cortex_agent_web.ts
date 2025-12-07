'use client' ;

import * as c from "../src/cortex"  ;
//import jdoc from "../../../../docs/jdoc.json"
import * as fbu from "../../../src/firebase_utils"
import * as fnu from "../src/fn_util"
import * as bashr from "../../../src/bashr/index"
import * as tsw from "tidyscripts_web"
import * as fb from "../../../src/firebase" ;
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

   [ ]
   Next - claude should make another function called save_function_template, which will take the reference to a function template (explaining that it must be tested first and successful testing produces the referencable id) and actually stores it into the cortex table with type=function_template and with template=the_actual_template_object

   [ ]
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

    You have access to MCP (Model Context Protocol) tools from the Tidyscripts MCP server, including:
    - Query Tidyscripts codebase
    - Search SurrealQL documentation
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


export async function get_practice_question(ops : any) {
    let {test_num, question_num} = ops; 
    let qid = `t${test_num}_q${question_num}` ; 
    return (await fb.fu.get_user_doc({ path: [qid] , app_id : "usync" }))
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



export async function tidyscripts_log( ops : any ) {
    let {text, user_initiation_string , path}  = ops;
    let tokenized_text = fnu.tokenize_text(text) ; 
    let app_id = "tidyscripts" ; 
    let date_o = new Date()
    let data = {
	tokenized_text  , 
	user_initiation_string ,
	time_string  : date_o.toString() , 
	time_created : fbu.get_firestore_timestamp_from_date(date_o)  
    }
    await fbu.store_user_collection({app_id, path, data})
} 



export async function main_stream_log( ops : any ) {
    let {text, user_initiation_string}  = ops;

    let tokenized_text = fnu.tokenize_text(text) ; 
    let path = ["logs", "main_stream"]
    let app_id = "tidyscripts"
    let data = {
	tokenized_text  , 
	user_initiation_string , 
	time_created : fbu.get_firestore_timestamp_from_date(new Date()) 
    }
    await fbu.store_user_collection({app_id, path, data})
} 


var BASH_CLIENT : any = null ;


const functions = [
    {
	enabled : true ,
	description : `Formats a string based on the provided template and arguments. Returns the string.
Uses {key} placeholders in the template which get replaced with values from args.
Example: format_string("Hello {name}!", {name: "World"}) => "Hello World!"`,
	name : "format_string" ,
	parameters : { string_template : 'string' , args : "object" } ,
	fn  : async ( ops : any ) => {
	    const { string_template, args } = ops.params
	    const { log } = ops.util

	    log(`Formatting string template with args: ${JSON.stringify(args)}`)

	    let result = string_template
	    for (const [key, value] of Object.entries(args || {})) {
		result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
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
	      log(`user response: ${response}`) ;
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
           Loads the system instructions. After loading them say: cool instructions bro
	` ,
	name        : "load_system_instructions" ,
	parameters  : null ,
	fn          : async (ops : any) => {
	    let query = `select * from cortex where type = "system_instruction"`
	    let response = await fbu.surreal_query({query }) as any ;
	    return response?.data?.result?.result 
	} ,
	return_type : "any"
    },
    


    {
	enabled : false, 
	description : "Retrieve a random fact to test the user" ,
	name        : "retrieve_random_medical_fact" ,
	parameters  : null, 
	fn          : async (ops : any) => {
	    let result = await common.tes.localhost.dev.tom.get_random_study_record()
	    debug.add('random_fact' , result)  ; 
	    return result  
	} ,
	return_type : "object"
    },

    {
	enabled : false, 
	description : "Search the TOM database for matching medical entities given a string" ,
	name        : "search_tom_for_entities" ,
	parameters  : { query : "string" }   ,
	fn          : async (ops : any) => {
	    let {query}  = ops.params; 
	    let tmp = await common.tes.cloud.node.tom.entity_vector_search(query, 6) as any ;
	    let result = tmp.result[0] ; 
	    debug.add('evs_result' , result)  ; 
	    return result  
	} ,
	return_type : "object"
    },

    {
	enabled : false , 
	description : "Retrieve all defined relationships (information) for a specific entity in TOM. You must ensure that the query string provided is an exact match of the entity id from TOM, which you can find by using the search_tom_for_entities function" ,
	name        : "get_information_for_entity" ,
	parameters  : { query : "string" }   ,
	fn          : async (ops : any) => {
	    let {query}  = ops.params; 
	    let tmp = await common.tes.cloud.node.tom.all_relationships_for_entity(query) as any ;
	    debug.add('er_result' , tmp)  ; 
	    return tmp   
	} ,
	return_type : "object"
    },
    

    
    
    {
	enabled : false, 
	description : "Connect to the bash websocket server. The bash websocket server exposes an API for running bash commands on machine." ,
	name        : "connect_to_bash_server" ,
	parameters  : null  ,
	fn          : async (ops : any) => {
	    BASH_CLIENT = await bashr.connect_client()
	    return "done" 
	} ,
	return_type : "string"
    },
    
    {
	enabled : false, 
	description : "Runs a bash command using the bash server. Need to connect first. You can then provide any unix bash command to be executed, in order to accomplish the desired task. Please be careful and do not issue any dangerous commands that could harm the underlying system." ,
	name        : "run_bash_command" ,
	parameters  : { command : "string" }  ,
	fn          : async (ops : any) => {
	    return await BASH_CLIENT.runCommand(ops.params.command) 
	} ,
	return_type : "string"
    },

    
    {
	enabled : true, 
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
	enabled : false, 	
	description : `Retrieves a practice question give the test number and question number. Must pass the question_num and test_num parameters` , 
	name        : "get_practice_question" ,
	parameters  : { test_num : "number", question_num : "number" }, 
	fn : async ( ops :any) => {
	    return await get_practice_question(ops.params) 
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
	enabled : false, 
	description : `
Creates a new Tidyscripts log entry for the user. 

1. Tidyscripts logs are stored inside "collections" in the database. Each log has a name and a path 
2. All log names are in snake_case  
3. When the user requests to store a log, you should first call the "get_user_collections" function to determines if the log already exists 
4. If it does not then create it using the "initialize_user_log" function, then proceed 
5. If it does exist then proceed 
6. You will need to first accumulate text from the user before passing that text to this function. 
7. In addition, you should pass the user_initiation_string, which is the original text the user provided that led to the initiation of the log 
8. Finally, you should provide the log_path which is a forward slash delimited string 
	` , 
	name        : "create_user_log_entry" ,
	parameters  : {  text : "string" , user_initiation_string : "string" , log_path : "string" }  ,
	fn          : async (ops : any) => {
	    let { text , user_initiation_string ,log_path }  = ops.params ; 	    
	    ops.util.log(ops)
	    let path = log_path.split("/").filter(Boolean) ;
	    if ( path[0] != "tidyscripts" ) {
		return "please make sure the path starts with tidyscripts and is separated by forward slashes" 
	    }

	    path = path.splice(1)

	    await tidyscripts_log( {text, user_initiation_string, path }) 
	    return "done" 
	} ,
	return_type : "string"
    },
    {
	enabled : false	, 	
	description : "Initializes a user log/collection. Takes the name of the log, in snake_case" ,
	name : "initialize_user_log" ,
	parameters : { name : "string"  } ,
	fn : async ( ops : any ) =>  {
	    let {name} = ops ;	    let log = ops.util.log
	    log(`Request to create log: ${name}`)
	    let text = `creating the ${name} log` ;
	    let path = ["logs" , name ]  ;
	    let user_initiation_string = null ;

	    await tidyscripts_log({text,path , user_initiation_string}) ;  //auto adds app-id
	    return "done" 
	},
	return_type : "string" 
	
    }, 

    {
	enabled : false, 
	description : "Retrieves existing Tidyscripts database collections" , 
	name        : "get_user_collections" ,
	parameters  : null  ,
	fn          : async (ops : any) => {
	    return await fnu.get_tidyscripts_collections() ; 
	} ,
	return_type : "string"
    },
    {
	enabled : false,  
	description : "Searches a particular log/collection. Provide the search terms as a comma separated string like term1,term2,term3,etc. " , 
	name        : "search_user_log" ,
	parameters  : {  name : "string" , search_terms : "string" }  ,
	fn          : async (ops : any) => {
	    let {name, search_terms} = ops ; let {log} = ops.util ; 
	    log('searching') 
	    log(ops) 
	    return fbu.search_user_collection("tidyscripts", ["logs", name ] , search_terms.split(",").map((y:string)=>y.trim()).filter(Boolean)) 
	} ,
	return_type : "any"
    },

    {
	enabled : false,
	description : "Retrieves an entire log/collection. You should opt to search instead of retrieving the entire collection unless the user specifically has requested to retrieve the whole collection" ,
	name        : "get_whole_user_collection" ,
	parameters  : {  name : "string" } ,
	fn          : async (ops : any) => {
	    let {name} = ops.params ;
	    return fbu.get_user_collection({app_id : "tidyscripts", path : ["logs", name ]})
	} ,
	return_type : "any"
    },

    /*

       A function template has the following structure:
       {
            name : string,
            parameters : {
               text : string
            },
            function_name: string ,
            function_args : string ,
       }

       Once it is called, it uses its parameters to build a "resolved" function_args object
       Then, a simple handle_function_call is done with the function_name and the
       Resolved args

       A function template uses a & sign to indicate a variable placeholder

       For example :
       {

       name : 'store_exercise_log' ,
       parameters : { text : 'string' } ,
       function_name : 'access_database_with_surreal_ql' ,
       function_args :  [ "query" , "insert into logs { message : &text , type : 'exercise' } "  ]
       }

     */

    {
	enabled : false,
	description : `
           Runs a function_template by using its name and arguments
	` ,
	name        : "run_function_template" ,
	parameters  : {
		    template_name : "string" ,
		    template_args : "array"
	} ,

	fn          : async (ops : any) => {
	    let {template_name, template_args} = ops.params ;
	    let {
		log,
		collect_args,
		handle_function_call,
		get_var,
	    } = ops.util ;

	    log(`Request to run function template: ${template_name}, with args`) ;
	    log(template_args) ;

	    //now we need to actually have the function template object !
	    log(`Attempting to get template object: ${template_name}`)  ;
	    let {error,result}  = await handle_function_call({
		name: "get_function_template_object_test",
		parameters: { name : template_name }
	    })

	    if (error) { throw(error) }

	    //if it ran well then result should contain the id of the template
	    log(`Retrieved template id : ${result}`) ;
	    //and we can get a ref to it like this:
	    let template = get_var(result) ; debug.add("template", template) ;

	    //destructure out
	    let { name, function_args, function_name } = template ;

	    //build the template args dic
	    log(`Collecting args`) ;
	    let arg_dic = collect_args(template_args) ;

	    //resolve the function_args
	    let resolved_function_args = cu.resolve_function_args_array( function_args, arg_dic ) ;
	    let collected_function_args = collect_args(resolved_function_args) ;

	    //run it
	    debug.add('template_run_info' , {
		template,
		function_args,
		resolved_function_args,
		function_name,
		collected_function_args ,
		arg_dic
	    })

	    /*
	    let template_result =  await handle_function_call({
		name : function_name,
		parameters : collected_function_args
	    });
	    */

	    return false
	} ,
	return_type : "any"
    },

    {
	enabled : false,
	description : `
Execute multiple functions serially in a single step.
Later functions can reference the results of earlier functions using $N syntax.

Parameters:
- calls: array of function call objects, each with:
  - function_name: string (name of function to call)
  - function_args: array of strings (same format as Cortex outputs)
- return_indices: (optional) array of numbers specifying which results to return
  - If omitted, returns all results
  - Example: [0, 2] returns only results from 1st and 3rd functions

Reference syntax in function_args:
- Use "$0" to reference result from first function (index 0)
- Use "$1" to reference result from second function (index 1)
- Use "@hash_id" to reference CortexRAM variables (auto-resolved by collect_args)
- etc.

Example:
calls: [
  {
    function_name: "compute_embedding",
    function_args: ["text", "hello world"]
  },
  {
    function_name: "array_nth_value",
    function_args: ["a", "$0", "n", "5"]
  }
]

The second call uses "$0" which will be replaced with the result from compute_embedding.

Returns: Array of results (all or filtered by return_indices)
Each result: { function_name, error, result, execution_time_ms }
	`,
	name        : "multicall",
	parameters  : {
	    calls: "array",             // Array of {function_name, function_args: string[]}
	    return_indices: "array"     // Optional array of indices to return
	},
	fn          : async (ops : any) => {
	    var { calls, return_indices } = ops.params;
	    const { handle_function_call, collect_args, log } = ops.util;


	    log(`Executing ${calls.length} functions serially`);

	    const results: any[] = [];
	    const startTime = Date.now();

	    // Helper to resolve $N references in function_args
	    const resolve_result_references = (args: any[]): any[] => {
		return args.map(arg => {
		    // Check if arg is a result reference like "$0", "$1", etc.
		    if (typeof arg === 'string' && arg.match(/^\$\d+$/)) {
			const index = parseInt(arg.substring(1));
			if (index >= 0 && index < results.length) {
			    log(`Resolving ${arg} to result at index ${index}`);
			    //return result
			    return results[index].result;
			} else {
			    log(`Warning: ${arg} references invalid index`);
			    return arg;  // Return as-is if invalid
			}
		    }
		    return arg;
		});
	    };

	    // Execute functions serially
	    for (let i = 0; i < calls.length; i++) {
		const call = calls[i];
		const callStartTime = Date.now();

		log(`Executing function ${i + 1}/${calls.length}: ${call.function_name}`);

		// Resolve any $N references in function_args
		const resolved_args = resolve_result_references(call.function_args);

		// Use collect_args to convert string array to parameters object
		// This also handles @identifier CortexRAM references automatically
		const parameters = collect_args(resolved_args);

		// Call the function
		const result = await handle_function_call({
		    name: call.function_name,
		    parameters: parameters
		});

		const functionResult = {
		    function_name: call.function_name,
		    error: result.error || false,
		    result: result.result,
		    execution_time_ms: Date.now() - callStartTime
		};

		results.push(functionResult);

		// Fail fast on error
		if (result.error) {
		    const totalTime = Date.now() - startTime;
		    log(`Stopping execution due to error in ${call.function_name}`);

		    // Filter results if return_indices specified
		    const filtered = filter_results(results, return_indices);

		    return {
			total_execution_time_ms: totalTime,
			completed: i + 1,
			total: calls.length,
			error: `Failed at function ${i + 1} (${call.function_name}): ${result.error}`,
			results: filtered
		    };
		}
	    }

	    const totalTime = Date.now() - startTime;
	    log(`All functions completed successfully in ${totalTime}ms`);

	    // Filter results if return_indices specified
	    const filtered = filter_results(results, return_indices);

	    return {
		total_execution_time_ms: totalTime,
		completed: calls.length,
		total: calls.length,
		error: false,
		results: filtered
	    };

	    // Helper to filter results by indices
	    function filter_results(results: any[], indices: number[] | null | undefined): any[] {
		if (!indices || indices.length === 0) {
		    return results;  // Return all
		}
		return indices
		    .filter(idx => idx >= 0 && idx < results.length)
		    .map(idx => results[idx]);
	    }
	},
	return_type : "object"
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
    }

]
