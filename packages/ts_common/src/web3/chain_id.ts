/**
 * Exports the chain_id mappings for evm chains 
 * 
 * @packageDocumentation 
 */

/**
 * Array of objects containing {id, symbol} information 
 */
const data = [{"id":"1","symbol":"ETH"},{"id":"56","symbol":"BNB"},{"id":"43114","symbol":"AVAX"},{"id":"137","symbol":"MATIC"},{"id":"42161","symbol":"ARB_ETH"},{"id":"10","symbol":"OPT_ETH"},{"id":"25","symbol":"CRO"},{"id":"250","symbol":"FTM"},{"id":"8217","symbol":"KLAY"},{"id":"2222","symbol":"KAVA"},{"id":"100","symbol":"xDAI"},{"id":"7700","symbol":"CANTO"},{"id":"32659","symbol":"FSN"},{"id":"128","symbol":"HT"} ] ; 

/**
 * Dictionary mapping chain symbols to chain ids 
 */
export var symbol_to_id = Object.fromEntries( data.map( (x:any) => [x['symbol'] ,Number(x['id'])  ] ) ) ; 
    
/**
 * Returns the chain ID of a given symbol 
 */
export function get_id(symbol :string){
    return symbol_to_id[symbol] ; 
}


export { 
    data  , 
}