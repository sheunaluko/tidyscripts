/**
 * TES (Tidyscripts Evaluation Server)  
 * 
 * Exposes Tidyscripts Node and Common Libs via a server http interface 
 * Sun Feb  9 20:09:55 CST 2025
 * Made with LoVe by Sheun Aluko MD  
 */

import * as common from "tidyscripts_common" ;
import http from "http"   ;
import * as node from "./index"  ; 

const log   = common.logger.get_logger({id: "tes"}) ; 
const T     = {common, node  } ; 
const debug = common.util.debug ; 

interface CallData {
    fn_path : string[]   // path to the function that should be called (starts with node or web)
    fn_args : any[]      // array of arguments to pass to the function 
} 

/**
 * Services a TES function call 
 */
export async function handle_tes_call(callData : CallData) {
    //first we check if the function exists
    let {fn_path, fn_args} = callData ;
    log(`Request to call ${JSON.stringify(fn_path)}`)
    debug.add('fn_args', fn_args )

    var fn : any = T ; 
    
    try {

	for (var i=0; i < fn_path.length; i++) {
	    let next_key = fn_path[i] ;
	    fn = fn[next_key] 
	}
	log(`Retrieved function and running...`) 
	//at this point we should have the desired function
	let result =  await fn(...fn_args)
	log(`Got result and returning (^.^) `)

	return {
	    error : null ,
	    result ,
	    fn_path 
	} 
	
    } catch (e : any) {
	log(`Error:`)  ; log(e)  ; 
	return {
	    error : e.message , 
	    result :  null ,
	    fn_path 
	} 
	
    } 

}

