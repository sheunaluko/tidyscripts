/**
 * Helper functions for Matrix knowledge graph
 *
 * @example Using Helper Functions
 * ```typescript
 * import { matrix } from "tidyscripts/bin/dev";
 *
 * // Format IDs
 * const id = matrix.helpers.format_id("Albert Einstein");
 * // => "albert_einstein"
 *
 * // Generate update ID
 * const updateId = await matrix.helpers.generate_update_id(
 *   "Einstein developed relativity",
 *   { source: 'textbook' }
 * );
 * // => "a1b2c3d4e5f6g7h8" (16-char hash)
 *
 * // Get embeddings
 * const embedding = await matrix.helpers.get_embedding("Some text");
 * // => [0.123, -0.456, ...] (1536 dimensions)
 *
 * // Batch get embeddings
 * const embeddings = await matrix.helpers.get_embeddings_batch([
 *   "Text 1",
 *   "Text 2"
 * ]);
 * // => [[...], [...]]
 *
 * // Create entity with embedding
 * const entity = await matrix.helpers.create_entity(
 *   "Albert Einstein",
 *   "update_123"
 * );
 * // => { id: 'albert_einstein', embedding: [...], updateId: 'update_123' }
 *
 * // Create relation
 * const relation = await matrix.helpers.create_relation(
 *   "developed",
 *   entity1,
 *   entity2,
 *   "update_123"
 * );
 * // => { name: 'developed', id: 'entity1_developed_entity2', ... }
 *
 * // Deduplicate entities
 * const unique = matrix.helpers.deduplicate_entities([
 *   { id: 'einstein', ... },
 *   { id: 'einstein', ... },  // duplicate
 *   { id: 'curie', ... }
 * ]);
 * // => [{ id: 'einstein', ... }, { id: 'curie', ... }]
 * ```
 */

import common from "../../../packages/ts_common/dist/index";


const debug = common.util.debug;

/**
 * Format an ID string by replacing spaces with underscores and lowercasing
 * Follows pattern from tom.ts format_id
 */
export function format_id(s: string): string {
    return s.replace(/ /g, "_").toLowerCase();
}

/**
 * Generate a hash-based ID for a graph update
 * Uses SHA-256 hash of stringified object, truncated
 */
export async function generate_update_id(text: string, metadata: any): Promise<string> {
    const o = JSON.stringify({ text, metadata, timestamp: Date.now() });
    // Use SubtleCrypto for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(o);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.slice(0, 16); // Return first 16 chars for shorter ID
}

/**
 * Generate entity ID from entity name
 */
export function generate_entity_id(name: string): string {
    return format_id(name);
}

/**
 * Generate relation ID from source, name, and target
 * Format: "source_id_relation_name_target_id"
 */
export function generate_relation_id(source: string, name: string, target: string): string {
    return format_id(`${source}_${name}_${target}`);
}

/**
 * Get cloud embedding for text
 * Uses common.apis.ailand.get_cloud_embedding (1536 dims by default)
 */
export async function get_embedding(text: string): Promise<number[]> {
    //return await common.apis.ailand.get_cloud_embedding(text);
    return await common.apis.ailand.embedding1536(text);
}

/**
 * Batch get embeddings for multiple texts
 * Useful for processing multiple entities/relations efficiently
 */
export async function get_embeddings_batch(texts: string[]): Promise<number[][]> {
    return await Promise.all(texts.map(text => get_embedding(text)));
}

/**
 * Convert extracted entity data to Entity type with embedding
 */
export async function create_entity(
    name: string,
    updateId: string
): Promise<{
    id: string;
    embedding: number[];
    updateId: string;
}> {
    const id = generate_entity_id(name);
    const embedding = await get_embedding(name);
    return { id, embedding, updateId };
}

/**
 * Convert extracted relation data to Relation type with embedding
 */
export async function create_relation(
    relationName: string,
    sourceEntity: { id: string; embedding: number[]; updateId: string },
    targetEntity: { id: string; embedding: number[]; updateId: string },
    updateId: string
): Promise<{
    name: string;
    id: string;
    embedding: number[];
    source: typeof sourceEntity;
    target: typeof targetEntity;
    updateId: string;
}> {
    const id = generate_relation_id(sourceEntity.id, relationName, targetEntity.id);
    const embedding = await get_embedding(id);
    return {
        name: format_id(relationName),
        id,
        embedding,
        source: sourceEntity,
        target: targetEntity,
        updateId,
    };
}

/**
 * Deduplicate entities by ID
 */
export function deduplicate_entities<T extends { id: string }>(entities: T[]): T[] {
    const seen = new Set<string>();
    return entities.filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
    });
}

