/**
 * Tidyscripts Ontology Of Medicine 
 *
 * Leverages qdrant database and ai API to build, update, and serve a medical ontology
 * Input: unstructured text 
 * Output: Ontology update 
 *  
 */


import {QdrantClient} from '@qdrant/js-client-rest';
import * as common from "tidyscripts_common" ;
import * as llm from './tom_llm' ; 
import * as tu from "./tom_util"  ;  

const {ailand} = common.apis ;
const {embedding1024, prompt} = ailand ;
const {debug} = common.util ; 

/*
   TOM 
   
   let t = await get_tom_collection() ; 
   let resp = await prompt("ai query" , "quick")
   let embedding = await embedding1024("to embed")

   Above we have a vector database reference, AI query capability, and Embedding capability 
   We can combine all this to create a powerful system. 


   Done => 
   - [x] use entity extractor first to review what entities are being discussed  (use higher quality model) 
   - [x] for each entity calculate its emedding and add it to the vector store with the payload: 
     { kind: 'entity' , category : '---' , id : '----' }  
      - [x]  if an existing entity (with same exact id) is there, then do not add it 

   - [x] What if relations are stored in the database like this 
      { kind: 'relation' , name : 'association' , source : eid , target : eid } 


   STATUS -> 

   I have implemented the ability to parse unstructured text into entities and relations,
   and to load those (along with embeddings) into the qdrant db 

   I have also impplemented ability to call remotely via TES, and to get summary of db insertions (as well as db_update object which tracks learning)  


   Todo:
   1) start building some kind of interface over TOM , for querying, monitoring, etc.
   2) [~] build educational pipelines for teaching TOM (ingesting the data and converting to db entries)

   Extensions:
   - add a provenance field into the relation payload

   Thoughts: 
   Time information can be built using DB primitives (entity of 1982,  then have a relation which references a  temporal relation and connects it with a time entity) 
   Same concept can be used for source attributions :) 

   Optimizations:
   - [x] Promise.all( ... ) 

 */

export async function ingest_text(text: string) {
  return await extract_and_store_entities_and_relations(text);
}

/**
 * Like ingest_text but returns which entities and relations were actually added (did not exist already).
 */
export async function ingest_text_with_summary(
  text: string
): Promise<{
  added_entities: tu.Entity[];
  added_relations: RelationWithID[];
  db_update: {
    kind: string;
    text: string;
    entity_eids: string[];
    relation_rids: string[];
    timestamp: string;
    id: string;
  };
}> {
  log(`fn:ingest_text_with_summary`);
  const client = await get_client();
  await init_tom_collection();

  log(`Extracting entities...`);
  const entities = (await llm.extract_entities(text, 'top')) as tu.Entity[];
  debug.add('entities', entities);
  log(`Found ${entities.length} entities`);

  log(`Processing entities asynchronously...`);
  const added_entities = (
    await Promise.all(
      entities.map(async (e) => {
        log(`Checking existence for entity eid=${e.eid}, category=${e.category}`);
        const exists = await tu.entity_exists(e, client);
        log(`Entity ${e.eid} exists=${exists}`);
        if (!exists) {
          log(`Adding new entity ${e.eid}`);
          await process_entity(e);
          return e;
        }
        log(`Skipping existing entity ${e.eid}`);
        return null;
      })
    )
  ).filter((e): e is tu.Entity => e !== null);
  log(`Added ${added_entities.length} new entities`);

  log(`Extracting relations...`);
  const relationsRaw = await llm.extract_relations(text, entities, 'top');
  debug.add('relations', relationsRaw);
  log(`Found ${relationsRaw.length} relations`);

  log(`Processing relations asynchronously...`);
  const added_relations = (
    await Promise.all(
      relationsRaw.map(async (r :any) => {
        const relObj = add_relation_id({
          name: r.name,
          source_eid: r.source,
          dest_eid: r.target,
          kind: 'Relation',
        });
        log(`Checking existence for relation rid=${relObj.rid}`);
        const existsRel = await tu.check_for_rid(relObj.rid, client);
        log(`Relation ${relObj.rid} exists=${existsRel}`);
        if (!existsRel) {
          log(`Adding new relation ${relObj.rid}`);
          await process_relation(r);
          return relObj;
        }
        log(`Skipping existing relation ${relObj.rid}`);
        return null;
      })
    )
  ).filter((r): r is RelationWithID => r !== null);
  log(`Added ${added_relations.length} new relations`);

  const timestamp = new Date().toISOString();
  const entityConcat = added_entities.map((e) => e.eid).join(' ');
  const relationConcat = added_relations.map((r) => r.rid).join(' ');
  log(
    `Computing embeddings for update: entities='${entityConcat}', relations='${relationConcat}'`
  );
  const primaryVec = await embedding1024(entityConcat);
  const secondaryVec = await embedding1024(relationConcat);
  const updateId = await tu.uuid_from_sha256(text);

  const payload = {
    kind: 'knowledge_update',
    text,
    entity_eids: added_entities.map((e :any) => e.eid),
    relation_rids: added_relations.map((r : any)  => r.rid),
    timestamp,
  };
  log(`Upserting knowledge_update with id=${updateId}`);
  await client.upsert('tom', {
    wait: true,
    points: [
      {
        id: updateId,
        vector: { primary: primaryVec, secondary: secondaryVec },
        payload,
      },
    ],
  });
  log(
    `Finished ingest_text_with_summary: added ${added_entities.length} entities, ${added_relations.length} relations, update id=${updateId}`
  );
  return { added_entities, added_relations, db_update: { ...payload, id: updateId } };
}

