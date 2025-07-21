/**
 * Tidyscripts Ontology Of Medicine 
 *
 * Leverages surrealdb (multimodal: embedding/graph/table) database and AI APIs to build, update, and serve a medical ontology
 * with built in entity and relation deduplication 
 * 
 * Input: unstructured text 
 * Output: Ontology creation / update 
 * 
 * Usage: 
 * ```
 * let results = await ingest_text("diuretics are used to treat heart failure exacerbations")  
 * //see ingest_text docs below 
 * ```
 * 
 * @packageDocumentation   
 */

import * as common       from 'tidyscripts_common';
import {path}            from "./io" ;
import { z }             from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
const { ailand } = common.apis;
const {CacheUtils} = common.apis.cache ; 
const { embedding1024, structured_prompt } = ailand;
import {FileSystemCache} from "./apis/node_cache" ;
import Surreal, { RecordId } from 'surrealdb'; 

const log   = common.logger.get_logger({ id: 'tom' });
const {color_string} = common.logger ; 
const debug = common.util.debug;
var _client : any = null  ; 


var default_tier = 'top' ;

export function set_default_tier(t : string) {
    default_tier = t ; 
}

/*
   Todo - 
   [ ] Add check to process_relations fn to ensure that all referenced eids exist , can create helper fn check_for_ids( ids : eid[]) ; 
        - if any eids missing then THROW error with logging 
   [ ] Also can use the check_for_ids fn before any entities are added - filter out ALL that already exist (saves a db ping for each) 
   [x] update relation extraction to include metadata  (did not work well as of Sun Jul  6 04:43:57 EDT 2025) 

*/

export async function get_client() {
    if (_client) return _client;
    log(`Connecting to SurrealDB → `);
    const db = new Surreal();
    let url = process.env['SURREAL_DB_URL']  as string ;
    let user = process.env['SURREAL_DB_USER']  as string
    let pw = process.env['SURREAL_DB_PW']  as string
    
    log(`Using surreal url=${url}`) ;
    log(`Using surreal user=${user}`) ;    
    
    // Open a connection and authenticate
    await db.connect(url, {
	namespace: "tom",
	database: "tom",
	auth: {
	    username: user,
	    password: pw,
	}
    });

    log(`got client`) ; 

    _client = db;
    return db;
}

//-------------------------------------------------------------
// 2.  UTILITIES (UUIDs, embeddings, existence checks)
//-------------------------------------------------------------

var parent_cache_dir = process.cwd()  ; 
if (process.env['TIDYSCRIPTS_DATA_DIR'] ) {
    parent_cache_dir  = process.env['TIDYSCRIPTS_DATA_DIR']
    log(`Found tidyscripts data dir for cache use`) 
} else {
    log(`Unable to find tidyscripts data dir for cache use`) 
}

const cacheDir = path.join(  parent_cache_dir, '.cache/tom' ) ;
log(`Using cacheDir = ${cacheDir}`) ; 

export const fs_cache = new FileSystemCache<any>({
    cacheDir,
    onlyLogHitsMisses : true,
    logPrefix: "surreal_cache" ,
    namespace: "tom" , 
});

export const cached_embedding = CacheUtils.memoize( embedding1024,  fs_cache  ) ;
export const cached_structured_prompt = CacheUtils.memoize( structured_prompt, fs_cache ) ; 

// --

export function eid_to_uuid(eid: string) {
    return common.apis.cryptography.uuid_from_text(eid);
}
export function uuid_from_sha256(text: string) {
    return common.apis.cryptography.uuid_from_text(text);
}

export interface Entity {
    kind: 'entity';
    category: string;
    eid: string;
}
export interface EntityWithEmbeddings extends Entity {
    eid_vector: number[];
}

export async function add_embeddings(e: Entity): Promise<EntityWithEmbeddings> {
    const eid_vector      = await cached_embedding(e.eid);
    return { ...e, eid_vector} 
}


