/*
  Binance us apis 
*/

import * as node from "../index"
import * as common from "tidyscripts_common" 

import * as cryptography from "../cryptography" 


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
    let sig = cryptography.hmac({algorithm:'sha256', secret : secret_key, data : `timestamp=${timestamp}`, digest : 'hex'})
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


/**
 * Gets the user asset balances, and retrieves the current asset prices to compute 
 * the usd value of each and all balances  
 */
export async function get_user_balances_with_values(params: UserDataParams){
    let balances = await get_user_balances(params) ; 
    let num_errors = 0 ; 
    for (var bal of balances) { 
        let symbol  = bal.symbol as string ; 
        let amount  = bal.amount as number ;
        let price = 0 ; 
        if ( symbol == "USD") { bal.price  = 1 ; bal.usd_value = bal.amount ; continue }
        let dic : any = { 
            'BUSD' : 'BUSDUSD' , 
            'USDT' : 'USDTUSD' , 
            'HNT'  : 'HNTUSDT' ,
        }
        let market = dic[symbol] ; 
        market = market || `${symbol}BUSD` ; 
        try { 
            price = await get_price(market) ; 
        } catch (e) { log(`Error requesting BUSD price for ${symbol}`) ; num_errors += 1;    }
        bal.price = price ; 
        bal.usd_value = price * amount ; 
    }
    log(`Num errors: ${num_errors}`)
    return balances ; 
}

/**
 * Returns net worth of binanceus account in USD 
 */
export async function get_user_total_usd_value(params : UserDataParams){
    let balances = await get_user_balances_with_values(params) ; 
    return balances.map((x:any)=>x.usd_value).reduce(common.R.add) ; 
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
    let sig = cryptography.hmac({algorithm:'sha256', secret : secret_key, data : url_data, digest : 'hex'})
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