export async function extract_and_store_entities_from_text( text : string) {
    log(`fn:extract/store/entities/text\nextracting entities...`) 
    let entities = await llm.extract_entities(text, "top") as any;
    debug.add('entities', entities) ;

    log(`Processing...`) 
    for (var i =0 ;i < entities.length ; i ++) {
	await process_entity( entities[i] )  
    }
}

export async function extract_and_store_entities_and_relations( text : string) {
    log(`fn:entitiesANDrelations`) 
    let entities = await llm.extract_entities(text, "top") as any;
    debug.add('entities', entities) ;

    log(`\n\n ---> Processing entities asynchronously...`)
    await Promise.all( entities.map( process_entity ) )
    log(`\n\n ---> DONE processing entities asynchronously...`)
    

    log(`Done processing entities, now proceeding to relations`);
    let relations = await llm.extract_relations(text, entities, 'top');
    debug.add('relations', relations ) ;      

    log(`\n\n ---> Processing Relations asynchronously...`)
    await Promise.all( relations.map( process_relation ) )
    log(`\n\n ---> DONE processing Relations asynchronously...`)

    log(`Done`) 
}


export async function process_relation(r  : any ) {
    
    let relation = {
	name : r.name, 
	source_eid : r.source,
	dest_eid : r.target,
	kind : "Relation" 
    } ;

    log(`Adding the following relation to db`)
    console.log(relation)
    
    let result = await add_relation_to_db(relation);
    debug.add('relation_add_result' , result) 

    log(`Done`) 
    return result 
}






interface Relation {
    kind : string,
    name : string,     
    source_eid :  string,
    dest_eid :  string ,

}

interface RelationWithID extends Relation {
    rid : string,
}


export  function add_relation_id( r: Relation ) {
    //first we check if the relation already exists in the database
    //a relation id uniquely specifies a relation by concatenating the name_source_eid_dest_eid
    let { name, source_eid, dest_eid }  = r ; 
    let rid = `${name}:: (${source_eid}) -> (${dest_eid})`
    return {
	...r ,rid 
    }
} 

/*
   Some thoughts on 'relations'
   
   the relation name can be used to create more specificity, such as
   'causes_infrequently' , or 'usually preceded by'

   There are some benefits of this:
   
   1) the embedding of the name will inherit this semantic specificity and be useful in the future (finding similar relations, merging relations)

   2) It keeps the payload simple

   3) It encourages building higher level features on top of queries that retrieve many sub associations and create a gestalt or final impression based on these  
   
   
 */

