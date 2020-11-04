
import * as hl from "../hyperloop/index.ts" 

import {AsyncResult, 
	Success, 
	Error} from "../../common/util/types.ts" 

import {base_http_json , 
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

