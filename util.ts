

import {Error,
	Success,
	Result,
	AsyncResult,
	None} from "./custom_types.ts"


import {Logger } from "./base_util.ts" 

import *  as Date from "./dates.ts"



// module exports 
export {Logger, Date} 



// functions 
let log = Logger("util") ; 

export async function base_http_json(url : string) : AsyncResult<object> {

    log(`Requesting url: ${url}`)
    
    const res = await fetch(url) ;

    let status = res.status ; 
    let headers = res.headers ; 

    log(`Status: ${status}`) ; 
    log("Got headers:") ; 
    log(headers) 

    if (status != 200) {
	//there was some error --
	return Error({description: "status code failure" ,
		      status,
		      statusText : res.statusText } ) 
    }

    //otherwise we got the result
    var json; 
    try {
	json = await res.json()
	return Success(json) 
    } catch (error) {
	return Error({description: error})
    } 
    
}


