/* 
   @Copyright Sheun Aluko 
   Mon Dec 21 22:03:25 CST 2020
   Database wrapper around idb-keyval 
*/ 


import * as idbkv from "./idbkv_mod.ts" 
import * as common from "../../common/util/index.ts" ; //common utilities  

/* 
   Main API -- see https://github.com/jakearchibald/idb-keyval 
   It says: 
   
   By default, the methods above use an IndexedDB database named keyval-store and an object store named keyval. You can create your own store, and pass it as an additional parameter to any of the above methods:
   
   Below we always use the 'TIDYSCRIPTS_WEB' db name but change the store based on the 'name' param 
*/ 

const log = common.Logger("db")  // get logger 
const date = common.Date 


export const LOCAL_DB_HANDLE_CACHE : any = {} 
//export const CACHE_CHECK_INTERVAL = 1000*60*5  //5 min 
export const CACHE_CHECK_INTERVAL = 1000*5 

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

export function GET_DB(name : string) { 

    //first attempt to get from a local handle cache 
    if (LOCAL_DB_HANDLE_CACHE[name] ) { 
	log(`Returning db from local cache: ${name}`)
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
    
    let result =  { 
	store, set, get, del, keys, clear 
    }  
    
    //cache it then return it 
    LOCAL_DB_HANDLE_CACHE[name] = result 
    
    log(`Returning db: ${name}`)    
    return result 
} 


/* 
   Will have a special db here to store TTL info 
*/

export var TTL = GET_DB("TTL") ;  



function START_CACHE_CHECK() { 
    setInterval( async function() {
	
	log("checking ttl cache") 
	
	let all = await TTL.keys()
	
	log(`Num ttl keys: ${all.length}`)
	
	let expired = all.filter( (k : number) => k < date.ms_now() ) 
	
	log(`num expired = ${expired.length}`) 
	
      for ( var id of expired ) { 
	  
	  log(`removing id: ${id}`) 
      
          let {db_id, del_id} = TTL.get(id) 
	  //get the db handle 
	  let dbh = GET_DB(db_id) 
	  //and then delete the entry 
	  await dbh.del(del_id)  
	  //and then delete the TTL entry as well 
	  await TTL.del(id) 
	  
	  log("Done") 
	  
      } 
      
   } , CACHE_CHECK_INTERVAL ) 
   
   //TTL.set(time_now_epoch + time_to_live_ms , { db_id , kill_id } )    
} 