async function check_for_eid(eid: string, client?: InstanceType<typeof Surreal>) {
    const db = client ?? (await get_client());
    // Query returns a tuple of one array of rows; cast to expected type
    const result = await db.query(`SELECT eid FROM entity WHERE eid = $eid LIMIT 1`, { eid }) as [{ eid: string }[]];
    const row = result[0]?.[0];
    let id_exists = ( row ? true : false ) ;

    if (id_exists) {
	log(`id=${eid} ${color_string('green','exists')}`)
    } else {
	log(`id=${eid} ${color_string('red','doesnt exist')}`) ; 
    }
    
    return id_exists 
    
}

async function check_for_rid(rid: string, client?: InstanceType<typeof Surreal>) {
    const db = client ?? (await get_client());
    // Query returns a tuple of one array of rows; cast to expected type
    const result = await db.query(`SELECT rid FROM relations WHERE rid = $rid LIMIT 1`, { rid }) as [{ rid: string }[]];
    const row = result[0]?.[0];
    let id_exists = ( row ? true : false ) ;

    if (id_exists) {
	log(`id=${rid} ${color_string('green','exists')}`)
    } else {
	log(`id=${rid} ${color_string('red','doesnt exist')}`)
    }

    return id_exists 
    
}


//-------------------------------------------------------------
// 3.  ENTITY & RELATION WRITERS
//-------------------------------------------------------------

export function format_id(s : string) {
    return s.replace( new RegExp(" ", 'g') , "_" )  ; 
}

export async function process_entity(e: Entity) {
    
    const db = await get_client();
    
    if (await check_for_eid(e.eid, db)) {
	//log(`Finished processing entity ${e.eid}, already exists`)
	return false ; 
    } 
    
    var { eid_vector, eid, category   } = await add_embeddings(e);

    let entity = {
	id: eid, 
	eid , 
	category , 
	eid_vector  
    }

    log(`creating entity`)
    debug.add('entity' , entity)

    await db.query(`INSERT IGNORE INTO entity $entity;`, {entity} ) ;
    
    log(`Ensuring that the category exists`)
    let category_id = category ; 
    debug.add("category_id" , category_id) ;
    
    log(`Ensuring category:${category_id}`)
    await db.query(`
	    INSERT IGNORE INTO category { 
                  id  : $category_id , 
                  name : $category_id , 
                  created : time::now()  
            } 
    `, { category_id }  ) ;
    log(`Finished with category query`)
    
    log(`Now creating category relation`) ;
    
    await db.query(`
        LET $e = type::thing("entity", $e1) ; 
        LET $c = type::thing("category", $c1);
        RELATE $e -> has_category -> $c ; 

    `, {
	e1 : entity.eid  ,
	c1 : category_id , 
    });

    
    log(`Finished processing entity and its category`)
    return true ; 
    
}

interface RelationBase { kind: 'relation'; name: string; source_eid: string; dest_eid: string; }

export function add_relation_id(r: RelationBase) {
    let rid = format_id(`${r.source_eid}->${r.name}->${r.dest_eid}`) ;
    return { ...r, rid  }
}

export async function reset_tom_db() {
    //Not actually working currently -- permisions issue? I ended up pasting manually runnign the query to reset the db 
    const db = await get_client();
    log(`Resetting db`)
    return await db.query(`
REMOVE DB tom ;

DEFINE DB tom;

DEFINE INDEX ridx ON relations FIELDS rid_vector HNSW DIMENSION 1024 DIST COSINE;
DEFINE INDEX eidx ON entity    FIELDS eid_vector HNSW DIMENSION 1024 DIST COSINE;`) 
}

interface RelationMetadata {
   kud_id  : string  ,  //knowledge_update_id 
} 	  


