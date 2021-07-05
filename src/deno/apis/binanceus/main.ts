


/* 
   
 */ 

import * as io from "../../io.ts" 
import {hmac} from "../../base_imports.ts" 
import * as cutil from "../../../common/util/index.ts" 


let log = cutil.Logger("bus_main") 

let base_ep = "https://api.binance.us" 
let account_ep = base_ep + "/api/v3/account" 

let api_k_path = "/Users/oluwa/.local_only/bus_api_key"
let api_s_path = "/Users/oluwa/.local_only/bus_api_sec"

export var apik = io.read_text(api_k_path).trim()
let apis = io.read_text(api_s_path).trim() 
    
export async function get_account_info() {

    log(`apik=${apik}, apis=${apis}`) 
    log(`account endpoint= ${account_ep}`) 
    
    let req_body = `recvWindow=5000&timestamp=${new Date.getTime()}` ; 
    let sig = hmac('sha256', apis, req_body , 'utf8', 'hex') ; 
    let req_body_w_sig = `${req_body}&signature=${sig}` ;
    
    log(`req+sig=${req_body_w_sig}`) 

    let res = await fetch(account_ep, { 
	method : 'GET', 
	headers: { 'X-MBX-APIKEY' : `${apik}` } , 
	body : req_body_w_sig 
    })
    
    console.log(res) 
    
    let json = await res.json() 
    
    console.log(json) 
} 





