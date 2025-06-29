
//-------------------------------------------------------------
// 0.  IMPORTS & GLOBALS
//-------------------------------------------------------------
import Surreal, { RecordId } from 'surrealdb';  // SDK v2 default import + RecordId helper

import * as common       from 'tidyscripts_common';
import { z }             from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';
import { demo } from './tom_surreal_demo2';

const { ailand } = common.apis;
const { embedding1024, structured_prompt } = ailand;

const log   = common.logger.get_logger({ id: 'tom-surreal-v3' });
const debug = common.util.debug;

var _client : any = null  ; 

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
const id_string = lc_string.transform( (s) => s.replace(" " ,"_") ) ;

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

async function extract_entities(text: string, tier = 'top') {
    
    const rf = zodTextFormat(
	z.object({
	    entities: z.array(z.object({ eid: id_string, category: z.enum(Categories), importance: z.number() })),
	}),
	'entities',
    );
    const prompt = `
Extract medical entities with category + importance (0-1).

Make sure the eid field (entity id) is a human readable string which is the direct name of the entity

INPUT:
${text}
`;
    const res: any = await structured_prompt(prompt, rf, tier);
    let entities = res.entities as Entity[];
    debug.add('extracted_entities' , entities )
    return entities; 

}

async function extract_relations(text: string, entities: Entity[], tier = 'top') {
    const rf = zodTextFormat(
	z.object({ relations: z.array(z.object({ name: lc_string, source: lc_string, target: lc_string })) }),
	'relations',
    );
    
    const prompt = `
Identify relations between the provided entities

ENTITIES:
${JSON.stringify(entities)} 

INPUT TEXT:
${text}

    `;
    
    const res: any = await structured_prompt(prompt, rf, tier);
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
    demo, 
} 

