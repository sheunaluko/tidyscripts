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


   Todo => 
   - use entity extractor first to review what entities are being discussed  (use higher quality model) 
   - for each entity calculate its emedding and add it to the vector store with the payload: 
     { kind: 'entity' , category : '---' , id : '----' }  
      - if an existing entity (with same exact id) is there, then do not add it 

   - What if relations are stored in the database like this 
      { kind: 'relation' , name : 'association' , source : eid , target : eid } 

      where eid is Embedding({source/target}.id) 

   Then when you ask, what is associated with RA, the system does a query for the 
   relation association, filters for source/target to be RA (or an entity e where Embedding(e) is close to Embedding(RA ) 

   
      


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
