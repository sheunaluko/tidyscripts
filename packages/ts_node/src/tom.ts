/**
 * Tidyscripts Ontology Of Medicine 
 *
 * Leverages qdrant database and ai API to build, update, and serve a medical ontology
 * Input: unstructured text 
 * Output: Ontology update 
 *  
 */


import {QdrantClient} from '@qdrant/js-client-rest';
import * as common from "tidyscripts_common"
import * as llm from './tom_llm' 


const {ailand} = common.apis ;
const {embedding1024, prompt} = ailand ; 

/*
   TOM 
   
   let t = await get_tom_collection() ; 
   let resp = await prompt("ai query" , "quick")
   let embedding = await embedding1024("to embed")

   Above we have a vector database reference, AI query capability, and Embedding capability 
   We can combine all this to create a powerful system. 

   We need an ontology schema however 

 */













/*
  UTILS BELOW -> 
 */


var client : any = null ;
var client_initialized : boolean = false ; 
var database_url = "http://127.0.0.1:6333"  
const log = common.logger.get_logger({id : 'tom' }) ;


export function set_database_url(url : string) {
    database_url = url ;
    client_initialized = false ; 
}

export function get_client() {
    if (client_initialized) {
	log("Returning (already) initialized client") 
	return client
	
    } else {
	
	log(`Initializing client with url: ${database_url}`) ;
	let c = new QdrantClient({url: database_url  });
	client = c ;
	client_initialized = true ; 
	return c ; 
    }
}

export async function get_collections() {
    return (await (get_client()).getCollections()).collections 
}


//checks if the tom collection exists in the qdrant database
export async function tom_collection_exists() {
    let colls = await get_collections()
    let names = colls.map((x:any)=>x.name) ;
    return names.includes('tom') 
}

export async function init_tom_collection() {
    //first checks if it exists - if not it initializes it
    if (! await tom_collection_exists() ) {
	
	log(`T O M .  collection does not exist, need to initialize`) ;
	let c = get_client() ;
	let r = await c.createCollection( 'tom' , {
	    vectors : {size : 1024 , distance : 'Cosine' } 
	})
	log(`result`) 
	console.log(r)
	log(`done`) 
    } else {
	log(`T O M .  collection already initialized`) ;
    }
}

export async function get_tom_collection() {
    await init_tom_collection() ;
    return await ( (get_client()).getCollection('tom') ) 
}



export {llm}
