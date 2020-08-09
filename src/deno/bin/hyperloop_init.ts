
import * as hl from "../hyperloop/index.ts" 

import {AsyncResult, 
	Success, 
	Error} from "../../common/util/types.ts" 

import {base_http_json   } from "../util.ts"  



import * as common from "../../common/util/index.ts" 

let log = common.Logger("hli") 


// 1) start a hyperloop server  

let s_ops = { 
    port  : 9500  
} 

let hl_server = new hl.server.Server(s_ops) 
hl_server.initialize() 

log("Server initiated") 


// 2) create and connect a hyperloop client 

let hc1 = new hl.client.Client({host : "localhost" , 
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
    } 
] 


//register the functions 
default_providers.map((r: any)=> hc1.register_function(r) ) 

export default { 
    hc1 , 
    hl_server 
} 