export async function process_relation(r: { name: string; source: string; target: string }, metadata: RelationMetadata  ) {
    
    const db = await get_client();
    
    const base: RelationBase = { kind: 'relation', name: format_id(r.name), source_eid: format_id(r.source), dest_eid: format_id(r.target) };
    
    const relation = add_relation_id(base);
    
    let {rid, name, source_eid, dest_eid} = relation ;

    //check if it exists already
    let relation_exists = await check_for_rid(rid , db ) ;
    if (relation_exists) {
	//log(`Relation with id=${rid} already exists`) ;
	return false 
    } else {
	//log(`Relation with id=${rid} does not exist`) ;	
    }
	
    let relation_data = { name, rid, source_eid, dest_eid, kud_id : metadata.kud_id  } ;
    log(`Proceeding with db query to add relation`)
    
    await db.query(`
     LET $in  = type::thing("entity",$source_eid) ; 
     LET $out = type::thing("entity",$dest_eid) ; 
     LET $table = type::table($name) ;
     LET $kud  = type::thing("knowledge_update",$kud_id) ; 

     RELATE $in->$table->$out CONTENT { 
         id : $rid  , 
         rid : $rid , 
         kud : $kud , 
     }
    `, relation_data) ;

    log(`Proceeding with db query to store rid vector`)

    const rid_vector  = await cached_embedding(rid);    
    let relation_vector_data = { rid, rid_vector, name  }; 
    await db.query(`INSERT IGNORE INTO relations $relation_vector_data`, {relation_vector_data})

    log(`Finished`)  ;

    return rid
}

//-------------------------------------------------------------
// 4.  LLM HELPERS (entity / relation extraction, code synthesis)
//-------------------------------------------------------------
const lc_string = z.string().transform((s) => s.toLowerCase());
const id_string = lc_string.transform( (s) => s.replace(/ /g ,"_") ) ;

const Categories = [
    'condition',
    'symptom',
    'medication',
    'procedure',
    'imaging',
    'lab test',
    'diagnostic test',
    'organ',
    'organ system',
    'clinical finding',
] as const;

async function extract_entities(text: string, tier? : string) {

    tier = tier || default_tier
    log(`Using tier=${tier}`)
    
    const rf = zodTextFormat(
	z.object({
	    entities: z.array(z.object({ eid: id_string, category: z.enum(Categories), importance: z.number() })),
	}),
	'entities',
    );
    const prompt = `

You are a medical knowledge expert helping to build a clinical decision support system. 

Extract all medical entities in the text, including the category of each entity and its relative importance (0-1) in the text.

Each entity will be identified by the eid field (entity id) which is a human readable string which is the direct name of the entity

INPUT:
${text}
`;
    const res: any = await cached_structured_prompt(prompt, rf, tier);
    let entities = res.entities as Entity[];
    debug.add('raw_entities' , entities )    

    log(`formatting entities`) ; 
    for (var e of entities) {
	e.eid = format_id(e.eid);
	e.category = format_id(e.category); 	
    }
    
    debug.add('extracted_entities' , entities )
    return entities; 

}

async function extract_relations(text: string, entities: Entity[], tier? : string) {

    tier = tier || default_tier
    log(`Using tier=${tier}`)
    
    const rf = zodTextFormat(
	z.object({ relations: z.array(z.object({ name: lc_string, source: lc_string, target: lc_string  })) }),
	'relations',
    );
    
    const prompt = `

You are a medical knowledge expert helping to build a clinical decision support system. 

Examine the text and identify relationships between the listed entities. 

Each relationship should include a name (the name of the relationship), the source (the source entity entity id - eid) and the target (the target eid). 

The name should concisely capture the essence of the relationship, and avoid being too wordy. 

Make your choices and output as clean and consitent as possible since your output will be used for building a medical grade knowledge graph.

ENTITIES:
${JSON.stringify(entities)} 

INPUT TEXT:
${text}

    `;
    
    const res: any = await cached_structured_prompt(prompt, rf, tier);
    let relations = res.relations as { name: string; source: string; target: string }[];

    debug.add('relations', relations) ;
    return relations 
    
}

