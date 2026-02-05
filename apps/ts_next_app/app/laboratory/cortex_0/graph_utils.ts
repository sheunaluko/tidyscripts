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
    name: string;       // composite key: "shay_created_tidyscripts"
    sourceName: string; // "shay"
    targetName: string; // "tidyscripts"
    kind: string;       // "created"
};

export type ParsedTriples = {
    entityNames: Set<string>;
    relations: Map<string, RelationInfo>;
};

/**
 * Parse triples into entity names and relation map
 * Deduplicates automatically
 */
export function parse_triples(triples: Triple[]): ParsedTriples {
    log(`Parsing ${triples.length} triples`);

    const entityNames = new Set<string>();
    const relations = new Map<string, RelationInfo>();

    for (const [source, relationKind, target] of triples) {
        const sourceName = normalize_id(source);
        const targetName = normalize_id(target);
        const kind = normalize_id(relationKind);
        const relationName = generate_relation_id(sourceName, kind, targetName);

        entityNames.add(sourceName);
        entityNames.add(targetName);

        if (!relations.has(relationName)) {
            relations.set(relationName, { name: relationName, sourceName, targetName, kind });
        }
    }

    log(`Parsed: ${entityNames.size} unique entities, ${relations.size} unique relations`);
    debug.add('parsed_triples', { entityNames: [...entityNames], relations: [...relations.values()] });

    return { entityNames, relations };
}

// ============================================================
// DATABASE QUERIES - CHECK EXISTING
// ============================================================

/**
 * Check which entity names already exist in the database
 */
export async function check_existing_entities(entityNames: string[]): Promise<Set<string>> {
    if (entityNames.length === 0) return new Set();

    log(`Checking ${entityNames.length} entity names for existence`);

    try {
        const result = await fbu.surreal_query({
            query: `SELECT VALUE name FROM user_entities WHERE name IN $names`,
            variables: { names: entityNames }
        }) as any;

        const resultData = result?.data?.result?.result?.[0]?.result || [];
        const existingNames = new Set<string>(
            resultData.map((r: any) => String(r))
        );

        log(`Found ${existingNames.size} existing entities`);
        debug.add('existing_entities', [...existingNames]);

        return existingNames;
    } catch (error: any) {
        log(`Error checking existing entities: ${error.message}`);
        throw error;
    }
}

/**
 * Check which relation names already exist in the database
 */
export async function check_existing_relations(relationNames: string[]): Promise<Set<string>> {
    if (relationNames.length === 0) return new Set();

    log(`Checking ${relationNames.length} relation names for existence`);

    try {
        const result = await fbu.surreal_query({
            query: `SELECT VALUE name FROM user_relations WHERE name IN $names`,
            variables: { names: relationNames }
        }) as any;

        const resultData = result?.data?.result?.result?.[0]?.result || [];
        const existingNames = new Set<string>(
            resultData.map((r: any) => String(r))
        );

        log(`Found ${existingNames.size} existing relations`);
        debug.add('existing_relations', [...existingNames]);

        return existingNames;
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
    entities: { name: string; embedding: number[] }[],
    relations: { name: string; sourceName: string; targetName: string; kind: string; embedding: number[] }[]
): string {
    const statements: string[] = [];

    // Entity inserts with auto-generated ID and name field
    for (const e of entities) {
        statements.push(
            `CREATE user_entities CONTENT { name: "${e.name}", embedding: [${e.embedding.join(',')}] }`
        );
    }

    // Relation inserts using RELATE syntax with subqueries to find entities by name
    for (const r of relations) {
        statements.push(
            `RELATE (SELECT VALUE id FROM user_entities WHERE name = "${r.sourceName}" LIMIT 1)->user_relations->(SELECT VALUE id FROM user_entities WHERE name = "${r.targetName}" LIMIT 1) CONTENT { name: "${r.name}", sourceName: "${r.sourceName}", targetName: "${r.targetName}", kind: "${r.kind}", embedding: [${r.embedding.join(',')}] }`
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
    const { entityNames, relations } = parse_triples(triples);
    const entityNameList = [...entityNames];
    const relationList = [...relations.values()];

    // 2. Build relation names for dedup check
    const relationNameList = relationList.map(r => r.name);

    // 3. Check existing in parallel
    const [existingEntityNames, existingRelationNames] = await Promise.all([
        check_existing_entities(entityNameList),
        check_existing_relations(relationNameList)
    ]);

    // 4. Filter to new only
    const newEntityNames = entityNameList.filter(name => !existingEntityNames.has(name));
    const newRelations = relationList.filter(r => !existingRelationNames.has(r.name));

    log(`New items: ${newEntityNames.length} entities, ${newRelations.length} relations`);
    log(`Existing items: ${existingEntityNames.size} entities, ${existingRelationNames.size} relations`);

    // 5. Compute embeddings for new items only
    const textsToEmbed = [
        ...newEntityNames,
        ...newRelations.map(r => relation_embedding_text(r.sourceName, r.kind, r.targetName))
    ];

    const allEmbeddings = await compute_embeddings(textsToEmbed);
    const entityEmbeddings = allEmbeddings.slice(0, newEntityNames.length);
    const relationEmbeddings = allEmbeddings.slice(newEntityNames.length);

    // 6. Build data for insert
    const entitiesToInsert = newEntityNames.map((name, i) => ({
        name,
        embedding: entityEmbeddings[i]
    }));

    const relationsToInsert = newRelations.map((r, i) => ({
        ...r,
        embedding: relationEmbeddings[i]
    }));

    // 7. Insert all in single query
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
        entities: { new: newEntityNames.length, existing: existingEntityNames.size },
        relations: { new: newRelations.length, existing: existingRelationNames.size }
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
            query: `SELECT id, name, vector::distance::knn() AS distance
                    FROM user_entities
                    WHERE embedding <|${limit},${effort}|> $e
                    ORDER BY distance ASC`,
            variables: { e: queryEmbedding }
        }),
        fbu.surreal_query({
            query: `SELECT id, name, sourceName, targetName, kind, vector::distance::knn() AS distance
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
            const name = e.name || '?';
            const dist = e.distance?.toFixed(4) || '?';
            lines.push(`  - ${name} (distance: ${dist})`);
        }
        lines.push('');
    }

    if (results.relations.length > 0) {
        lines.push('Relations:');
        for (const r of results.relations) {
            const source = r.sourceName || '?';
            const target = r.targetName || '?';
            const kind = r.kind || '?';
            const dist = r.distance?.toFixed(4) || '?';
            lines.push(`  - ${source} --[${kind}]--> ${target} (distance: ${dist})`);
        }
    }

    return lines.join('\n');
}

