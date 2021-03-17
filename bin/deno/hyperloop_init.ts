/* 
   MAIN FILE FOR STARTING AND CONFIGURING A HYPERLOOP SERVER 
   This also includes an example of periodic broadcast to all connected clients. 
*/


import * as hl from "../../src/deno/hyperloop/index.ts" 

import {AsyncResult, 
	Success, 
	Error} from "../../src/common/util/types.ts" 

import {base_http_json , 
	base_http, 
	post_json_get_json , 
       } from "../../src/deno/util.ts"  

import * as cutil from "../../src/common/util/index.ts" 
import { io, 
	 base, 
	 util,
       }  from "../../src/deno/index.ts" 


let log = cutil.Logger("hli") 


// 1) start a hyperloop server  

let s_ops = { 
    port  : 9500  
} 

let hl_server = new hl.server.Server(s_ops) 
hl_server.initialize() 

log("Server initiated") 


//pause 
let _ = await cutil.asnc.wait(2000) 



// 2) create and connect a hyperloop client 

let hc1 = new hl.client.Client({host : "127.0.0.1" , 
				//the below ID does not have to be unique 
				//for msgs to be routed successfully 				
				id : "hc1" ,  
				port : s_ops.port ,  }) 

await hc1.connect() 

log("Client connected") 

// 3) register the default providers  
type ParamPair = [string, string]  ; 

interface Provider {
    id :string, 
    handler : (args: any) => Promise<any>, 
    args_info : ParamPair[] ,
} 

let default_providers : Provider[] = [ 
    { 
	id : "sattsys.hyperloop.http_json" , 
	handler : async function(args : any ) { 
	    let result = await base_http_json(args.url) 
	    return result 
	} ,  
	args_info : [["url","string"]] 
    } , 
    { 
	id : "sattsys.hyperloop.http" , 
	handler : async function(args : any ) { 
	    let result = await base_http(args.url) 
	    return result 
	} ,  
	args_info : [["url","string"]] 
    } , 
    
    { 
	id : "sattsys.hyperloop.post_json" , 
	handler : async function(args : any ) { 
	    let result = await post_json_get_json(args.url,args.msg)
	    return result 
	} ,  
	args_info : [["url","string"] , ["msg" , "json argument to POST"]]
    } , 
    { 
	id : "local.hyperloop.write_text"  , 
	handler : async function(args:any) {
	    
	    
	    let {path,data,append} = args ; 
	    
	    let hl_dir = Deno.env.get("HYPERLOOP_DIR")  ; 
	    
	    log(`dir=${hl_dir}, path=${path}, append=${append}`) 
	    
	    if (hl_dir) {
		
		if (path.includes("..")){
		    log("Detected escape path!") 
		    return {error : "Access denied: Remove any double dots from fname" }
		} 
		
		log("Building args") 
		let new_args = {...args, path : base.path.join(hl_dir,"public_fs", path)}
		log(new_args) 
		log("Calling write function") 
		await io.writeTextFile(new_args) 		
		
		return { error  : false } 
		
	    } else { 
		return {error:  "Access denied: No HYPERLOOP_DIR set on server"} 
	    } 
	    

	}, 
	args_info : [["append" , "boolean"],["data", "string"],["path","string"]]
    } 
    
] 


//register the functions 
default_providers.map((r: Provider)=> hc1.register_function(r) ) 


//create a loop and broadcast the number of connected clients 
setInterval( function() {
    
    //for now this broadcast is a semi-hack for keeping the connection alive over VPN, but evenetually will 
    //use it fo realz! 
    
    let num_connected_clients = Object.keys(hl_server.clients_by_id).length 
    let data = { num_connected_clients } 
    hl_server.broadcast(data) 
    
    //log(`Broadcasted to ${num_connected_clients} clients`) 
    
    //console.log(hl_server.clients_by_id) 
    
} , 10000) 

export default { 
    hc1 , 
    hl_server 
} 



/*
log("Testing stuff...") 

let result = await post_json_get_json("https://query.wikidata.org/w/api.php",  {
    action : "wbgetentities" , 
    format : 'json' ,  
    ids : "Q5" , 
    titles : "", 
    sites : "enwiki" , 
}) 

console.log(result) 
*/








