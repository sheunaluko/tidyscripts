/**
 * API for interacting with a coinbase(pro) user account.
 * For example, to get the total usd value of an account:
 * ```
 * const ts = require("tidyscripts_node")  ;
 * let keys = { api_key, secret_key , passphrase } ;  //coinbase api keys and passphrase 
 * let value =  ts.apis.coinbase.get_user_balances(keys)  ; 
 * console.log("Your net worth on coinbase/coinbasepro is currently" + value);
 * ```
 * 
 * @packageDocumentation
 */

import * as common from "tidyscripts_common"  
import * as node from "../index"

import * as cryptography from "../cryptography" 
const {R} = common; 

const log = common.logger.get_logger({id : "coinbase"}) ; 

export type CoinbaseUserDataParams = {
    'secret_key' : string,
    'api_key' : string,
    'passphrase' : string , 
} 

/**
 * Base function for making coinbase queries 
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function coinbase_query(params: CoinbaseUserDataParams, api_url : string, requestPath : string) {
    let {api_key, secret_key, passphrase} = params;
    let timestamp= (Date.now()/1000)
    let sig_data = timestamp + "GET" +  requestPath ;
    let sig = cryptography.hmac({algorithm:'sha256', secret : Buffer.from(secret_key,'base64'), data : sig_data, digest : 'base64'})
    let headers = {"Accept": "application/json" ,
		   "CB-ACCESS-KEY" : api_key  ,
		   "CB-ACCESS-SIGN" :  sig ,
		   "CB-ACCESS-PASSPHRASE" : passphrase , 		   
		   "CB-ACCESS-TIMESTAMP" : timestamp} 
    return await node.http.get_json_with_headers(api_url, headers)
} 

/**
 * Returns user accounts on pro.coinbase.com
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_coinbase_pro_user_accounts(params: CoinbaseUserDataParams) {
    let api_url = `https://api.exchange.coinbase.com/accounts` ;
    let requestPath = "/accounts" ;
    return await coinbase_query(params, api_url, requestPath) ; 
}

/**
 * Returns user balances on pro.coinbase.com
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_coinbase_pro_user_balances(params: CoinbaseUserDataParams) {
    let non_zero = ((x:any)=> Number(x.balance) > 0)
    let parser = R.pipe(
	R.filter(non_zero),
	R.map(  (x:any)=> ({symbol : x.currency,
			    amount : (Number(x.hold) + Number(x.available)) }) ),
	R.sortBy( (x:any)=> -x.amount)
    )
    let accounts = await get_coinbase_pro_user_accounts(params)   
    return parser(accounts) 
}

/**
 * Returns user accounts on coinbase.com
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_coinbase_user_accounts(params: CoinbaseUserDataParams) {
    let api_url = `https://api.exchange.coinbase.com/coinbase-accounts`    
    let requestPath = "/coinbase-accounts" ;
    return await coinbase_query(params, api_url, requestPath) ; 
}

/**
 * Returns user balances on coinbase.com
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_coinbase_balances(params: CoinbaseUserDataParams) {
    let accounts = await get_coinbase_user_accounts(params)
    let non_zero = ((x:any)=> Number(x.balance) > 0)
    let parser = R.pipe(
	R.filter(non_zero),
	R.map(  (x:any)=> ({symbol : x.currency,
			    amount : (Number(x.hold_balance) + Number(x.balance)) }) ),
	R.sortBy( (x:any)=> -x.amount)
    )
    return parser(accounts)
} 

/**
 * Returns all user balances on both coinbase.com and pro.coinbase.com
 * Summarizes the usd value 
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_user_balances(params: CoinbaseUserDataParams) {
    
	let coinbase =  await get_coinbase_balances(params) ; 
	let coinbase_pro = await get_coinbase_pro_user_balances(params)  ; 

    let get_usd = async function(x:any) { 
        let tot_usd = 0 
        for (var y of x) { 
            let {symbol, amount} = y ; 
            let price = await usd_price(symbol) ; 
            y.price = price ; 
            y.usd_value = price * amount 
            tot_usd += y.usd_value ; 
        }
        return tot_usd 
    }

    let coinbase_total_usd = await get_usd(coinbase) ; 
    let coinbase_pro_total_usd =      await get_usd(coinbase_pro) ; 

    return { 
        coinbase, coinbase_pro , 
        coinbase_total_usd , coinbase_pro_total_usd , 
        total_usd : (coinbase_total_usd + coinbase_pro_total_usd)  
    }

}

/**
 * Get Returns the usd value of the supplied coinbase account
 */
export async function coinbase_total_usd_value(params : CoinbaseUserDataParams){
    let b = await get_user_balances(params) ; 
    return b.total_usd ; 
}

/**
 * Generates the account_id to currency mapping, which allows looking up the currency 
 * which correpsonds to a given account id 
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_account_id_mapping(params: CoinbaseUserDataParams) {
    let accounts = await get_coinbase_pro_user_accounts(params) as any  ;
    let dic : any = {} ;
    accounts.map( (acc : any) => dic[acc.id] = acc.currency )
    return dic 
}

/**
 * Returns all user transfers on pro.coinbase.com
 * For now this is limited to 300 transfers. 
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_user_transfers(params: CoinbaseUserDataParams) {
    let {api_key, secret_key, passphrase} = params;
    let api_url = `https://api.exchange.coinbase.com/transfers?limit=300`
    let requestPath = "/transfers?limit=300" ; 
    let transfers =  await coinbase_query(params,api_url, requestPath) ;
    return transfers
    
}

/**
 * Returns all user transfers (with the currencies resolved) on pro.coinbase.com
 * For now this is limited to 300 transfers. 
 * @param params Dictionary containing the api key and api secret and passphrase 
 */
export async function get_resolved_user_transfers(params: CoinbaseUserDataParams) {
    let transfers =  await get_user_transfers(params) as any 
    let account_mapping = await get_account_id_mapping(params) as any
    transfers.map( (t:any) => t.resolved_currency = account_mapping[t.account_id] )
    return transfers 
}


/**
 * Get usd price of an asset on coinbase, given its sym 
 * If ther sym-usd pair is not available will return 0 
 */
export async function usd_price(sym : string){
    try { 
        let res = await node.http.get_json(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`) ; 
        return Number(res.data.amount)
    } catch (e) { 
        log("error with usd price req for " + sym)  ; 
        return 0 ; 
    }
}








