import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * Entity stored in the 'tom' collection.
 */
export interface Entity {
  kind: 'entity';
  category: string;
  eid: string;
  vectors: {
    primary: number[];
    secondary: number[];
  };
}

/**
 * Relation stored in the 'tom' collection.
 */
export interface Relation {
  kind: 'relation';
  name: string;
  source_eid: string;
  dest_eid: string;
  rid: string;
  vectors: {
    primary: number[];
    secondary: number[];
  };
}

// Default client connects to localhost:6333
const client = new QdrantClient();
const COLLECTION = 'tom';

/**
 * Helper to scroll through all points in a collection matching a filter.
 */
async function scrollAll(collectionName: string, filter: any, withPayload = true) {
  const all: any[] = [];
  let offset: string | number | undefined;
  do {
    const res = await client.scroll(collectionName, {
      filter,
      limit: 100,
      offset,
      with_payload: withPayload,
      with_vector: false,
    });
    all.push(...res.points);
    offset = res.next_page_offset as string | number | undefined;
  } while (offset != null);
  return all;
}

/**
 * Retrieve all entities from the 'tom' collection.
 */
export async function getAllEntities() {
  const records = await scrollAll(COLLECTION, { must: { key: 'kind', match: { value: 'entity' } } });
  return records.map(r => r.payload);
}

/**
 * Retrieve all relations from the 'tom' collection.
 */
export async function getAllRelations() {
  const records = await scrollAll(COLLECTION, { must: { key: 'kind', match: { value: 'relation' } } });
  return records.map(r => r.payload ); 
}

/**
 * Get entities by category.
 */
export async function getEntitiesByCategory(category: string)  {
  const records = await scrollAll(COLLECTION, {
    must: [
      { key: 'kind', match: { value: 'entity' } },
      { key: 'category', match: { value: category } },
    ],
  });
  return records.map(r => r.payload );
}

/**
 * Find nearest neighbor entities to the given entity ID, based on primary vector embedding.
 */
export async function findNearestEntitiesByEntity(eid: string, limit = 5)  {
  // Retrieve the source entity to obtain its primary vector
  const [record] = await client.retrieve(COLLECTION, {
    ids: [eid],
    with_payload: false,
    with_vector: true,
  });
  // Extract the primary vector (could be named vectors)
  const vecField = record.vector as any;
  const primaryVec: number[] = Array.isArray(vecField) ? vecField : vecField.primary;
  // Search for nearest entities (excluding itself)
  const results = await client.search(COLLECTION, {
    vector: { name: 'primary', vector: primaryVec },
    filter: {
      must: { key: 'kind', match: { value: 'entity' } },
      must_not: { key: 'eid', match: { value: eid } },
    },
    limit,
    with_payload: true,
  });
  return results.map(r => r.payload );
}

/**
 * Find relations for a given entity (by source_eid).
 */
export async function getRelationsForEntity(sourceEid: string)  {
  const records = await scrollAll(COLLECTION, {
    must: [
      { key: 'kind', match: { value: 'relation' } },
      { key: 'source_eid', match: { value: sourceEid } },
    ],
  });
  return records.map(r => r.payload );
}

/**
 * Find entities connected to a given entity by a specific relation name.
 */
export async function findConnectedEntities(sourceEid: string, relationName: string)  {
  const rels = await scrollAll(COLLECTION, {
    must: [
      { key: 'kind', match: { value: 'relation' } },
      { key: 'source_eid', match: { value: sourceEid } },
      { key: 'name', match: { value: relationName } },
    ],
  });
  const destIds = rels.map(r => (r.payload as any).dest_eid);
  if (destIds.length === 0) return [];
  const recs = await client.retrieve(COLLECTION, { ids: destIds, with_payload: true });
  return recs.map(r => r.payload);
}

/**
 * Perform semantic search on entities using secondary (category) vector.
 */
export async function semanticSearchEntities(queryVec: number[], limit = 5)  {
  const results = await client.search(COLLECTION, {
    vector: { name: 'secondary', vector: queryVec },
    filter: { must: { key: 'kind', match: { value: 'entity' } } },
    limit,
    with_payload: true,
  });
  return results.map(r => r.payload );
}

/**
 * Perform semantic search on relations using primary (name) vector.
 */
export async function semanticSearchRelations(queryVec: number[], limit = 5) {
  // Default uses primary (name) vector for relation semantic search
  const results = await client.search(COLLECTION, {
    vector: { name: 'primary', vector: queryVec },
    filter: { must: { key: 'kind', match: { value: 'relation' } } },
    limit,
    with_payload: true,
  });
  return results.map(r => r.payload );
}

/**
 * Semantic search on entities using the primary (eid) vector.
 */
export async function semanticSearchEntitiesByPrimary(queryVec: number[], limit = 5)  {
  const results = await client.search(COLLECTION, {
    vector: { name: 'primary', vector: queryVec },
    filter: { must: { key: 'kind', match: { value: 'entity' } } },
    limit,
    with_payload: true,
  });
  return results.map(r => r.payload );
}

/**
 * Semantic search on entities using the secondary (category) vector.
 */
export async function semanticSearchEntitiesBySecondary(queryVec: number[], limit = 5) {
  return semanticSearchEntities(queryVec, limit);
}

/**
 * Semantic search on relations using the primary (name) vector.
 */
export async function semanticSearchRelationsByPrimary(queryVec: number[], limit = 5) {
  return semanticSearchRelations(queryVec, limit);
}

/**
 * Semantic search on relations using the secondary (rid) vector.
 */
export async function semanticSearchRelationsBySecondary(queryVec: number[], limit = 5)  {
  const results = await client.search(COLLECTION, {
    vector: { name: 'secondary', vector: queryVec },
    filter: { must: { key: 'kind', match: { value: 'relation' } } },
    limit,
    with_payload: true,
  });
  return results.map(r => r.payload );
}
