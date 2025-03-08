import * as c from "../src/cortex"  ;
import jdoc from "../../../../docs/jdoc.json" 
import * as fbu from "../../../src/firebase_utils" 
import * as fnu from "../src/fn_util" 

/**
 * Defines the cortex agent used in the Cortex UI 
 */

// todo - change timestamp to ms epoch ; implement vector embeddings 
// ability to update system message by talking to cortex -- via local storage object?
// can update and then reload conversationally.
// upload past dreams 

export function get_agent() {
    // init cortex 
    let model = "gpt-4o" ;
    let name  = "coer" ;
    let additional_system_msg = "Tidyscripts is the general name for your software architecture" 
    let ops   = { model , name, functions, additional_system_msg  } 
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




const functions = [
    {
	description : "use the javascript interpreter" ,
	name        : "evaluate_javascript" ,
	parameters  : { input : "string" }  ,
	fn          : async (ops : any) => {
	    let {input} = ops
	    let result = eval(input)
	    return result 
	} ,
	return_type : "any"
    },

    {
	description : `
The workspace is a toplevel nested object named workspace which exists within the javascript environment.
You update the workspace by proving javascript code to this function.
The code should directly provide the necessary manipulations to the workspace, and will be evaluated.
After that, the user will automatically see the updated changes. 
	`,
	name        : "update_workspace" ,
	parameters  : { code : "string" }  ,
	fn          : async (ops : any) => {
	    let {code} = ops
	    let result = eval(code)
	    // update the workspace UI here 
	    return result 
	} ,
	return_type : "any"
    },
    
    
    { 
	description : "Utility function that helps to accumulate a block of text from the user. Only call this function if you need to accumulate a block of text that will be passed to another function for input. Finishes accumulating text when the user says the word finished. When you call this function please give the user some helpful instructions, including the keyword to complete the accumulation (unless you have already told them this earlier in the conversation" , 
	name        : "accumulate_text" ,
	parameters  : {  user_instructions : "string" }  ,
	fn          : async (ops : any) => {

	    
	    let {get_user_data, feedback, user_output} = ops;
	    feedback.activated()
	    await user_output(ops.user_instructions) ; 
	    
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
	description : "logs data to the console" , 
	name        : "console_log" ,
	parameters  : {  data : "any" }  ,
	fn          : async (ops : any) => {
	    console.log(ops.data)
	    return "console data logged" 
	} ,
	return_type : "string"
    },

    { 
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
	    let { text , user_initiation_string ,log_path, log }  = ops ; 	    
	    log(ops)
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
	description : "Initializes a user log/collection. Takes the name of the log, in snake_case" ,
	name : "initialize_user_log" ,
	parameters : { name : "string"  } ,
	fn : async ( ops : any ) =>  {
	    let {name, log} = ops ;	    
	    log(`Request to create log: ${ops.name}`)
	    let text = `creating the ${name} log` ;
	    let path = ["logs" , name ]  ;
	    let user_initiation_string = null ;

	    await tidyscripts_log({text,path , user_initiation_string}) ;  //auto adds app-id
	    return "done" 
	},
	return_type : "string" 
	
    }, 

    { 
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
	    let {name, search_terms, log} = ops ;
	    log('searching') 
	    log(ops) 
	    return fbu.search_user_collection("tidyscripts", ["logs", name ] , search_terms.split(",").map((y:string)=>y.trim()).filter(Boolean)) 
	} ,
	return_type : "any"
    },

    { 
	description : "Retrieves an entire log/collection. You should opt to search instead of retrieving the entire collection unless the user specifically has requested to retrieve the whole collection" , 
	name        : "get_whole_user_collection" ,
	parameters  : {  name : "string" } ,
	fn          : async (ops : any) => {
	    let {name} = ops ; 
	    return fbu.get_user_collection({app_id : "tidyscripts", path : ["logs", name ]})
	} ,
	return_type : "any"
    }    

    
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
