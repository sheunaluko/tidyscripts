'use client';

/**
 * Graph Utils - Knowledge graph helpers for storing/retrieving declarative knowledge
 *
 * Uses user_entities and user_relations tables in SurrealDB via Firebase callable functions.
 * All operations are user-scoped via Firebase Auth.
 */

import * as tsw from "tidyscripts_web";
import * as fbu from "../../../src/firebase_utils";

// Logger setup
const log = tsw.common.logger.get_logger({ id: 'graph_utils' });
const debug = tsw.common.util.debug;

// ============================================================
// ID NORMALIZATION
// ============================================================

/**
 * Normalize a string to a valid SurrealDB ID
 * "Albert Einstein" -> "albert_einstein"
 */
export function normalize_id(s: string): string {
    return s.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/**
 * Generate a relation ID from source, kind, and target
 * ("shay", "created", "tidyscripts") -> "shay_created_tidyscripts"
 */
export function generate_relation_id(sourceId: string, kind: string, targetId: string): string {
    return `${sourceId}_${kind}_${targetId}`;
}

/**
 * Generate embedding text for a relation
 */
export function relation_embedding_text(sourceId: string, kind: string, targetId: string): string {
    return `${sourceId} ${kind} ${targetId}`;
}

// ============================================================
// TRIPLE PARSING
// ============================================================

export type Triple = [string, string, string]; // [subject, relation, object]

export type RelationInfo = {
    id: string;
    sourceId: string;
    targetId: string;
    kind: string;
};

export type ParsedTriples = {
    entityIds: Set<string>;
    relations: Map<string, RelationInfo>;
};

/**
 * Parse triples into entity IDs and relation map
 * Deduplicates automatically
 */
export function parse_triples(triples: Triple[]): ParsedTriples {
    log(`Parsing ${triples.length} triples`);

    const entityIds = new Set<string>();
    const relations = new Map<string, RelationInfo>();

    for (const [source, relationKind, target] of triples) {
        const sourceId = normalize_id(source);
        const targetId = normalize_id(target);
        const kind = normalize_id(relationKind);
        const relationId = generate_relation_id(sourceId, kind, targetId);

        entityIds.add(sourceId);
        entityIds.add(targetId);

        if (!relations.has(relationId)) {
            relations.set(relationId, { id: relationId, sourceId, targetId, kind });
        }
    }

    log(`Parsed: ${entityIds.size} unique entities, ${relations.size} unique relations`);
    debug.add('parsed_triples', { entityIds: [...entityIds], relations: [...relations.values()] });

    return { entityIds, relations };
}

// ============================================================
// DATABASE QUERIES - CHECK EXISTING
// ============================================================

/**
 * Check which entity IDs already exist in the database
 */
export async function check_existing_entities(entityIds: string[]): Promise<Set<string>> {
    if (entityIds.length === 0) return new Set();

    log(`Checking ${entityIds.length} entity IDs for existence`);

    try {
        const result = await fbu.surreal_query({
            query: `SELECT VALUE id FROM user_entities WHERE id IN $ids`,
            variables: { ids: entityIds.map(id => `user_entities:${id}`) }
        }) as any;

        const resultData = result?.data?.result?.result?.[0]?.result || [];
        const existingIds = new Set<string>(
            resultData.map((r: any) => {
                if (typeof r === 'string') {
                    return r.replace('user_entities:', '');
                } else if (r?.id) {
                    return String(r.id);
                }
                return String(r);
            })
        );

        log(`Found ${existingIds.size} existing entities`);
        debug.add('existing_entities', [...existingIds]);

        return existingIds;
    } catch (error: any) {
        log(`Error checking existing entities: ${error.message}`);
        throw error;
    }
}

/**
 * Check which relation IDs already exist in the database
 */
export async function check_existing_relations(relationIds: string[]): Promise<Set<string>> {
    if (relationIds.length === 0) return new Set();

    log(`Checking ${relationIds.length} relation IDs for existence`);

    try {
        const result = await fbu.surreal_query({
            query: `SELECT VALUE id FROM user_relations WHERE id IN $ids`,
            variables: { ids: relationIds.map(id => `user_relations:${id}`) }
        }) as any;

        const resultData = result?.data?.result?.result?.[0]?.result || [];
        const existingIds = new Set<string>(
            resultData.map((r: any) => {
                if (typeof r === 'string') {
                    return r.replace('user_relations:', '');
                } else if (r?.id) {
                    return String(r.id);
                }
                return String(r);
            })
        );

        log(`Found ${existingIds.size} existing relations`);
        debug.add('existing_relations', [...existingIds]);

        return existingIds;
    } catch (error: any) {
        log(`Error checking existing relations: ${error.message}`);
        throw error;
    }
}

// ============================================================
// EMBEDDINGS
// ============================================================

/**
 * Compute embeddings for an array of texts
 */
export async function compute_embeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    log(`Computing ${texts.length} embeddings`);

    try {
        const embeddings = await Promise.all(
            texts.map(text => tsw.common.apis.ailand.get_cloud_embedding(text))
        );

        log(`Computed ${embeddings.length} embeddings`);
        return embeddings;
    } catch (error: any) {
        log(`Error computing embeddings: ${error.message}`);
        throw error;
    }
}

