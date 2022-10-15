
import * as util from "../../common/util/index" 
import * as db from "./db" 
import * as wiki from "./wikidata" 


let {fp,
     Logger } =  util ; 

let log = Logger("db_util") ; 

/* 
   
   Want to have cahing abstraction utilities  ... 
   
 */ 

interface RetrievalResult { 
    [k:string] : any 
} 

interface CDIR_OP { 
    db_id :  string , 
    ids : string[] , 
    ttl_ms : number , 
    retrieval_fn : (ids: string[]) => Promise<RetrievalResult> ,   //should  take return a MAP of ids to values 
} 

export async function cached_db_id_request( ops : CDIR_OP ) {
    
    let {  
	db_id, 
	ids, 
	retrieval_fn   , 
	ttl_ms , 
    } =  ops ; 
    
    //default ttl 1  day 
    ttl_ms = ttl_ms||1000*60*60*24 ; 
    
    //get the db 
    let the_db =  db.GET_DB(db_id) //  - 
    
    //now we async request all the ids [ [], [] ... ] 
    let cached = fp.zip(  ids, await Promise.all( ids.map( id => the_db.get(id) ) )  )
    
    //init thangs 
    let results : RetrievalResult = {}  ; 
    let to_request : any[]  = [ ]  ;
    
    //loop 
    for (var [id ,value] of cached) {
	if (value) {  results[id as string]  = value  } else { to_request.push(id) }  
    } 
    
    //do the request now  
    if (to_request.length> 0) { 
	log(`Requesting ${to_request.length} ids for db: ${db_id}`)
	let requested_results = await retrieval_fn(to_request) 
	
	//and loop again to store 
	for (var [id,value ]  of fp.map_items(requested_results) ) { 
	    results[id] = value //store it in the return object 
	    the_db.set_with_ttl({id,ttl_ms,value}) //and in the database -- async (no await) 
	} 
    } else { 
	log("Everything cached not requesting!") 
    } 
    
    //and then return the results 
    return results 
} 



export async function mesh_retrieval_function( ids : string[]) { 
    
    let tmp_results = await  wiki.props_for_qids(ids,["P486"])
    
    console.log(tmp_results) 
    
    let results : RetrievalResult = {}  ;     
    
    for (var qid of ids) { 
	
	//get our caching parameters 
	let id = qid ; 
	let ttl_ms  = 1000*60*60*24*7 // 1 week 
	
	//try to access it 
	if (tmp_results[qid]) {
	    let mid = tmp_results[qid]['P486'][0].match_label
	    let value = { value : mid} 		
	    //store as object so receiver can distinguish null ids from missing		
	    results[qid] = value 
	} else {
	    //there is NO matching mesh id for this qid 
	    let value = { value : null } 
	    results[qid] = value 
	} 
    } 
    
    return results 
} 

export async function cached_mesh_id_request( ids : string[]) {
    let ops = { 
	db_id :  "mesh_ids" , 
	ttl_ms :  1000*60*60*24*7 ,  // 1 week   
	retrieval_fn  : mesh_retrieval_function  ,  
	ids 
    } 
    return await cached_db_id_request(ops) 
} 



export async function qid_retrieval_function( ids : string[]) { 
    
    let tmp_results = await  wiki.QidLabels(ids) 
 
    
    if ( tmp_results.error  || 
	 (tmp_results.result.value.error) ) { 
	
	log("Error with mesh retrieval!") 
	log(tmp_results) 
	return ( {}  as RetrievalResult ) 
    } 
    
    
    
    let entities = tmp_results.result.value.entities  
    
    return fp.map_over_dic_values(entities, (x)=>x.labels.en.value)
    
} 

export async function cached_qid_request( ids : string[]) {
    let ops = { 
	db_id :  "qid_labels" , 
	ttl_ms : 1000*60*60*24*7 ,  // 1 week 
	retrieval_fn  : qid_retrieval_function  ,  
	ids 
    } 
    return await cached_db_id_request(ops) 
} 