async function validate_relations(relations: { name: string; source: string; target: string }[], tier?: string) {
    tier = tier || default_tier;
    log(`Validating relations using tier=${tier}`);
    
    const rf = zodTextFormat(
        z.object({ rejected_relations: z.array(z.number()) }),
        'rejected_relations',
    );
    
    // Build relations string with indices in format: index: source -> name -> target
    const relations_string = relations.map((r, index) => 
        `${index}: ${r.source} -> ${r.name} -> ${r.target}`
    ).join('\n');
    
    const prompt = `
You are a medical knowledge expert helping to build a clinical decision support system.

Examine the following medical relations and identify which ones should be rejected.

IMPORTANT: Be CONSERVATIVE in rejecting relations. Only reject relations that are:
1. Anatomically impossible (e.g., "heart -> located_in -> brain")
2. Medically contradictory (e.g., "fever -> decreases -> body_temperature")
3. Logically nonsensical (e.g., "aspirin -> symptom_of -> headache")
4. Extremely highly unlikley to be true (e.g., "dialysis -> treats -> cellulitis") 

DO NOT reject relations that are:
- Plausible medical associations (symptoms, conditions, treatments)
- Less common but possible medical relationships
- Relationships you're uncertain about
- Common symptom-condition relationships


Only return the indices of relations that are clearly medically impossible or contradictory.
When in doubt, DO NOT reject the relation.

RELATIONS TO VALIDATE:
${relations_string}
    `;

    debug.add('validation_prompt' , prompt) ; 
    
    const res: any = await cached_structured_prompt(prompt, rf, tier);
    const rejected_relation_indices = res.rejected_relations as number[];
    
    const validated_relations = relations.filter((r, index) => !rejected_relation_indices.includes(index));
    const rejected_relations = relations.filter((r, index) => rejected_relation_indices.includes(index));
    
    debug.add('validated_relations', validated_relations);
    debug.add('rejected_relations', rejected_relations);
    
    return {
        validated_relations,
        rejected_relations
    };
}

async function extract_relations_with_metadata(text: string, entities: Entity[], tier? : string) {

    tier = tier || default_tier
    log(`Using tier=${tier}`)
    

    const metadata = z.array( z.array(z.string()).length(2) ) ; 
    
    const rf = zodTextFormat(
	z.object({ relations: z.array(z.object({ name: lc_string, source: lc_string, target: lc_string, metadata : metadata })) }),
	'relations',
    );
    
    const prompt = `

You are a medical knowledge expert helping to build a clinical decision support system. 

Examine the text and identify relationships between the listed entities. 

Each relationship should include a name (the name of the relationship), the source (the source entity entity id - eid) and the target (the target eid), as well as metadata. 

The name should capture the essence of the relationship, and avoid trying to capture all nuances of the relationship which can instead be done with the metadata field. 

Each relationship might need further qualification or context, and this is provided by the metadata field in the relation which is an array of key,value pairs (as strings) that let you make various qualifications or context clarifications on the relationship which is being defined. 

Each pair of strings in the metadata array should though of as key,value pairs that would be parsed into a record object and should be structured as follows: 

The first string is a qualfier on the relation, such as: 

if, when, only if, unless, during, after, before, within, severity, frequency, probability, duration, intensity, evidence_level 

or any other qualifier you deem appropriate. 

The second string is the object of the qualifier that finishes the context/clarificaiton needed 

If no metadata is necessary or appropriate then return an EMPTY array. 

Make your choices and output as clean and consitent as possible since your output will be used for building a medical grade knowledge graph.

ENTITIES:
${JSON.stringify(entities)} 

INPUT TEXT:
${text}

    `;
    
    const res: any = await cached_structured_prompt(prompt, rf, tier);
    let relations = res.relations as { name: string; source: string; target: string }[];

    debug.add('relations', relations) ;
    return relations 
    
}


//-------------------------------------------------------------
// 5.  INGESTION API
//-------------------------------------------------------------

export var test_text_1 = `An immune system illness that mainly causes dry eyes and dry mouth. Sjogren's syndrome is an immune system illness. It occurs when the body's immune system attacks its own healthy cells. Sjogren's often occurs with other immune ailments, such as rheumatoid arthritis and lupus. The two most common symptoms are dry eyes and a dry mouth. Eyes might itch or burn. The mouth might feel full of cotton. Treatments include eye drops, medicines and eye surgery to relieve symptoms.`

