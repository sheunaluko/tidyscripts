/* 
   parameter mgmt 
   Thu Jan  7 21:33:36 CST 2021
   @copyright sheun aluko 
*/

import {GET_DB } from  "./apis/db.ts" 
import {Logger } from  "../common/util/logger.ts" 
import {wait_until } from  "../common/util/async.ts" 

//define logger 
const log = Logger("params")

//define some default namespaced parameters 
//anything stored in the DB will OVERRIDE these (see below) 
export var PARAMS : any = { 
    "hyperloop.default_host" : "sattsys.com/api/hyperloop" , 
    "hyperloop.default_port" : 80 ,     
    "hyperloop.default_wss"  : true, 
} 

// get a db instance 
const PARAM_DB = GET_DB("parameters") 

// read the param_db and populate the parameters 
var params_are_loaded = false ; 

(async function populate_params() { 
    for (var k of (await PARAM_DB.keys()) ) {
	log("Processing param key= " + k) 
	let v = await PARAM_DB.get(k) 
	PARAMS[k]  = v 
    } 
    params_are_loaded = true 
    log("Finished loading params") 
})() //call this async function immediately 



/* 
   Begin external interface 
*/ 

export async function ready() { 
    //for external interface to wait on param loading before attempting to use the params 
    return wait_until( ()=> params_are_loaded , 10000 , 100 )
} 


// set a parameter ephemerally 
export function set(k : string,v : any) {  PARAMS[k] = v  } 

// set a parameter permanently  
export async function setp(k : string ,v : any) { 
    //first we set it locally 
    set(k,v) 
    //then we update the database too so that it persists later 
    await PARAM_DB.set(k,v) 
} 

// get a parameter 
export function get(k : string) { return PARAMS[k] } 

// get a parameter but ensure asynchronous completion of loading first  
export async function aget(k : string) {  
    await ready() 
    return PARAMS[k] 
} 

// delete a parameter from the db 
export async function remove_from_db(k : string) {
    await PARAM_DB.del(k) 
} 
