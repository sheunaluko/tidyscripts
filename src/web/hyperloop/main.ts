

// -- this module is the main hyperloop client for the browser 
// -- will store it here so that browser functions do not keep creating new hyperloop clients but instead 
// -- can share one 


import * as client from "./client.ts" 


export var default_client : any  =  null 

import * as common from "../../common/util/index.ts" ; //common utilities  
let log = common.Logger("hlm")

import * as wutil from "../util/index.ts" 

let default_ops = { 
    host : "35.227.177.177" , 
    port : 9500 , 
    id : "sattsys.hyperloop.client." + wutil.uuid() ,
} 

export async function get_default_client(ops? : client.ClientOps) { 
    
    if (default_client) {
	
	return default_client 
	
    } else { 

	default_client = new client.Client(ops || default_ops)
	
	await default_client.connect()
	
	return default_client  

    } 
} 


function get_url_with_params(_url : string ,params : any) { 
    let url = new URL(_url) 
    url.search = new URLSearchParams(params).toString() 
    return url 
} 


export async function  http_json(url_base :string,url_params : any) { 
    
    let url = get_url_with_params(url_base,url_params) 
    let client = await get_default_client() 
    
    log(`Using url: ${url.toString()}`) 
    
    let data = await client.call({ id : "sattsys.hyperloop.http_json", args : { url : url.toString()}}) 

    log("Done") 
    log("Got value: " + JSON.stringify(data)) 
    
    return data 
} 



export async function post_json(url : string, msg : object ) {
    
    let client = await get_default_client() 
    log("Request to post json") 
    
    let data = await client.call( { id : "sattsys.hyperloop.post_json", 
				    args : { url , msg } } )
    
    log("Done") 
    log("Got value: " + JSON.stringify(data))     

    return data
} 