export async function ontologize(text : string) {

    log(`Extracting entities`) 
    const entities = await extract_entities(text);

    debug.add('entities' , entities) ; 
    log(`Got entities, now extracting relations`) 
    
    const relations = await extract_relations(text, entities);

    debug.add('relations' , relations) ;
    log(`Got relations`);

    var  {validated_relations , rejected_relations} = await validate_relations(relations  ) ; 
									       

    return {
	entities, relations  , text , validated_relations, rejected_relations 
    } 

}


//test 1 is an interesting case of the validation removing appropriately wrong/vague relations 
export async function test1() { return await ontologize(test_text_1) } ;
export async function test2() { return await ingest_text(test_text_1, { test :true }) } ;

/**
 * Main function for ingesting text 
 * Will take input text as a string and will extract entities and relations, validated them
 * Then uploade them into surrealdb instance 
 */
export async function ingest_text(text: string, metadata : any) {

    /*
       Todo - create metadata support  
       
     */

    const knowledge_id = await uuid_from_sha256(text)
    log(`KNOWLEDGE UPDATE ID=${knowledge_id}`)
    
    log(`Getting client`) 
    const db = await get_client();

    log(`Ontologizing`)
    let {entities, validated_relations, rejected_relations} = await ontologize(text) ;

    
    var added_entities: Entity[] = [];
    var skipped_entities: Entity[] = [];    

    log(`Processing entities`) ; 
    await Promise.all(
	entities.map(async (e:any) => {
	    let added = await process_entity(e) ;
	    let action = "" ; 
	    if (added ) { 
		added_entities.push(e) ; action = "added" ; 
	    } else {
		skipped_entities.push(e) ; action = "skipped" ; 
	    }
	    
	    //log(`${action} entity:: ${e.eid}`)	 ; 
	})
    ); 

    var added_relations : any[] = [] ; 
    var skipped_relations : any[] = [] ; 

    log(`Processing relations`) ; 
    await Promise.all(
	validated_relations.map(async (r:any) => {
	    let added = await process_relation(r, {kud_id: knowledge_id}) ;
	    let action = "" ;
	    if (added ) {
		added_relations.push(r) ; action = "added"; 
	    } else {
		skipped_relations.push(r) ; action = "skipped" ; 
	    }

	})
    );
    
    log(`Summarizing knowledge update...`) 	

    let knowledge_update = { 
	id: knowledge_id,
	metadata  , 
	entity_eids: added_entities.map((e:any) => e.eid),
	relation_rids: added_relations.map((r:any) => r.rid),
	timestamp: new Date().toISOString(),
	text_vector: await cached_embedding(text),
    } ;

    db.query(`INSERT IGNORE INTO knowledge_update $knowledge_update`, { knowledge_update}); 

    log(`Finished saving knowledge update`)  ;

    log(`Will link relations to knowledge update`)  ;

    //--- code here 




    
    
    return { added_entities, added_relations, entities, validated_relations, rejected_relations, skipped_relations, skipped_entities };
}


// vector search (by entity, relation name, knowledge update text , and relation id (rid)  ) 

export async function entity_vector_search(eid : string, limit : number) {
    limit = limit || 5 ; 
    let e1 = await cached_embedding(format_id(eid)) ; 
    let query = `
select eid, vector::distance::knn() AS distance from entity where eid_vector <|${limit},40|> $e1 ORDER BY distance asc
    ` ;
    log(`Query=${query}`)
    return await _query(query, {e1}) ; 
}

export async function rid_vector_search(rid : string, limit : number) {
    limit = limit || 5 ; 
    let e1 = await cached_embedding(format_id(rid)) ; 
    let query = `
select rid, vector::distance::knn() AS distance from relations where rid_vector <|${limit},40|> $e1 ORDER BY distance asc 
    ` ;
    log(`query=${query}`)
    return await _query(query, {e1 }) ; 
}


export async function knowledge_update_vector_search(text : string, limit : number) {
    limit = limit || 5 ; 
    let e1 = await cached_embedding(text) ; 
    let query = `
select id, metadata, vector::distance::knn() AS distance from knowledge_update where text_vector <|${limit},40|> $e1 ORDER BY distance asc 
    ` ;
    log(`query=${query}`) ; 
    return await _query(query, {e1}) ; 
}



