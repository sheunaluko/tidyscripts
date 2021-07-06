


/* 
   
 */ 

import * as io from "../../io.ts" 
import {hmac} from "../../base_imports.ts" 
import * as cutil from "../../../common/util/index.ts" 

let log = (x:any) => null // cutil.Logger("bus_main") 

let base_ep = "https://api.binance.us" 
let account_ep = base_ep + "/api/v3/account" 

let api_k_path = Deno.env.get("BUS_API_K_PATH")
let api_s_path = Deno.env.get("BUS_API_S_PATH")

export var apik = io.read_text(api_k_path as string).trim()
let apis = io.read_text(api_s_path as string).trim() 
    
export async function get_account_info() {

    log(`apik=${apik}, apis=${apis}`) 
    log(`account endpoint= ${account_ep}`) 
    
    let req_body = `recvWindow=5000&timestamp=${new Date().getTime()}` ; 
    let sig = hmac('sha256', apis, req_body , 'utf8', 'hex') ; 
    let req_body_w_sig = `${req_body}&signature=${sig}` ;
    
    log(`req+sig=${req_body_w_sig}`) 
    
    let final_ep = `${account_ep}?${req_body_w_sig}` ; 
    log(`final_ep=${final_ep}`) ; 

    let res = await fetch(final_ep, { 
	method : 'GET', 
	headers: { 'X-MBX-APIKEY' : `${apik}` } , 
    })
    
    //console.log(res) 
    
    let json = await res.json() 
    
    return json 
}


export async function execute_order(o : string) {
    // hmac
    let sig = hmac('sha256', apis, o , 'utf8', 'hex')
    // create the req body 
    let body = `${o}&signature=${sig}` 
    //order ep 
    let ep = base_ep + "/api/v3/order" 
    // do req 
    log(`using body: ${body}`)
    // -- 
    let res = await fetch(ep, { 
	method : 'POST', 
	headers: { 'X-MBX-APIKEY' : `${apik}` } , 
	body : body
    })
    //console.log(res) 
    let json = await res.json() 
    return json     
} 

export async function usd_market_buy(base  :string, amount : number) {
    let o = `symbol=${base+"USD"}&side=BUY&type=MARKET&quoteOrderQty=${amount}&recvWindow=5000&timestamp=${Date.now()}`    
    return execute_order(o)
} 


export async function free_usd_balance() {
    let info = await get_account_info() 
    let x = info.balances.filter( (y:any) => y.asset == "USD" )[0].free   
    return Number(x)
} 




