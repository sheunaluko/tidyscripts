

import {
  assertEquals,
  assertArrayContains,
} from "https://deno.land/std/testing/asserts.ts";


import * as common from "../common/util/index.ts" ; //common utilities  

import {AsyncResult, 
	Success, 
	Error} from "../common/util/types.ts" 

export {common, 
	assertEquals,
	assertArrayContains}


let log = common.Logger("dutil") 
    
    

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