export async function relation_name_vector_search(name : string, limit : number) {
    // can use fetch to replace record ids with the actual content (todo later when processing result - the associated_relation_ids) 
    limit = limit || 5 ; 
    let e1 = await cached_embedding(name) ; 
    let query = `
select id, associated_relations, name, vector::distance::knn() AS distance from relation_names where name_embedding <|${limit},40|> $e1 ORDER BY distance asc 
    ` ;
    log(`query=${query}`) ; 
    return await _query(query, {e1}) ; 
    
}


export async function old_all_relationships_for_entity(eid : string) {
    let query = `

     LET $e  = type::thing("entity",$eid) ; 

     SELECT  eid,
       ->(SELECT * FROM ?)->? AS outgoing,
       <-(SELECT * FROM ?)<-? AS incoming
    FROM $e ;
    `

    return await _query(query, {eid}) ; 
}

export async function all_relationships_for_entity(eid : string) {
    let query = `

     LET $e  = type::thing("entity",$eid) ; 

     SELECT  eid,
       ->(SELECT * FROM ? AS outgoing_edges)->? AS outgoing_nodes,
       <-(SELECT * FROM ? AS incoming_edges) <-? AS incoming_nodes
    FROM $e FETCH entity, outgoing_edges , incoming_edges , outgoing_nodes, incoming_nodes 
    `

    return await _query(query, {eid}) ; 
}



/* 
   Todo 

   [ ] create a function that takes a relation name, expands it using vector search and passes the first N matches to an AI to determine which 10 are are SIMILAR ENOUGH to be considered synonomous , then it returns that subset  

   [ ] Retrieve all content for a given EID -- similar to above though where it expands it via embedding search then does AI pass to select subset, then retrieves all content for all matches 

*/ 





/*
 * this was implemented after the initial first pass 
 * this is done --> 
 */ 
export async function create_relation_name_vector_table() {

    log(`getting relations`) 
    let rdata = (await _query(`select rid, name, id from relations`,{}) as any ) [0] ;

    for (var i =0; i < rdata.length ; i ++ ) {
	
	let {id , name, rid } = rdata[i]
	let relation_id = id.id 
	log(`\n\nProcessing i=${i}/${rdata.length}, name=${name}, rid=${rid}, id=${relation_id}`) ;

	let name_embedding = await cached_embedding(name) ; 

	let init_data = {
	    name,
	    name_embedding,
	    associated_relations : [ ] ,
	    id : name, 
	}

	let query = ` 

    LET $rel      = type::thing("relations",$relation_id) ;
    LET $relname  = type::thing("relation_names",$name) ;

    insert ignore into relation_names $init_data  ;  -- only adds if the id does not exist 

    update $relname set associated_relations += $rel ; 
	`

	await _query(query , {  relation_id , name, init_data } ) 
	
    }
    

    log(`Done`) 

}






export var tests = {
    'entity1' : async () => (await  entity_vector_search("conjunctivitis" , 6) ) ,
    'entity2' : async () => (await  entity_vector_search("rheumatoid arthritis flare" , 6) ) ,
}

export async function _query(q :string, data : any ) {
    log(`Getting client`) 
    const db = await get_client();
    return await db.query( q , { ... data } ) ; 
}

export const queries = {
    getAllEntities: async () => (await get_client()).query('SELECT * FROM entity').then((r:any) => r[0]),
    getEntitiesByCategory: async (cat: string) => (await get_client()).query('SELECT * FROM entity WHERE category = $c', { c: cat }).then((r : any) => r[0])
    
}
    


//-------------------------------------------------------------
// UMBRELLA EXPORT OBJECT
//-------------------------------------------------------------

const util =  {
    eid_to_uuid,
    uuid_from_sha256,
    add_embeddings,
    check_for_eid,
    check_for_rid
}

const _internals = { 
    get_client,
}

export { 
    util, 
    _internals ,
} 

