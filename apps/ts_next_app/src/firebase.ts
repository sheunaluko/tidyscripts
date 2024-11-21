'use client';

import * as tsw from "tidyscripts_web";
import {getAuth } from "firebase/auth"

/* create logger */ 
const log = tsw.common.logger.get_logger({id : 'firebase'})  ; 
const debug  = tsw.common.util.debug

import * as fu from "./firebase_utils"
import * as cu   from "./cache_utils"
import * as tex from "./tex" 

export {fu , tex} 


/*
   The firebase interface for the APP 

   The fu (firebase_util) object exported from ./firebase_utils provides the core functionality, 
   including the following functions (see the Arugments types below) 

   // Data types 
   interface FirebaseDataStoreOps { app_id, path, data } 
   interface FirebaseDataGetOps   { app_id, path } 

   //authenticated IO 
   fu.store_user_doc(FirebaseDataStoreOps)           [path must be odd] 
   fu.get_user_doc(FirebaseDataGetOps)               [path must be odd] 
   fu.store_user_collection(FirebaseDataStoreOps)    [path must be even] 
   fu.get_user_collection(FirebaseDataStoreOps)      [path must be even] 

   //un-authenticated IO 
   fu.store_doc(FirebaseDataStoreOps)
   fu.get_doc(FirebaseDataGetOps)
   fu.store_collection(FirebaseDataStoreOps)
   fu.get_collection(FirebaseDataStoreOps)


 */




/*
 * The Cache Client provides the client.get and client.set functions with get and set cache 
 * respectively. 
 *
*/ 
var cache_client : any = {

    /*
     * Defines the getter function for the cache client 
     */
    get  : async function(args :any) {
	log(`Cache get request: ${JSON.stringify(args)}`)		
	let {cache_key, app_id} = args;

	let path = [ "cache" , "docs" , cache_key ] 
	let get_ops = { app_id,  path }

	try { 
	    let result = await fu.get_user_doc(get_ops)
	    log(`Cache get completed`)
	    debug.add("cached_result" ,result)
	    if (result == null) {
		log(`FYI result is not cached/ null `) 
	    } 
	    return result 
	} catch (error : any)  {
	    log(`Cache get error: ${error}`)
	    return null 
	} 
	
    } ,  

    /*
     * Defines the setter function for the cache client 
     */
    set : async function(data : any) {
	log(`Cache store request`)	
	let  {	cache_key, app_id, origin_id,  function_id, args, args_hash, result } = data ; 
	let path = [ "cache" , "docs" , cache_key ] 
	let store_ops = {
	    app_id,
	    path,
	    data  
	}
	try {
	    // - store_user_doc( {app_id, path, data } ) [ path odd]	    
	    await fu.store_user_doc(store_ops) 
	    log(`Successful stored in cache with key=${cache_key}`)
	} catch (error : any) {
	    log(`Cache store error: ${error}`)
	} 
	
    }
} 


interface CachedWrappedChatArgs {
    app_id : string,
    origin_id : string,
    args : any 
}


/*
   Going to create a wrapper over the openai client 
 */

export function create_wrapped_client(ops :any) {

    let { app_id, origin_id , log } = ops 

    let wrapped_client = {
	chat : {
	    completions : {
		create : create_cached_wrapped_chat_completion(ops )
	    }
	}
    }

    return wrapped_client 
}


/*
 * Provide app_id and origin_id and a log function and get a function that accepts llm chat args 
 * and returns the llm result; handling caching under the hood 
 */ 
export function create_cached_wrapped_chat_completion(ops : any) {
    let { app_id, origin_id, log  } = ops;
    
    log(`Creating cached wrapped chat completion function for app=${app_id}, origin=${origin_id}`)

    return async function(llm_args : object) {
	// define the args 
	let cwcc_args = {
	    app_id , 
	    origin_id , 
	    args  : llm_args
	}
	// get the result
	log(`Calling cached_wrapped_chat_completion with args: ${JSON.stringify(cwcc_args)}`)
	let result = await cached_wrapped_chat_completion(cwcc_args)
	debug.add('cached_chat_result' , result) 
	return result 
    
    }
    
    
} 



/*
 * Cached wrapped client call
 *
 * 
 * The args object is first hashed 
 * Then the cache_key is built by hashing {app_id, origin_id, function_id, args_hash} 
 * Then request/caching proceeds as expected 
 * 
 */
export async function cached_wrapped_chat_completion(ops : CachedWrappedChatArgs) {
    const { app_id, origin_id , args } = ops ;

    // 1st compute hash of the args
    log(`Generating arg hash`)
    let args_hash = cu.generate_object_hash(args) ;
    debug.add('args_hash' , args_hash) 

    // define function id 
    let function_id = "open_ai_chat_completion" 

    // then compute the cache_key
    log(`Generating cache_key`)
    let cache_key = cu.generate_object_hash({
	app_id, origin_id, function_id , args_hash  
    })
    debug.add("cache_key", cache_key) 

    // now try to retrieve the data
    log(`Requesting cache_key`)
    let data = await cache_client.get({cache_key, app_id}) ;
    debug.add('cache_data' , data)

    if (data ) {
	// got a cached result
	log(`Cache HIT for key: ${cache_key}`)
	return data.result 
    }

    // if we are there then it was a cache_ miss      
    log(`Cache MISS for key: ${cache_key}`)
    log(`Will proceed with call...`)    

    // get the result
    let result = await chat_completion(args) ;

    if (! result ) {
	log(`Result was null or missing; will return and will not cache`)
	return result 
    } 

    log(`Obtained result; will store to cache`)    
    await cache_client.set({
	cache_key, app_id, origin_id,  function_id, args, args_hash, result 
    })

    return result 
} 




export async function chat_completion(args : any) {

    /*
       Take the args and pass it to the vercel function instead 
     */

    let url = "/api/open_ai_chat_2"
    let fetch_response = await fetch(url, {
	method : 'POST' ,
	headers: {   'Content-Type': 'application/json'   },
	body : JSON.stringify(args)
    });
    debug.add("fetch_response" , fetch_response) ;
    let response = await fetch_response.json() ;
    debug.add("response" , response) ;

    return response 
} 





/*
 * Function that sends feedback from the user to firestore backend 
 *
 */ 
export async function give_feedback(msg : string) {

    log(`Request to give user feedback: ${msg}`)
    const auth = getAuth()
    var uid : any = null ;
    
    if (auth.currentUser ){
	uid = auth.currentUser?.uid
	let name = auth.currentUser?.displayName  
	log(`User=${name} is logged in, with id=${uid}`)

    } else {
	log(`No user is logged in`)

    }


    let data = {
	t : tsw.common.util.unix_timestamp_ms() ,
	feedback : msg ,
	uid 
    }
    
    log(`Giving feedback using data: ${JSON.stringify(data)}`)

    let args = {
	app_id : "tidyscripts" ,
	path : ["collections" , "feedback" ] ,
	data  
    } 
    await fu.store_collection(args)
} 



export {getAuth  } ; 
