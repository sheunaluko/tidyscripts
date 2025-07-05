/**
 * Tidyscripts Ontology Of Medicine 
 *
 * Leverages surrealdb database and ai API to build, update, and serve a medical ontology
 * Input: unstructured text 
 * Output: Ontology creation / update 
 *  
 */

import * as common       from 'tidyscripts_common';
import { z }             from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
const { ailand } = common.apis;
const {CacheUtils} = common.apis.cache ; 
const { embedding1024, structured_prompt } = ailand;
import {FileSystemCache} from "./apis/node_cache" ;
import Surreal, { RecordId } from 'surrealdb'; 

const log   = common.logger.get_logger({ id: 'tom' });
const debug = common.util.debug;
var _client : any = null  ; 


var default_tier = 'top' ;

export function set_default_tier(t : string) {
    default_tier = t ; 
}

/*
   Todo - update relation extraction to include metadata 
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


const cacheDir = '/tmp/tom_surreal' ;
export const fs_cache = new FileSystemCache<any>({
    cacheDir,
    onlyLogHitsMisses : true,
    logPrefix: "surreal_cache" ,
    namespace: "tom_surreal" , 
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
    const eid_vector      = await embedding1024(e.eid);
    return { ...e, eid_vector} 
}

async function check_for_id(table: string, id: string, client?: InstanceType<typeof Surreal>) {
    const db = client ?? (await get_client());
    // Query returns a tuple of one array of rows; cast to expected type
    const result = await db.query(`SELECT id FROM ${table} WHERE id = $id LIMIT 1`, { id }) as [{ id: string }[]];
    const row = result[0]?.[0];
    let id_exists = ( row ? true : false ) ;

    if (id_exists) {
	log(`Id=${id} exists in table=${table} already`) 
    } else {
	log(`Id=${id} DOES NOT exist in table=${table} already`) 	
    }
    
    return id_exists 
    
}
export const check_for_eid = (eid: string, c?: any) => check_for_id('entity', eid, c);
export const check_for_rid = (name : string, rid: string, c?: any) => check_for_id(name, rid, c);

//-------------------------------------------------------------
// 3.  ENTITY & RELATION WRITERS
//-------------------------------------------------------------

export function format_id(s : string) {
    return s.replace( new RegExp(" ", 'g') , "_" )  ; 
}

export async function process_entity(e: Entity) {
    
    const db = await get_client();
    
    if (await check_for_eid(e.eid, db)) {
	log(`Finished processing entity ${e.eid}, already exists`)
	return ; 
    } 
    
    var { eid_vector, eid, category   } = await add_embeddings(e);

    let formatted_eid = format_id(eid) ;
    category          = format_id(category) ; 

    let entity = {
	id: formatted_eid , 
	eid: formatted_eid ,                 
	category , 
	eid_vector , 
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
    
}

interface RelationBase { kind: 'relation'; name: string; source_eid: string; dest_eid: string; }

export function add_relation_id(r: RelationBase) {
    let rid = format_id(`${r.source_eid}->${r.name}->${r.dest_eid}`) ;
    return { ...r, rid  }
}

export async function reset_tom_db() {
    const db = await get_client();
    log(`Resetting db`)
    return await db.query(`REMOVE DB tom ; DEFINE DB tom;`) 
}


export async function process_relation(r: { name: string; source: string; target: string }) {
    
    const db = await get_client();
    
    const base: RelationBase = { kind: 'relation', name: format_id(r.name), source_eid: format_id(r.source), dest_eid: format_id(r.target) };
    
    const relation = add_relation_id(base);
    
    let {rid, name, source_eid, dest_eid} = relation ;

    //check if it exists already
    let relation_exists = await check_for_id(name, rid ) ;
    if (relation_exists) {
	log(`Relation with id=${rid} already exists`) ;
	return null
    } else {
	log(`Relation with id=${rid} DOES NOT exist`) ;	
    }
	
    const rid_vector  = await embedding1024(rid);

    log(`Proceeding with db query to add relation`)

    await db.query(`
     LET $in  = type::thing("entity",$source_eid) ; 
     LET $out = type::thing("entity",$dest_eid) ; 
     LET $table = type::table($name) ; 

     RELATE $in->$table->$out CONTENT { 
         id : $rid  , 
         rid : $rid , 
         rid_vector : $rid_vector 
     }
    `, { name, rid, rid_vector, source_eid, dest_eid  }) ; 

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
export async function ingest_text(text: string) {
    return extract_and_store_entities_and_relations(text);
}

export async function extract_and_store_entities_and_relations(text: string) {
    const entities = await extract_entities(text);
    await Promise.all(entities.map(process_entity));
    const rels = await extract_relations(text, entities);
    await Promise.all(rels.map(process_relation));
}

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


export async function test1() { return await ontologize(test_text_1) } ; 

export async function ingest_text_with_summary(text: string) {

    log(`Getting client`) 
    const db = await get_client();

    log(`Extracting entities`) 
    const ents = await extract_entities(text);
    const added_entities: Entity[] = [];
    await Promise.all(
	ents.map(async (e) => {
	    if (!(await check_for_eid(e.eid, db))) {
		await process_entity(e);
		added_entities.push(e);
	    }
	}),
    );

    log(`Got entities, now extraction relations`) 
    
    const relsRaw = await extract_relations(text, ents);
    const added_relations: { rid: string }[] = [];

    let process_and_add_relation = async function(r :any) {
	let rid = await process_relation(r)  ;
	if (rid) {
	    log(`Adding relation with rid=${rid}`) 
	    added_relations.push( {rid}  ) 
	} else {
	    log(`Skipping relation with rid=${rid}`) 	    
	}
    }
    
    await Promise.all( relsRaw.map( process_and_add_relation  ) ) 

    log(`Got relations, now summarizing knowledge update...`) 	

    let knowledge_update = { 
	id: uuid_from_sha256(text),
	text,
	entity_eids: added_entities.map((e) => e.eid),
	relation_rids: added_relations.map((r) => r.rid),
	timestamp: new Date().toISOString(),
	text_vector: await embedding1024(text),
    } ;

    db.query(`INSERT IGNORE INTO knowledge_update $knowledge_update`, { knowledge_update}); 

    log(`Finished saving knowledge update`)  ; 
    
    return { added_entities, added_relations };
}

//TODO

// vector search 

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

