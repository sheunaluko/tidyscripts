/*
  Binance us apis 
*/

import * as common from "../../common/index"
import * as node from "../../node/index"

import {hmac} from "../cryptography" 

const log = common.logger.get_logger({id: "binanceus"}) ; 
// -- 

export type UserDataParams = {
    'secret_key' : string,
    'api_key' : string, 
} 

/**
 * Returns user information (including balances) 
 * @param params Dictionary containing the api key and api secret 
 */
export async function get_user_data(params: UserDataParams) {
    let {api_key, secret_key} = params; 
    let timestamp=Number(new Date()) ; 
    let api_url="https://api.binance.us"
    let sig = hmac({algorithm:'sha256', secret : secret_key, data : `timestamp=${timestamp}`, digest : 'hex'})
    let url = `${api_url}/api/v3/account?timestamp=${timestamp}&signature=${sig}`
    let headers = {'X-MBX-APIKEY': api_key} 
    return await node.http.get_json_with_headers(url, headers)
} 

/**
 * Returns user balances
 * @param params Dictionary containing the api key and api secret 
 */
export async function get_user_balances(params: UserDataParams) {
    let balances = (await get_user_data(params) as any ).balances  ; 
    let non_zero = ((x:any)=> Number(x.free) > 0) ; 
    return balances.filter(non_zero).map( (x:any)=> ({symbol : x.asset,
						      amount : (Number(x.free) + Number(x.locked))
						     })) 
}

/**
 * Retrieves the current price of a given symbol 
 * @param symbol - The symbol 
 */
export async function get_price(symbol: string) {
    let url = `https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`
    return Number ( (await node.http.get_json(url) as any).price ) 
}

export type OrderType = "LIMIT" | "MARKET" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT" | "LIMIT_MAKER" ;  

export interface MarketOrderParams  {
    side : string, 
    symbol : string,
    quantity : number , 
} 

/**
 * Execute a market order 
 * @param params - Market order parameters 
 */
export async function market_order(marketParams : MarketOrderParams, userParams: UserDataParams ) {
    let {
	side, symbol, quantity 
    } = marketParams ;
    
    let {
	secret_key, api_key , 
    } = userParams ;

    let timestamp=Number(new Date()) ; 
    let api_url="https://api.binance.us"
    let url_data = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`
    log(`Using url_data: ${url_data}`)
    let sig = hmac({algorithm:'sha256', secret : secret_key, data : url_data, digest : 'hex'})
    let url = `${api_url}/api/v3/order` 
    let params = new URLSearchParams(); 
    let args : [string,string][]= [ 
        ['symbol'    , symbol] , 
        ['side'      , side  ] , 
        ['type'      , 'MARKET'] , 
        ['quantity'  , String(quantity)], 
        ['timestamp' , String(timestamp)] , 
        ['signature' , sig ] 
    ]
    for ( var [k,v] of args ) { 
        params.append(k , v )  ; 
    }
    let headers = {'X-MBX-APIKEY': api_key }
    return await node.http.post_with_headers_get_json(url,params,headers)

}






