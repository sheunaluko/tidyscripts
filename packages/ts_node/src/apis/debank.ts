/* 
   Interface to the debank api for crypto address use cases 
*/
import * as http from "../http"
import * as R from 'ramda' 

/**
 *  Given a crypto currency address (EVM compatible), returns the users protocol assets across multiple
 *  EVM chains. 
 */
export async function get_protocol_assets(u : string) {
    let url = 'https://openapi.debank.com/v1/user/complex_protocol_list?id=' + u  ;
    let raw = await http.get_json(url) as any  
    let parser = R.pipe(  R.map(R.prop('portfolio_item_list')) ,
			  R.flatten,
			  R.map(R.pipe(R.prop('detail'),R.values as any)),
			  R.flatten ,
			  R.map(R.pick(['chain',
					'symbol',
					'amount',
					'price',
					'name',
					'protocol_id']))  ) 
    
    return parser(raw) 
} 

export type TokenReturn = {
    'symbol' : string,
    'name' : string,
    'chain' : string,
    'price' : number,
    'amount' : number,
    'usd_value' : number
} 

/**
 *  Given a crypto currency address (EVM compatible), returns the users tokens across multiple
 *  EVM chains, sorted by total USD value 
 *  @param u The crypto address string 
 *  @param thresh The dollar value threshold to filter the returned tokens by 
 */

export async function get_tokens(u : string, thresh : number) : Promise<TokenReturn[]> {
    let url = 'https://openapi.debank.com/v1/user/token_list?is_all=true&id=' + u  ;
    let raw = await http.get_json(url) as any  
    let parser = R.pipe(
	R.map( (d:any)=> R.assoc('usd_value', d.price*d.amount, d) ) , 
	R.filter( (x:any) => (x.usd_value > thresh) && x.is_verified ) ,
	R.map(R.pick(['symbol','name', 'chain','price','amount','usd_value'])) ,	
	R.sortBy( (x:any) => -x.usd_value ) 
    )
    return parser(raw) 
} 


