/********************************************************************************************************************
 * tom_surreal.ts                                                                                                    *
 * ------------------------------------------------------------------------------------------------------------------ *
 * Single‑file implementation of the **Tidyscripts Ontology of Medicine (TOM)** on **SurrealDB** (SDK v1, package     *
 * name `surrealdb`).                                                                                                 *
 *                                                                                                                    *
 * Exports a single object:                                                                                           *
 *     import { tom_surreal } from "./tom_surreal"                                                                    *
 *                                                                                                                    *
 * Key namespaces inside `tom_surreal`:                                                                               *
 *   • ingest_text / ingest_text_with_summary – core ingestion                                                        *
 *   • process_entity / process_relation – low‑level writers                                                          *
 *   • queries – convenience read helpers                                                                             *
 *   • util – embeddings, UUID helpers, existence checks                                                              *
 *   • _internals – get_client / set_database_url                                                                     *
 *                                                                                                                    *
 * Updated 2025‑06‑20 to reflect SDK rename **surrealdb.js → surrealdb** and the new `.use({ namespace, database })`  *
 * signature. Created by the o3 ai model and Sheun Aluko                                                              *
 *********************************************************************************************************************/

//-------------------------------------------------------------
// 0.  IMPORTS & GLOBALS
//-------------------------------------------------------------
import Surreal from 'surrealdb';                 // ← new default export (SDK v1)
import * as common       from 'tidyscripts_common';
import { z }             from 'zod';
import { zodTextFormat } from 'openai/helpers/zod';

const { ailand } = common.apis;
const { embedding1024, structured_prompt } = ailand;

const log   = common.logger.get_logger({ id: 'tom-surreal' });
const debug = common.util.debug;

//-------------------------------------------------------------
// 1.  DB CONNECTION & SCHEMA
//-------------------------------------------------------------
let DB_URL = 'http://127.0.0.1:8000/rpc';
const NS = 'medical';
const DB = 'tom';
let _client: InstanceType<typeof Surreal> | null = null;

export function set_database_url(url: string) {
  DB_URL = url;
  _client = null;
}

export async function get_client() {
  if (_client) return _client;
  log(`Connecting to SurrealDB → ${DB_URL}`);
  const db = new Surreal();
  await db.connect(DB_URL);
  await db.signin({ user: 'root', pass: 'root' });
  await db.use({ namespace: NS, database: DB });  // new signature
  _client = db;
  await init_schema();
  return db;
}

// --------------------------- DDL -----------------------------
const DDL = /* surql */ `
BEGIN TRANSACTION;

DEFINE TABLE entity SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD eid            ON entity TYPE string   ASSERT $value != '';
DEFINE FIELD category       ON entity TYPE string;
DEFINE FIELD primary_vec    ON entity TYPE array;
DEFINE FIELD secondary_vec  ON entity TYPE array;
DEFINE INDEX idx_ent_p  ON entity FIELDS primary_vec   VECTOR 1024 HNSW;
DEFINE INDEX idx_ent_s  ON entity FIELDS secondary_vec VECTOR 1024 HNSW;

DEFINE TABLE relation SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD rid            ON relation TYPE string;
DEFINE FIELD name           ON relation TYPE string;
DEFINE FIELD source_eid     ON relation TYPE string;
DEFINE FIELD dest_eid       ON relation TYPE string;
DEFINE FIELD primary_vec    ON relation TYPE array;
DEFINE FIELD secondary_vec  ON relation TYPE array;
DEFINE INDEX idx_rel_p ON relation FIELDS primary_vec   VECTOR 1024 HNSW;
DEFINE INDEX idx_rel_s ON relation FIELDS secondary_vec VECTOR 1024 HNSW;

DEFINE TABLE knowledge_update SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD text            ON knowledge_update TYPE string;
DEFINE FIELD entity_eids     ON knowledge_update TYPE array;
DEFINE FIELD relation_rids   ON knowledge_update TYPE array;
DEFINE FIELD timestamp       ON knowledge_update TYPE string;
DEFINE FIELD primary_vec     ON knowledge_update TYPE array;
DEFINE FIELD secondary_vec   ON knowledge_update TYPE array;
DEFINE INDEX idx_ku_p ON knowledge_update FIELDS primary_vec   VECTOR 1024 HNSW;
DEFINE INDEX idx_ku_s ON knowledge_update FIELDS secondary_vec VECTOR 1024 HNSW;

COMMIT TRANSACTION;`;

