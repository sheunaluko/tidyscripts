import * as c from "../src/cortex"  ;
import jdoc from "../../../../docs/jdoc.json" 
import * as fu from "../../../src/firebase_utils" 

/**
 * Defines the cortex agent used in the Cortex UI 
 */


export function get_agent() {
    // init cortex 
    let model = "gpt-4o" ;
    let name  = "coer" ;
    let ops   = { model , name, functions  } 
    let coer    = new c.Cortex( ops ) ;
    // 
    return coer ; 
}


async function tes(fn_path  : string[], fn_args : any[] ) {
    
    let t =  await fetch('http://localhost:8001/call', {
	method: 'POST',
	headers: {
	    'Content-Type': 'application/json',
	},
	body: JSON.stringify({fn_path, fn_args})
    });

    return await t.json()
} 

async function main_stream_log( ops : any ) {
    let {text, user_initiation_string}  = ops;  
    let path = ["logs", "main_stream"]
    let app_id = "tidyscripts"
    let data = {
	text ,
	user_initiation_string , 
	time_created : (new Date()).toString() 
    }
    await fu.store_user_collection({app_id, path, data})
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
	description : "Utility function that helps to accumulate a block of text from the user. Only call this function if you need to accumulate a block of text that will be passed to another function for input. Finishes accumulating text when the user says the word finished. When you call this function please give the user some helpful instructions, including the keyword to complete the accumulation (unless you have already told them this earlier in the conversation" , 
	name        : "accumulate_text" ,
	parameters  : {  user_instructions : "string" }  ,
	fn          : async (ops : any) => {

	    
	    let {get_user_data, feedback, user_output} = ops;
	    feedback.activated()
	    await user_output(ops.user_instructions) ; 
	    
	    let text = [ ] ; 
	    let chunk = await get_user_data() ;


	    while (chunk.trim() != "finished" ) {
		
		if (chunk.trim() == "cancel" ) {
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