/**
 * Deduplicate relations by ID
 */
export function deduplicate_relations<T extends { id: string }>(relations: T[]): T[] {
    const seen = new Set<string>();
    return relations.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
    });
}

/**
 * Strip SurrealDB record prefix from ID
 * Handles both string IDs and SurrealDB record objects
 * @example
 * strip_record_prefix("Entity:shay") => "shay"
 * strip_record_prefix({tb: "Entity", id: "shay"}) => "shay"
 */
export function strip_record_prefix(id: string | any): string {
    // Handle SurrealDB record objects
    if (typeof id === 'object' && id !== null) {
        // SurrealDB returns {tb: 'table', id: 'id'}
        if (id.id !== undefined) {
            return String(id.id);
        }
        // Fallback: convert to string
        id = String(id);
    }

    // Convert to string if not already
    const idStr = String(id);

    // Strip table prefix if present (e.g., "Entity:shay" -> "shay")
    const colonIndex = idStr.indexOf(':');
    return colonIndex >= 0 ? idStr.substring(colonIndex + 1) : idStr;
}

/**
 * Format relation name for display (replace underscores with spaces)
 * @example
 * format_relation_name("is_a") => "is a"
 * format_relation_name("located_in") => "located in"
 */
export function format_relation_name(name: string): string {
    return name.replace(/_/g, ' ');
}

/**
 * Extract table name from SurrealDB record ID
 * For edges, this is the relation name
 * @example
 * extract_table_name("created:shay_created_tidyscripts") => "created"
 * extract_table_name({tb: "created", id: "shay_created_tidyscripts"}) => "created"
 */
export function extract_table_name(id: string | any): string {
    // Handle SurrealDB record objects
    if (typeof id === 'object' && id !== null && id.tb !== undefined) {
        return String(id.tb);
    }

    // Convert to string
    const idStr = String(id);

    // Extract table name (part before colon)
    const colonIndex = idStr.indexOf(':');
    return colonIndex >= 0 ? idStr.substring(0, colonIndex) : idStr;
}

/**
 * Format search results as text context for LLM consumption
 *
 * Converts structured Matrix search results into human-readable text
 * that can be used as context for LLM prompts.
 *
 * @param results - Search results from Matrix.search_for_knowledge()
 * @returns Formatted text context string
 *
 * @example
 * const results = await matrix.search_for_knowledge("shay", { limit: 5 });
 * const context = matrix.helpers.format_search_results_as_context(results);
 *
 * // Use in LLM prompt:
 * const prompt = `
 * Based on this knowledge:
 * ${context}
 *
 * Answer: Who created tidyscripts?
 * `;
 */
export function format_search_results_as_context(results: {
    query: string;
    entities: any[];
    relations: any[];
    graph: any[];
}): string {
    const sections: string[] = [];

    // Query section
    sections.push(`Query: "${results.query}"`);
    sections.push('');

    // Entities section
    if (results.entities && results.entities.length > 0) {
        sections.push('Entities Found:');
        results.entities.forEach(entity => {
            const name = strip_record_prefix(entity.id);
            const distance = entity.distance.toFixed(6);
            sections.push(`- ${name} (distance: ${distance})`);
        });
        sections.push('');
    }

    // Relations section
    if (results.relations && results.relations.length > 0) {
        sections.push('Relations Found:');
        results.relations.forEach(relation => {
            const relationName = format_relation_name(relation.name);
            const source = relation.source_id;
            const target = relation.target_id;
            sections.push(`- ${source} ${relationName} ${target}`);
        });
        sections.push('');
    }

    // Graph connections section
    if (results.graph && results.graph.length > 0) {
        sections.push('Graph Connections:');

        results.graph.forEach(item => {
            const entityName = strip_record_prefix(item.entity);
            sections.push(`${entityName}:`);

            if (item.connections && item.connections.length > 0) {
                const conn = item.connections[0]; // Take first connection object

                // Outgoing relations
                if (conn.outgoing && conn.outgoing.length > 0) {
                    conn.outgoing.forEach((edge: any) => {
                        const relationName = format_relation_name(extract_table_name(edge.id));
                        const target = strip_record_prefix(edge.out);
                        sections.push(`  - ${relationName} ${target}`);
                    });
                }

                // Incoming relations
                if (conn.incoming && conn.incoming.length > 0) {
                    conn.incoming.forEach((edge: any) => {
                        const relationName = format_relation_name(extract_table_name(edge.id));
                        const source = strip_record_prefix(edge.in);
                        sections.push(`  - <- ${source} ${relationName}`);
                    });
                }
            }

            sections.push('');
        });
    }

    return sections.join('\n');
}
