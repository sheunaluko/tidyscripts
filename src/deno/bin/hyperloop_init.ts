
import * as hl from "../hyperloop/index.ts" 

import {AsyncResult, 
	Success, 
	Error} from "../../common/util/types.ts" 

import {base_http_json , 
	base_http, 
	post_json_get_json , 
       } from "../util.ts"  



import * as common from "../../common/util/index.ts" 

let log = common.Logger("hli") 


// 1) start a hyperloop server  

let s_ops = { 
    port  : 9500  
} 

let hl_server = new hl.server.Server(s_ops) 
hl_server.initialize() 

log("Server initiated") 


//pause 
let _ = await common.asnc.wait(2000) 



// 2) create and connect a hyperloop client 

let hc1 = new hl.client.Client({host : "127.0.0.1" , 
				id : "hc1" ,  //how is this id used? must it be unique? 
				port : s_ops.port ,  }) 

await hc1.connect() 

log("Client connected") 

// 3) register the default providers  

let default_providers = [ 
    { 
	id : "sattsys.hyperloop.http_json" , 
	handler : async function(url : string ) { 
	    let result = await base_http_json(url) 
	    return result 
	} ,  
	args_info : [["url","string"]] 
    } , 
    { 
	id : "sattsys.hyperloop.http" , 
	handler : async function(url : string ) { 
	    let result = await base_http(url) 
	    return result 
	} ,  
	args_info : [["url","string"]] 
    } , 
    
    { 
	id : "sattsys.hyperloop.post_json" , 
	handler : async function(url : string, msg : object ) { 
	    let result = await post_json_get_json(url,msg)
	    return result 
	} ,  
	args_info : [["url","string"] , ["msg" , "json argument to POST"]]
    } 
    
] 


//register the functions 
default_providers.map((r: any)=> hc1.register_function(r) ) 

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








