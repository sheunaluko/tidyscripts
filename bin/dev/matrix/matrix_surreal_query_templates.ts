/**
 * SurrealDB query templates for Matrix knowledge graph
 * Follows patterns from tom.ts
 */

// =============================================================================
// Entity Queries
// =============================================================================

/**
 * Check if an entity exists by ID
 * Returns the entity if found, empty array if not
 */
export const CHECK_ENTITY_EXISTS = `
SELECT id FROM Entity WHERE id = $id LIMIT 1
`;

/**
 * Insert entity with deduplication (INSERT IGNORE pattern)
 * Parameters: entity object with { id, embedding, updateId }
 */
export const INSERT_ENTITY = `
INSERT IGNORE INTO Entity $entity
`;

/**
 * Batch insert entities with deduplication
 * Parameters: entities array
 */
export const INSERT_ENTITIES_BATCH = `
INSERT IGNORE INTO Entity $entities
`;

/**
 * Get entity by ID with full data
 */
export const GET_ENTITY_BY_ID = `
SELECT * FROM Entity WHERE id = $id
`;

/**
 * Get multiple entities by IDs
 */
export const GET_ENTITIES_BY_IDS = `
SELECT * FROM Entity WHERE id IN $ids
`;

// =============================================================================
// Relation Queries
// =============================================================================

/**
 * Check if a relation exists by ID in metadata table
 */
export const CHECK_RELATION_EXISTS = `
SELECT id FROM RelationMetadata WHERE id = $id LIMIT 1
`;

/**
 * Create relation using RELATE syntax
 * Parameters: source_id, target_id, relation_name, relation_id, embedding, updateId
 *
 * Note: Using type::thing to create proper record references
 */
export const CREATE_RELATION = `
LET $source = type::thing("Entity", $source_id);
LET $target = type::thing("Entity", $target_id);
LET $rel_table = type::table($relation_name);

RELATE $source->$rel_table->$target CONTENT {
    id: $relation_id,
    embedding: $embedding,
    updateId: $updateId,
    created: time::now()
}
`;

/**
 * Store relation metadata separately for vector search
 * This stores relation metadata in a dedicated table for embedding-based search
 */
export const INSERT_RELATION_METADATA = `
INSERT IGNORE INTO RelationMetadata {
    id: $relation_id,
    name: $relation_name,
    source_id: $source_id,
    target_id: $target_id,
    embedding: $embedding,
    updateId: $updateId,
    created: time::now()
}
`;

// =============================================================================
// Update Tracking Queries
// =============================================================================

/**
 * Store EntityUpdate record
 */
export const STORE_ENTITY_UPDATE = `
INSERT INTO EntityUpdate {
    id: $id,
    existed: $existed,
    added: $added,
    removed: $removed,
    created: time::now()
}
`;

/**
 * Store RelationUpdate record
 */
export const STORE_RELATION_UPDATE = `
INSERT INTO RelationUpdate {
    id: $id,
    existed: $existed,
    added: $added,
    removed: $removed,
    created: time::now()
}
`;

/**
 * Store GraphUpdate record
 */
export const STORE_GRAPH_UPDATE = `
INSERT INTO GraphUpdate {
    id: $id,
    entityUpdateId: $entityUpdateId,
    relationUpdateId: $relationUpdateId,
    text: $text,
    embedding: $embedding,
    metadata: $metadata,
    created: time::now()
}
`;

// =============================================================================
// Vector Search Queries
// =============================================================================

/**
 * Vector search for entities using KNN
 * Uses <|limit,effort|> operator pattern from tom.ts
 *
 * Parameters:
 * - e: embedding vector
 * - limit: number of results
 * - effort: HNSW search effort (typically 40)
 */
export const ENTITY_VECTOR_SEARCH = `
SELECT id, vector::distance::knn() AS distance
FROM Entity
WHERE embedding <|$limit,$effort|> $e
ORDER BY distance ASC
`;

/**
 * Vector search for relation metadata
 */
export const RELATION_VECTOR_SEARCH = `
SELECT id, name, source_id, target_id, vector::distance::knn() AS distance
FROM RelationMetadata
WHERE embedding <|$limit,$effort|> $e
ORDER BY distance ASC
`;

// =============================================================================
// Graph Traversal Queries
// =============================================================================

/**
 * Get all outgoing relations from an entity
 * Uses -> graph traversal operator
 */
export const GET_ENTITY_OUTGOING = `
LET $entity = type::thing("Entity", $id);
SELECT * FROM $entity->?->? FETCH out
`;

/**
 * Get all incoming relations to an entity
 * Uses <- graph traversal operator
 */
export const GET_ENTITY_INCOMING = `
LET $entity = type::thing("Entity", $id);
SELECT * FROM $entity<-?<-? FETCH in
`;

/**
 * Get all relations (both directions) for an entity
 * Returns outgoing and incoming relationships with connected entities
 */
export const GET_ENTITY_ALL_RELATIONS = `
LET $entity = type::thing("Entity", $id);

SELECT
    id,
    ->? AS outgoing,
    <-? AS incoming
FROM $entity
`;

/**
 * Get N-hop neighborhood of an entity
 * Configurable depth for graph expansion
 */
export const GET_ENTITY_NEIGHBORHOOD = `
LET $entity = type::thing("Entity", $id);

SELECT * FROM $entity.{1..$depth}(<-?<-?, ->?->?)
FETCH Entity
`;

// =============================================================================
// Index Creation Queries (for setup)
// =============================================================================

/**
 * Create HNSW index on Entity embeddings (1536 dims for get_cloud_embedding)
 */
export const CREATE_ENTITY_EMBEDDING_INDEX = `
DEFINE INDEX entity_embedding_idx ON Entity FIELDS embedding HNSW DIMENSION 1536 DIST COSINE
`;

/**
 * Create HNSW index on RelationMetadata embeddings
 */
export const CREATE_RELATION_EMBEDDING_INDEX = `
DEFINE INDEX relation_embedding_idx ON RelationMetadata FIELDS embedding HNSW DIMENSION 1536 DIST COSINE
`;

/**
 * Create index on GraphUpdate text embeddings
 */
export const CREATE_GRAPH_UPDATE_EMBEDDING_INDEX = `
DEFINE INDEX graph_update_embedding_idx ON GraphUpdate FIELDS embedding HNSW DIMENSION 1536 DIST COSINE
`;
