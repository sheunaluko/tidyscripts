import { get_client, init_tom_collection } from './tom';
import { embedding1024 } from './tom_util';

/**
 * Retrieve the entity matching the given eid.
 * @param eid Entity identifier to look up.
 * @returns Qdrant query result for the entity.
 */
export async function getEntityByEid(eid: string): Promise<any> {
  await init_tom_collection();
  const client = get_client();
  return client.search('tom', {
    filter: { must: [{ key: 'eid', match: { value: eid } }] },
    limit: 1,
    withPayload: true,
  });
}

/**
 * Retrieve all relations where the given eid appears as source or target.
 * @param eid Entity identifier to find relations for.
 * @returns Array of relation points from Qdrant.
 */
export async function getRelationsForEntity(eid: string): Promise<any[]> {
  await init_tom_collection();
  const client = get_client();
  const sourceRes = await client.search('tom', {
    filter: {
      must: [
        { key: 'kind', match: { value: 'relation' } },
        { key: 'source_eid', match: { value: eid } },
      ],
    },
    withPayload: true,
  });
  const destRes = await client.search('tom', {
    filter: {
      must: [
        { key: 'kind', match: { value: 'relation' } },
        { key: 'dest_eid', match: { value: eid } },
      ],
    },
    withPayload: true,
  });
  return [...(sourceRes.points || []), ...(destRes.points || [])];
}

/**
 * Search the 'tom' collection by semantic similarity to the given text.
 * @param text Input text to embed and query.
 * @param limit Number of results to return (default: 5).
 * @returns Qdrant search result for similar points.
 */
export async function searchByEmbedding(
  text: string,
  limit = 5,
): Promise<any> {
  await init_tom_collection();
  const vector = await embedding1024(text);
  const client = get_client();
  return client.search('tom', {
    vector,
    limit,
    withPayload: true,
  });
}