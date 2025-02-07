import * as c from "../src/cortex"  ;

/**
 * Defines the cortex agent used in the Cortex UI 
 */


export function get_agent() {
    // init cortex 
    let model = "gpt-4o" ;
    let name  = "coer" ;
    let ops   = { model , name, functions  } 
    let coer    = new c.Cortex( ops ) ;
    return coer ; 
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

    /*
    {
	description : "accumulates a block of text from the user" ,
	name        : "accumulate_text" ,
	parameters  : null , 
	fn          : async (ops :any) => {
	    // -- 
	    let {get_user_data, log , feedback} = ops  ;
	    log(`Accumulating text`)  ;
	    feedback.activated() ;
	    var txt = [ ]
	    var text = await get_user_data()
	    
	    while ( text.trim() != "finished") {
		txt.push(text)
		log(`Added ${text}`)
		feedback.acknowledged()
		text = await get_user_data()
	    }

	    let final_text = txt.join("\n") 
	    log(`Got user text: ${final_text}`);
	    feedback.success() ; 
	    return {
		accumulated_text : final_text
	    }
	    // -- 
	} ,
	return_type : "any"
    },
    */

    
]
