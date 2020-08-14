
import { 
    assertEquals, 
    assertArrayContains, 
    path 
} from "./base_imports.ts" 



import * as common from "../common/util/index.ts" ; //common utilities  

import {AsyncResult, 
	Success, 
	Error} from "../common/util/types.ts" 

export {common, 
	assertEquals,
	path ,
	assertArrayContains}


export var log = common.Logger("dutil") 
    
    

export async function base_http_json(url : string) : AsyncResult<object> {

    log(`Requesting url: ${url}`)
    
    const res = await fetch(url, {method : "POST"}) ;

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



export var get_json_get_json = base_http_json ; 



export async function post_json_get_json(url : string, msg  : any) : AsyncResult<object> {

    
    log(`Requesting url: ${url}`)
    log(msg)
    
    
    
	let result = await fetch(url,{
	    method : 'GET' , 
	    headers : { 
		'Content-Type' : 'application/json', 
	    } , 
	    body : JSON.stringify(msg), 
	    
	})
	
	let json = await result.json() 
	return Success(json) 
	
	
    //return Error({description: "unknown post error"}) 

    
} 