export async function add_relation_to_db(r : Relation) {

    const client = get_client() ; 
    
    let relation_with_id = await add_relation_id(r) ;
    let {name, source_eid, dest_eid , rid } = relation_with_id ;

    //check the database (tom collection) for an object with rid field equal to this one
    let exists = await tu.check_for_rid(rid, client) ;

    if (exists) {
	//if it is found then log we are skipping
	log(`Relation with rid=${rid} already exists, and will be skipped`)
	return 
    }

    //if it is not found then we calculate the embedding of the name field
    let name_embedding = await tu.embedding1024(name)
    let rid_embedding  = await tu.embedding1024(rid) 

    
    //create a data point , log the point, before adding to qdrant db

    const pt = {
	//what if i make the id the hash of the rid? 
	id : await tu.eid_to_uuid(rid) ,  
	vector : {
	    primary :  name_embedding,
	    secondary : rid_embedding, 
	} , 
	payload : {
	    rid , 
	    name ,
	    source_eid,
	    dest_eid , 
	    kind : "relation" 
	} 
    } ; 
    
    log(`The following pt will be uploaded`) ;
    console.log(pt) 
    
    await client.upsert('tom' , {
	wait : true ,
	points : [
	    pt 
	]
    });

    log(`Done`) 

    
    

}

export async function test_entity_extraction() {
    let text = llm.example_texts[0] ;
    return extract_and_store_entities_from_text(text) ; 
}

export async function test_full_extraction_and_storage() {
    log(`fn:full_test`) 
    let text = llm.example_texts[0] ;
    return await extract_and_store_entities_and_relations( text ) ; 
}

export async function test_entity_and_association_extraction() {
    log(`fn:test_entity_and_association_extraction`) 
    let text = llm.example_texts[0] ;
    log(`getting entities`)
    let entities = await llm.extract_entities(text, 'top') ;
    debug.add('entities', entities ) ;
    log(`getting relations`)    
    let relations = await llm.extract_relations(text, entities, 'top');
    debug.add('relations', relations ) ;      
    return relations 
    
}


export async function process_entity( e : tu.Entity ) {
    log(`fn:process_entity`)
    console.log(e) 

    log('getting client') 
    const client = await get_client()

    //ensure the tom collection exists
    await init_tom_collection() ; 

    
    //parse the entity
    var { eid, category } = e ;
    
    //first check if it exists in the DB
    log(`Checking existence for eid=${eid}, category=${category}`) ; 
    let exists = await tu.entity_exists(e , client ) ;
    log(`exists=${exists}`) ;

    if (exists) {
	log(`Entity ${eid} already exists and will be skipped`) ; 
    } else {
	log(`Entity ${eid} DOES NOT exist`) ; 	
	log(`Calculating embeddings...`) ;
	let with_embeddings = await tu.add_embeddings(e) ;
	let  {
	    category , eid_vector, category_vector 
	} = with_embeddings ;

	//put the entity into the database
	log(`Writing entity to db`)

	const pt = {
	    //what if i make the id the hash of the eid? 
	    id : await tu.eid_to_uuid(eid) ,  // had a bug here because of omiting await :( 
	    vector : {
		primary : eid_vector ,
		secondary : category_vector 
	    } , 
	    payload : {
		eid : with_embeddings.eid,			
		category ,
		kind : "entity" 
	    } 
	}
 
	log(`The following pt will be uploaded`) ;
	console.log(pt) 
	
	await client.upsert('tom' , {
	    wait : true ,
	    points : [
		pt 
	    ]
	});

	log(`Done`) 

    }
}












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

	log(`Finished initializing client`) 
	client_initialized = true ;
	return c ; 
    }
}

export async function get_collections() {
    return (await ( get_client()).getCollections()).collections 
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
	    vectors : {
	
		primary : { size : 1024 , distance : 'Dot'}  ,
		secondary : { size : 1024 , distance : 'Dot'}  ,
	    } 
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
