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

   [ ] improve the error handling so when fn error messages are passed back to cortex it also says to pause and report the error to the user  

   [ ]
   Help cortex learn how to create stored procedures.
   Have claude review the code on stored procedures -- then generate a new function that tells
   cortex how to test a stored procedure (called test_stored_procedure) , it should take the procedure_name, the function_name, and
   function args, as well as a test_procedure_args.

   It will then run the test_procedure with the provided args and report the result back to cortex (including the error if it errored). If it runs successfuly the stored procedure is also saved to CortexRAM and the id is reported back to Cortex

   Next - claude should make another function called save_stored_procedure, which will take the reference to a stored procedure (explaining that it must be tested first and successful testing produces the referencable id) and actually stores it into the cortex table with type=stored_procedure and with procedure=the_actual_procedure_object

   [ ]
   After the above is done: coach cortex (via chat) on developing a procedure called create_user_log which takes a category parameter and then uses accumulate text to get a log and then computes the embedding of the text and saves everything into the logs table with { category, text, embedding }


   [ ]
   Next: actually need to load the stored procedures at init time and make them available!
   - [ ] 1st pass - just create an init function
   - [ ] 2nd pass - dynamic SYSTEM_PROMPT management ? may be overkill 

   [ ]
   Next: ability to search surreal db with embeddings: -- consider coaching cortex using the MCP surreal tool and the query function, to make a stored_procedure that can do this 

   

   
   
   

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
	    let response = await fbu.surreal_query({query }) ;
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
	description : "Utility function that helps to accumulate a block of text from the user. Only call this function if you need to accumulate a block of text that will be passed to another function for input. Finishes accumulating text when the user says the word finished. When you call this function please give the user some helpful instructions, including the keyword to complete the accumulation (unless you have already told them this earlier in the conversation" , 
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
	    let response = await fbu.surreal_query({query, variables : ops.params }) ; 
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

       A stored proc has the following structure:
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

       A stored procedure uses a & sign to indicated a variable placeholder

       For example :
       {
       
       name : 'store_exercise_log' ,
       parameters : { text : 'string' } ,
       function_name : 'access_database_with_surreal_ql' ,
       function_args :  [ "query" , "insert into logs { message : &text , type : 'exercise' } "  ] 
       }

     */

    {
	enabled : true,
	description : `
           Runs a stored_procedure by using its name and arguments 
	` ,
	name        : "run_stored_procedure" ,
	parameters  : {
		    procedure_name : "string" ,
		    procedure_args : "array"  
	} ,
	
	fn          : async (ops : any) => {
	    let {procedure_name, procedure_args} = ops.params ;
	    let {
		log,
		collect_args,
		handle_function_call,
		get_var, 
	    } = ops.util ;

	    log(`Request to run stored procedure:${procedure_name}, with args`) ; 
	    log(procedure_args) ;

	    //now we need to actually have the stored procedure object !
	    log(`Attempting to get spo object: ${procedure_name}`)  ; 
	    let {error,result}  = await handle_function_call({
		name: "get_stored_procedure_object_test",
		parameters: { name : procedure_name } 
	    })

	    if (error) { throw(error) }

	    //if it ran well then result should contain the id of the spo (stored_proc_obj)
	    log(`Retrieved spo id : ${result}`) ;
	    //and we can get a ref to it like this:
	    let spo = get_var(result) ; debug.add("spoo", spo) ;

	    //destructure out
	    let { name, function_args, function_name } = spo ; 

	    //build the proecudre args dic 
	    log(`Collecting args`) ; 
	    let arg_dic = collect_args(procedure_args) ;

	    //resolve the function_args
	    let resolved_function_args = cu.resolve_function_args_array( function_args, arg_dic ) ;
	    let collected_function_args = collect_args(resolved_function_args) ; 

	    //run it
	    debug.add('proc_run_info' , {
		spo,
		function_args,
		resolved_function_args,
		function_name,
		collected_function_args ,
		arg_dic
	    })

	    /*
	    let proc_result =  await handle_function_call({
		name : function_name,
		parameters : collected_function_args 
	    });
	    */
	    
	    return false 
	} ,
	return_type : "any"
    },
    {
	enabled : true ,
	name : "get_stored_procedure_object" ,
	description : "Retrieves a stored_procedure object from the database and stores it in CortexRam, returns its id" ,
	parameters : {
	    name : "string", 
	},
	fn : async (ops :any ) => {

	    let {name} = ops.params;
	    let {set_var} = ops.util ; 
	    
	    let query = `select * from cortex where type = "stored_procedure" and name = ${name}`
	    var spo = {} ;
	    
	    var response = await fbu.surreal_query({query }) as any ;
	    var spo_string = response.data.result.result[0] ;
	    spo = JSON.parse(spo)

	    debug.add("spo_info" , {response,spo_string,spo} )  ;

	    let id = set_var(spo) ; 
	    return id ; 

	}
    },

    {
	enabled : true ,
	name : "get_stored_procedure_object_test" ,
	description : "Retrieves a stored_procedure object from the database and stores it in CortexRam, returns its id" ,
	parameters : {
	    name : "string", 
	},
	fn : async (ops :any ) => {

	    let {set_var} = ops.util; 

	    let spo = cu.example_procedure ; 

	    debug.add("spo_info" , {spo} )  ;

	    let id = set_var(spo) ; 
	    return id ; 

	}
    },
    

    {
	enabled : true,
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
    }

		/*
		   {
		   description : "Sets the Cortex interface listen_while_speaking setting. Never run this function unless the user specifically requests that you run it." ,
		   name        : "set_listen_while_speaking" ,
		   parameters  : { value : "boolean" }   ,
		   fn          : async (ops : any) => {
		   let val = ops.value ; 
		   vi.set_listen_while_speaking(JSON.parse(val))
		   return `Set listen_while_speaking to ${val}` ; 
		   } ,
		   return_type : "string"
		   },

		   {
		   description : "Gets the Cortex interface listen_while_speaking setting" ,
		   name        : "get_listen_while_speaking" ,
		   parameters  : null  ,
		   fn          : async (ops : any) => {
		   return vi.listen_while_speaking
		   } ,
		   return_type : "boolean"
		   },

		 */

		/*
		   {
		   description : "Gets a summary of a youtube video from a url. The length_in_minutes parameter specifies how long it should take to read the summary" ,
		   name : "youtube_summary" ,
		   parameters : { url : "string"  , length_in_minutes : "string" } ,
		   fn : async (ops : any ) => {
		   let fn_path = ['dev' , 'yts' , 'get_summary' ] ;
		   let fn_args = [ops.url , Number(ops.length_in_minutes) ] 

		   let msg = `Running YouTube call via TES with args=${JSON.stringify({fn_path,fn_args})}`
		   ops.event({type:'log' , log : msg})	    
		   return await tes(fn_path , fn_args )
		   } ,
		   return_type : "string" , 
		   },
		 */ 
		
		
]


		const held_functions = [
		    { 
			description : "Saves a diary/log entry for the user. May be referred to as Captain's log at times if the user is feeling spontaneous. You will need to first accumulate text from the user before passing that text to this function. In addition, you should pass the user_initiation_string, which is the original text the user provided that led to the initiation of the log" , 
			name        : "generic_user_log" ,
			parameters  : {  text : "string" , user_initiation_string : "string" }  ,
			fn          : async (ops : any) => {
			    await main_stream_log(ops)
			    return "log saved" 
			} ,
			return_type : "string"
		    },
		    
		]