// ============================================================
// QUERY BUILDING
// ============================================================

/**
 * Build a single SurrealQL query to insert all entities and relations
 */
export function build_insert_query(
    entities: { id: string; embedding: number[] }[],
    relations: { id: string; sourceId: string; targetId: string; kind: string; embedding: number[] }[]
): string {
    const statements: string[] = [];

    // Entity inserts
    for (const e of entities) {
        statements.push(
            `CREATE type::thing("user_entities", "${e.id}") CONTENT { embedding: [${e.embedding.join(',')}] }`
        );
    }

    // Relation inserts using RELATE syntax for RELATION type tables
    for (const r of relations) {
        statements.push(
            `RELATE user_entities:${r.sourceId}->user_relations->user_entities:${r.targetId} CONTENT { id: "${r.id}", kind: "${r.kind}", embedding: [${r.embedding.join(',')}] }`
        );
    }

    const query = statements.join(';\n') + ';';

    log(`Built insert query with ${entities.length} entities and ${relations.length} relations`);
    debug.add('insert_query', query);

    return query;
}

// ============================================================
// MAIN STORE FUNCTION
// ============================================================

export type StoreKnowledgeResult = {
    entities: { new: number; existing: number };
    relations: { new: number; existing: number };
};

/**
 * Main function to store knowledge triples
 *
 * 1. Parses triples into entity IDs and relations
 * 2. Checks which already exist in DB
 * 3. Computes embeddings only for new items
 * 4. Inserts all new entities and relations in a single query
 */
export async function store_knowledge(triples: Triple[]): Promise<StoreKnowledgeResult> {
    log(`store_knowledge called with ${triples.length} triples`);
    debug.add('store_knowledge_input', triples);

    // 1. Parse triples
    const { entityIds, relations } = parse_triples(triples);
    const entityIdList = [...entityIds];
    const relationList = [...relations.values()];

    // 2. Check existing in parallel
    const [existingEntityIds, existingRelationIds] = await Promise.all([
        check_existing_entities(entityIdList),
        check_existing_relations(relationList.map(r => r.id))
    ]);

    // 3. Filter to new only
    const newEntityIds = entityIdList.filter(id => !existingEntityIds.has(id));
    const newRelations = relationList.filter(r => !existingRelationIds.has(r.id));

    log(`New items: ${newEntityIds.length} entities, ${newRelations.length} relations`);
    log(`Existing items: ${existingEntityIds.size} entities, ${existingRelationIds.size} relations`);

    // 4. Compute embeddings for new items only
    const textsToEmbed = [
        ...newEntityIds,
        ...newRelations.map(r => relation_embedding_text(r.sourceId, r.kind, r.targetId))
    ];

    const allEmbeddings = await compute_embeddings(textsToEmbed);
    const entityEmbeddings = allEmbeddings.slice(0, newEntityIds.length);
    const relationEmbeddings = allEmbeddings.slice(newEntityIds.length);

    // 5. Build data for insert
    const entitiesToInsert = newEntityIds.map((id, i) => ({
        id,
        embedding: entityEmbeddings[i]
    }));

    const relationsToInsert = newRelations.map((r, i) => ({
        ...r,
        embedding: relationEmbeddings[i]
    }));

    // 6. Insert all in single query
    if (entitiesToInsert.length > 0 || relationsToInsert.length > 0) {
        const query = build_insert_query(entitiesToInsert, relationsToInsert);

        try {
            const result = await fbu.surreal_query({ query });
            log(`Insert query executed successfully`);
            debug.add('insert_result', result);
        } catch (error: any) {
            log(`Error executing insert query: ${error.message}`);
            throw error;
        }
    } else {
        log(`Nothing new to insert`);
    }

    const result: StoreKnowledgeResult = {
        entities: { new: newEntityIds.length, existing: existingEntityIds.size },
        relations: { new: newRelations.length, existing: existingRelationIds.size }
    };

    log(`store_knowledge complete`);
    debug.add('store_knowledge_result', result);

    return result;
}