async function init_schema() {
  const db = await get_client();
  await db.query(DDL);
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
  category_vector: number[];
}

export async function add_embeddings(e: Entity): Promise<EntityWithEmbeddings> {
  const eid_vector      = await embedding1024(e.eid);
  const category_vector = await embedding1024(e.category);
  return { ...e, eid_vector, category_vector };
}

async function check_for_id(table: string, id: string, client?: InstanceType<typeof Surreal>) {
  const db = client ?? (await get_client());
  const [[row]] = await db.query(`SELECT id FROM ${table} WHERE id = $id LIMIT 1`, { id });
  return !!row;
}
export const check_for_eid = (eid: string, c?: any) => check_for_id('entity', eid, c);
export const check_for_rid = (rid: string, c?: any) => check_for_id('relation', rid, c);

//-------------------------------------------------------------
// 3.  ENTITY & RELATION WRITERS
//-------------------------------------------------------------
export async function process_entity(e: Entity) {
  const db = await get_client();
  if (await check_for_eid(e.eid, db)) return;
  const { eid_vector, category_vector } = await add_embeddings(e);
  await db.create('entity', {
    id: e.eid,
    category: e.category,
    primary_vec: eid_vector,
    secondary_vec: category_vector,
  });
  await db.query('RELATE entity:$eid->has_category->category:$cat', { eid: e.eid, cat: e.category });
}

interface RelationBase { kind: 'relation'; name: string; source_eid: string; dest_eid: string; }
export const add_relation_id = (r: RelationBase) => ({ ...r, rid: `${r.name}:: (${r.source_eid}) -> (${r.dest_eid})` });

export async function process_relation(r: { name: string; source: string; target: string }) {
  const db = await get_client();
  const base: RelationBase = { kind: 'relation', name: r.name, source_eid: r.source, dest_eid: r.target };
  const { rid } = add_relation_id(base);
  if (await check_for_rid(rid, db)) return;
  const name_emb = await embedding1024(r.name);
  const rid_emb  = await embedding1024(rid);
  await db.create('relation', {
    id: rid,
    name: r.name,
    source_eid: r.source,
    dest_eid: r.target,
    primary_vec: name_emb,
    secondary_vec: rid_emb,
  });
  await db.query('RELATE entity:$from->$rel->entity:$to CONTENT { rid: $rid }', {
    from: r.source,
    rel: r.name,
    to: r.target,
    rid,
  });
}

//-------------------------------------------------------------
// 4.  LLM HELPERS (entity / relation extraction, code synthesis)
//-------------------------------------------------------------
const lc_string = z.string().transform((s) => s.toLowerCase());
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
      entities: z.array(z.object({ eid: lc_string, category: z.enum(Categories), importance: z.number() })),
    }),
    'entities',
  );
  const prompt = `Extract medical entities with category + importance (0‑1).\nINPUT:\n${text}`;
  const res: any = await structured_prompt(prompt, rf, tier);
  return res.entities as Entity[];
}

async function extract_relations(text: string, entities: Entity[], tier = 'top') {
  const rf = zodTextFormat(
    z.object({ relations: z.array(z.object({ name: lc_string, source: lc_string, target: lc_string })) }),
    'relations',
  );
  const prompt = `Identify relations between provided entities.\nTEXT:\n${text}`;
  const res: any = await structured_prompt(prompt, rf, tier);
  return res.relations as { name: string; source: string; target: string }[];
}

