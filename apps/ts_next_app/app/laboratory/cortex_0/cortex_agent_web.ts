import * as c from "../src/cortex"  ;
declare var window : any ;

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
	description : `Use the javascript interpreter` ,
	name        : "evaluate_javascript" ,
	parameters  : { input : "string" }  ,
	usage       : [
	    "When reporting results, do not output long numerical data unless explicitly requested",
	    "Use snake_case for variables unless explicitly requested", 
	
	], 
	fn          : async ( params : any ) => {
	    var error  : any = null ;
	    var result : any = null ;
	    try { 
		result = window.eval(params.input)
	    } catch (e : any) {
		error = e 
	    }
	    return { result, error } 
	    
	} ,
	return_type : "any"
    },
    
]