// ============================================================
// SEARCH / RETRIEVE FUNCTIONS
// ============================================================

export type SearchKnowledgeResult = {
    query: string;
    entities: any[];
    relations: any[];
};

/**
 * Search for knowledge using vector similarity (KNN)
 */
export async function search_knowledge(
    query: string,
    options: { limit?: number; effort?: number } = {}
): Promise<SearchKnowledgeResult> {
    const { limit = 10, effort = 40 } = options;

    log(`search_knowledge: "${query}" (limit: ${limit}, effort: ${effort})`);

    // Compute query embedding
    const queryEmbedding = await tsw.common.apis.ailand.get_cloud_embedding(query);

    // Search entities and relations in parallel using KNN syntax
    const [entityResult, relationResult] = await Promise.all([
        fbu.surreal_query({
            query: `SELECT id, vector::distance::knn() AS distance
                    FROM user_entities
                    WHERE embedding <|${limit},${effort}|> $e
                    ORDER BY distance ASC`,
            variables: { e: queryEmbedding }
        }),
        fbu.surreal_query({
            query: `SELECT id, kind, in, out, vector::distance::knn() AS distance
                    FROM user_relations
                    WHERE embedding <|${limit},${effort}|> $e
                    ORDER BY distance ASC`,
            variables: { e: queryEmbedding }
        })
    ]) as any[];

    const entities = entityResult?.data?.result?.result?.[0]?.result || [];
    const relations = relationResult?.data?.result?.result?.[0]?.result || [];

    const result: SearchKnowledgeResult = {
        query,
        entities,
        relations
    };

    log(`search_knowledge found: ${entities.length} entities, ${relations.length} relations`);
    debug.add('search_knowledge_result', result);

    return result;
}

/**
 * Format search results as text context for LLM consumption
 */
export function format_search_results(results: SearchKnowledgeResult): string {
    const lines: string[] = [];

    lines.push(`Query: "${results.query}"`);
    lines.push('');

    if (results.entities.length > 0) {
        lines.push('Entities:');
        for (const e of results.entities) {
            const id = typeof e.id === 'string' ? e.id.replace('user_entities:', '') : e.id?.id || e.id;
            const dist = e.distance?.toFixed(4) || '?';
            lines.push(`  - ${id} (distance: ${dist})`);
        }
        lines.push('');
    }

    if (results.relations.length > 0) {
        lines.push('Relations:');
        for (const r of results.relations) {
            const source = typeof r.in === 'string' ? r.in.replace('user_entities:', '') : r.in?.id || '?';
            const target = typeof r.out === 'string' ? r.out.replace('user_entities:', '') : r.out?.id || '?';
            const kind = r.kind || '?';
            const dist = r.distance?.toFixed(4) || '?';
            lines.push(`  - ${source} --[${kind}]--> ${target} (distance: ${dist})`);
        }
    }

    return lines.join('\n');
}

