/* 
   @Copyright Sheun Aluko 
   Mon Dec 21 22:03:25 CST 2020
   Database wrapper around idb-keyval 
*/ 


import * as idbkv from "./idbkv_mod.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  

/* 
   Main API DB api inspired by (https://github.com/jakearchibald/idb-keyval) 

   The main interface is 
   test_db = GET_DB("test")  
   let { 
     set_with_ttl, 
     get , 
     keys, 
   } = test_db 
   
   Note that any client which uses this api, MUST call START_CACHE_CHECK(interval) in order to get 
   automatic TTL functionality 
   
*/ 

export const log = common.Logger("db")  // get logger 
const date = common.Date 


export const LOCAL_DB_HANDLE_CACHE : any = {} 
//export const CACHE_CHECK_INTERVAL = 1000*60*5  //5 min 
export var CACHE_CHECK_INTERVAL = 1000*5 

export const default_store_name = "main_store" 
export const default_db_header  = "TIDYSCRIPTS_WEB_" 

/*
 issue im having is that the upgradeneeded is where the object store is created, but it only 
 fires on VERSION changes 
 
 <- OPTION 1:  in the onupgradeneeded function I can just create ALL the required stores upfront which tidyscripts 
 will use. 
 
 option 2 : could keep track existing databases / object stores and dynamically update them to get new handle  -- wil figure this out 
 
 
 option 3 [ ] ill implement --- simply create new database for each ONE! 
    new idbkv.Store('TIDYSCRIPTSWEB_' + name , 'main_store' ) 
*/

export function GET_DB(name : string,verbose=true) { 

    //first attempt to get from a local handle cache 
    if (LOCAL_DB_HANDLE_CACHE[name] ) { 
	if (verbose)  { 
	    log(`getting db from local cache: ${name}`) 
	} 
	return LOCAL_DB_HANDLE_CACHE[name]
    } 
    
    // create the client store 
    var store = new idbkv.Store(default_db_header + name, default_store_name) ;
    // and define wrappers 
    function set(key:string,val:any) {return idbkv.set(key,val, store) } 
    function get(key:string) {return idbkv.get(key,store) } 
    function del(key:string) {return idbkv.del(key,store) } 
    function keys() {return idbkv.keys(store) } 
    function clear() {return idbkv.clear(store) } 
    
    /* will this recursive stuff work ? */ 
    async function set_with_ttl(ops : { id : string, ttl_ms : number, value : any }) {
	let {id, ttl_ms, value} = ops ; 
	let expiration = ttl_ms + date.ms_now()
	log(`In db "${name}" setting "${id}" with ttl_ms ${ttl_ms}, expiration = ${expiration}`)    
	await set(id,value) 
	await TTL.set(expiration, { db_id : name , del_id : id }) 
	log("done setting with ttl \\(^.^)/")
    } 
    
    let result =  { 
	store, set, get, del, keys, clear , set_with_ttl 
    }  
    
    //cache it then return it 
    LOCAL_DB_HANDLE_CACHE[name] = result 
    
    if (verbose) { 
	log(`getting db: ${name}`)    
    } 
    return result 
} 


/* 
   Will have a special db here to store TTL info 
*/

export var TTL = GET_DB("TTL") ;  

export function set_cache_check_interval(n : number) { 
    CACHE_CHECK_INTERVAL  = n 
    log("Updated cache check interval to " + n  + " ms" ) 
} 


export var cache_check_interval_id : any = null


export async function do_cache_check() {
    
    	let all = await TTL.keys()
	let num = all.length 
	let expired = all.filter( (k : number) => k < date.ms_now() ) 
	let num_expired = expired.length 
	
	let  removed : any  = [] 
	
	for ( var id of expired ) { 
	    
	    //log(id) 
	  
            let {db_id, del_id} = await TTL.get(id) 
	    //get the db handle 
	    let dbh = GET_DB(db_id,false) 
	    //and then delete the entry 
	    await dbh.del(del_id)  
	    //and then delete the TTL entry as well 
	    await TTL.del(id) 
	    removed.push( {db_id,del_id}) 
	} 
	
	log(`CacheCheck |> ${num_expired}/${num} expired:`) 
	if (num_expired > 0 ) { 
	    log(removed)  
	} 

} 

export function START_CACHE_CHECK(interval : number) {  
    
    if (cache_check_interval_id) { 
	log("Already checking, will clear old interval.") 
	STOP_CACHE_CHECK()
    } 
    
    set_cache_check_interval(interval) 
    
    cache_check_interval_id = setInterval(do_cache_check,CACHE_CHECK_INTERVAL) 
   
} 

export function STOP_CACHE_CHECK() { 
    clearInterval(cache_check_interval_id) 
    log("Stopped cache check") 
} 

