
import { 
    assertEquals, 
    assertArrayContains, 
    path , 
    WebSocket,
    WebSocketServer
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

    console.log("\n HTTP DEBUG!!!\n") 
    console.log("Url is = " + url) 
    
    log(`Requesting url: ${url}`)
    
    const res = await fetch(url, {method : "GET"}) ;

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

export async function base_http(url : string) : AsyncResult<string> {

    log(`Requesting url: ${url}`)
    
    const res = await fetch(url, {method : "GET"}) ;

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
    var text; 
    try {
	text = await res.text()
	return Success(text) 
    } catch (error) {
	return Error({description: error})
    } 
    
}



export var get_json_get_json = base_http_json ; 



export async function post_json_get_json(url : string, msg  : any) : AsyncResult<object> {Ani

    
    log(`Requesting url: ${url}`)
    log(msg)
    
	let result = await fetch(url,{
	    method : 'POST' , 
	    headers : { 
		'Content-Type' : 'application/json', 
	    } , 
	    body : JSON.stringify(msg), 
	    
	})
	
    
    console.log("\n\nPOST RESULT\n\n")
    console.log(result) 
    
	let json = await result.json() 
	return Success(json) 
	
    //return Error({description: "unknown post error"}) 
    
} 



export interface WsOps { 
    url : string, 
    handler : (e:any) => void , 
    error? : (e:any) => void, 
    close? : () => void, 
    open? : () => void, 
    json? : boolean, 
} 


export function WebSocketMaker(ops : WsOps) { 
    
    var {url,handler,open, error,close , json} = ops    
    
    /*  get params ready     */
    open = open   || ( ()=> {log(`ws to ${url} opened`)}  )
    close = close || ( ()=> {log(`ws to ${url} closed`)} )
    error = error || ( (e:any)=> {log(`ws to ${url} errored: ${JSON.stringify(e)}`)} )
    
    /* go .. */ 
    let ws = new WebSocket(url) 
    ws.on("open", open )
    ws.on("close", close ) 
    ws.on("error",  error ) 
    ws.on("message", function(e:any) {
	
	//console.log("Got the following message")
	//console.log(e)
	
	var dta = ( json ? JSON.parse(e) : e ) 
	handler(dta)
	
    }) 
	  
    
    return ws 
} 








