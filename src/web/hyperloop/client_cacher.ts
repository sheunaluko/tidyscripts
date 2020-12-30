/* 
   Cache implementation for the hyperloop client 
   @copyright Sheun Aluko 
   Mon Dec 21 14:03:08 CST 2020 
   
   
   -- 
   
   When the hyperloop client makes a call, there are only two arguments: 
   id , args 
   
   --> 
   
*/ 


import * as DB from "../apis/db.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  

const date = common.Date 
const log = common.Logger("hlc_cacher")  // get logger 

declare var window : any  //get json 
const JSON = window.JSON ; 


// get handle on the db 
const {store, set, get, del, keys, clear } = DB.GET_DB('HL_CLIENT') 



/* 
  Can consider moving this function into db.ts if I am reusing it 
  OR I can create a cacher base class which implements these sorts of functions ? 
 */
export async function set_with_ttl( ops : { id : string, ttl_ms : number, value : any }) { 
    
    let {id, ttl_ms, value} = ops ; 
    
    let expiration = ttl_ms + date.ms_now()
    
    log(`Setting ${id} with ttl_ms ${ttl_ms}, expiration = ${expiration}`)    
    
    await set(id,value) 
    
    await DB.TTL.set(expiration, { db_id : 'HL_CLIENT' , del_id : id }) 
    
    log("Updated TTL with expiration, db_id, and del_id") 
    
}

interface CallFunctionOps {
    id: string;
    args: { [k: string]: any };
}


export function call_ops_to_id(x : CallFunctionOps) { 
    let {id,args} = x 
    let argstring = JSON.stringify(args) 
    let call_id =  `${id}|${argstring}`
    log("Generated call id: " + call_id) 
    return call_id 
} 
 

export async function check_cache_for_call_ops(x : CallFunctionOps) {
    let call_id = call_ops_to_id(x) 
    log(`Checking cache for ${call_id}`) 
    
    let result  = await get(call_id) 
    
    if (result === undefined) {
	return { hit : false, call_id  } 
    } else { 
	return { hit : true, value : result, call_id }  
    }
} 

const sec10 = 1000*10 

export var http_json_rules = [ 
    [ new RegExp("query.wikidata.org/sparql") , sec10 ] , 
    [ new RegExp("id.nlm.nih.gov/mesh/sparql") , sec10 ] , 
    [ new RegExp("www.nccih.nih.gov")  , 6*sec10 ] , 
] 



export var ttl_rules : any  = {  
    "sattsys.hyperloop.http_json" : function ( args : any ) { 
	
	let url = args.url 
	log("Finding ttl match for " + url)
	// so we will filter based on the url 
	// for now the main apis the I am querying are 
	for (var x  of http_json_rules) { 
	    let [re , ttl ] = x 
	    if ( url.match(re) != null ) {
		//there is a match so we return the ttl 
		log(`Found match with ${re.toString()} and returning ttl=${ttl}`) 
		return ttl 
	    } 
	} 
	
	log("No match found... so return null")
	return null 
    } 
} 


export function get_ttl(x : CallFunctionOps) {
    let {id, args} = x 
    
    let ttl_fn  = ttl_rules[id]
    
    if (ttl_fn) { 
	log("Applying ttl rule for id " + id)
	return ttl_fn(args) 
    } else { 
	log("Ttl rule not found for id " + id)	
	return null
    } 
    
} 
