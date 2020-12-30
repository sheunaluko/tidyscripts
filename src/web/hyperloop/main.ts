

// -- this module is the main hyperloop client for the browser 
// -- will store it here so that browser functions do not keep creating new hyperloop clients but instead 
// -- can share one 


import * as client from "./client.ts" 


export var default_client : any  =  null 

declare var window : any ; 

import * as common from "../../common/util/index.ts" ; //common utilities  
let log = common.Logger("hlm")

import * as wutil from "../util/index.ts" 


let fp = common.fp 
let debug = common.debug 


export var event_logger : any = null 
export function set_event_logger(f : any) {   
    event_logger = f
    log("Reset event logger") 
    console.log(f) 
    debug.add("event_logger", event_logger) 
    
}  
export function event_log(...args : any) {
    log("called event log!") 
    console.log(args) 
    
    if (event_logger) { 
	event_logger.apply(null, args) 
    } else { 
	log("No event logger") 
    } 
} 

// -- async function for checking status of default_client 
// -- if a react component needs to make an http query inorder to render itself 
// (via a useEffect hook for example)
// -- then it can await default_client_ready()  prior to making the request 
// -- in order to avoid runtime exception where the hyperloop client is not connected by 
// -- an external library calls into one of the functions 

export async function default_client_ready(){ 
    
    log("checking default client ready status...") 
    let timeout = await common.asnc.wait_until( ()=>(default_client != null && default_client.conn.readyState == 1) , 10000, 30 ) 
    
    if (timeout) { 
	//never connected , 
	log("Default client timeout!") 
	return false 
    } else { 
	log("Successfully connect default hyperloop client")
	log("Returning async promise ->") 
	return true 
    }
}

var host = null 


let default_ops = { 
    host : (host || "sattsys.com/api/hyperloop" )  , 
    port : 80 , 
    secure : true, 
    id : "sattsys.hyperloop.client." + wutil.uuid() ,
} 

export async function get_default_client(ops? : client.ClientOps) { 
    
    //event_log("Getting default client") 
    
    if (default_client) {
	
	return default_client 
	
    } else { 
	
	default_client = new client.Client(ops || default_ops)	

	try { 
	    
	    await default_client.connect(ops ? ops.secure : true)	    
	    await default_client_ready() 	    

	} catch(error) { 
	    log("Error in connecting client -- likely endpoint is down")
	    log("Retrying in 2 seconds:")
	    setTimeout( get_default_client , 2000) 
	} 
	

	log("Successfully connected client! Now creating close listener for automatic restarting")
	
	
	//add an onclose listener 
	//which just calls this function again in 1 second
	//(after setting default_client to null first 
	default_client.conn.addEventListener("close",
					     function restarter(){
						 log("client closed -- attempt to recconect in 1s")
						 default_client = null //have to delete it first
						 setTimeout( get_default_client , 1000)
					     })
	
	return default_client  

    } 
} 


function get_url_with_params(_url : string ,params : any) { 
    let url = new URL(_url) 
    url.search = new URLSearchParams(params).toString() 
    return url 
} 


export async function  http_json(url_base :string,url_params : any) { 
    
    
    event_log("HTTP_JSON Request:")
    event_log(url_base) 
    
    let url = get_url_with_params(url_base,url_params) 
    let client = await get_default_client() 
    
    log(`Using url: ${url.toString()}`) 
    
    let data = await client.call({ id : "sattsys.hyperloop.http_json", args : { url : url.toString()}}) 

    log("Done") 
    log("Got value: " + JSON.stringify(data)) 
    
    return data 
} 


export async function  http(url_base :string,url_params : any,to_dom : boolean = true) { 
    
    event_log("HTTP Request:")
    event_log(url_base) 

    
    let url = get_url_with_params(url_base,url_params) 
    let client = await get_default_client() 
    
    log(`Using url: ${url.toString()}`) 
    let data = await client.call({ id : "sattsys.hyperloop.http", args : { url : url.toString()}}) 
    log("Done") 
    log("Got value: " + JSON.stringify(data)) 
    
    if (to_dom) {
	var el = document.createElement("html")
	el.innerHTML = data.result.value
	return el 
    } 
    
    return data 
} 




export async function post_json(url : string, msg : object ) {
    
    event_log("POST Request:")
    event_log(url) 

    let client = await get_default_client() 
    log("Request to post json") 
    
    let data = await client.call( { id : "sattsys.hyperloop.post_json", 
				    args : { url , msg } } )
    
    log("Done") 
    log("Got value: " + JSON.stringify(data))     

    return data
} 
