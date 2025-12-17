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