async function think_about_db_query_surreal(tier = 'top') {
  const rf = zodTextFormat(z.object({ query: z.string() }), 'query');
  const prompt = `Write TypeScript using the Surreal SDK (import Surreal from 'surrealdb') that: • performs KNN on entity.primary_vec • filters category='condition' • traverses 'causes' edge`;
  const res: any = await structured_prompt(prompt, rf, tier);
  return res.query as string;
}

//-------------------------------------------------------------
//-------------------------------------------------------------
// 5.  INGESTION API
//-------------------------------------------------------------
export async function ingest_text(text: string) {
  return extract_and_store_entities_and_relations(text);
}

export async function extract_and_store_entities_and_relations(text: string) {
  const ents = await extract_entities(text);
  await Promise.all(ents.map(process_entity));
  const rels = await extract_relations(text, ents);
  await Promise.all(rels.map(process_relation));
}

export async function ingest_text_with_summary(text: string) {
  const db = await get_client();
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
  const relsRaw = await extract_relations(text, ents);
  const added_relations: { rid: string }[] = [];
  await Promise.all(
    relsRaw.map(async (r) => {
      const obj = add_relation_id({ kind: 'relation', name: r.name, source_eid: r.source, dest_eid: r.target });
      if (!(await check_for_rid(obj.rid, db))) {
        await process_relation(r);
        added_relations.push({ rid: obj.rid });
      }
    }),
  );
  await db.create('knowledge_update', {
    id: uuid_from_sha256(text),
    text,
    entity_eids: added_entities.map((e) => e.eid),
    relation_rids: added_relations.map((r) => r.rid),
    timestamp: new Date().toISOString(),
    primary_vec: await embedding1024(added_entities.map((e) => e.eid).join(' ')),
    secondary_vec: await embedding1024(added_relations.map((r) => r.rid).join(' ')),
  });
  return { added_entities, added_relations };
}

//-------------------------------------------------------------
// 6.  QUERY CONVENIENCE WRAPPERS
//-------------------------------------------------------------
async function vsearch(table: string, field: string, vec: number[], limit = 5) {
  const db = await get_client();
  const [rows] = await db.query(`SELECT *, score FROM ${table} WHERE vsearch(${field}, $v, $k) LIMIT $k`, { v: vec, k: limit });
  return rows;
}

export const queries = {
  getAllEntities: async () => (await get_client()).query('SELECT * FROM entity').then((r) => r[0]),
  getAllRelations: async () => (await get_client()).query('SELECT * FROM relation').then((r) => r[0]),
  getEntitiesByCategory: async (cat: string) => (await get_client()).query('SELECT * FROM entity WHERE category = $c', { c: cat }).then((r) => r[0]),
  semanticSearchEntitiesByPrimary: (v: number[], l = 5) => vsearch('entity', 'primary_vec', v, l),
  semanticSearchEntitiesBySecondary: (v: number[], l = 5) => vsearch('entity', 'secondary_vec', v, l),
  semanticSearchRelationsByPrimary: (v: number[], l = 5) => vsearch('relation', 'primary_vec', v, l),
  semanticSearchRelationsBySecondary: (v: number[], l = 5) => vsearch('relation', 'secondary_vec', v, l),
};

//-------------------------------------------------------------
// 7.  UMBRELLA EXPORT OBJECT
//-------------------------------------------------------------
export const tom_surreal = {
  ingest_text,
  ingest_text_with_summary,
  extract_entities,
  extract_relations,
  think_about_db_query_surreal,
  process_entity,
  process_relation,
  util: {
    eid_to_uuid,
    uuid_from_sha256,
    add_embeddings,
    check_for_eid,
    check_for_rid,
  },
  queries,
  _internals: {
    get_client,
    set_database_url,
  },
};

//-------------------------------------------------------------
// EOF
//-------------------------------------------------------------
