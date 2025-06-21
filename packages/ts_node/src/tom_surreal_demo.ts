/**
 * tom_surreal_demo.ts
 * ------------------
 * Provides a `demo()` function that exercises the tom_surreal_v2 library
 * with logging at each step.
 */
import { tom_surreal, set_database_url } from './tom_surreal_v2';

/**
 * Run the demo script programmatically.
 *
 * Steps:
 *  1) Configure DB URL
 *  2) Connect, use namespace/db, authenticate, init schema
 *  3) Ingest sample text with summary
 *  4) Query all entities
 *  5) Semantic search example
 *  6) LLM-driven query generation & execution
 *  7) Export & import back database
 */
export async function demo(): Promise<void> {
  console.log('[Demo] 1/7: Configuring database URL...');
  set_database_url('http://127.0.0.1:8000/rpc');

  console.log('[Demo] 2/8: Connecting & initializing schema...');
  let client;
  try {
    client = await tom_surreal._internals.get_client();
    console.log('✔ Connected');
  } catch (err: any) {
    console.error('✖ Connection/init failed:', err.message || err);
    return;
  }
  // 2.5/8: Clear existing data for a clean demo run
  console.log('[Demo] 3/8: Clearing existing tables (entity, relation, knowledge_update)...');
  try {
    await client.query('DELETE FROM knowledge_update');
    await client.query('DELETE FROM relation');
    await client.query('DELETE FROM entity');
    console.log('✔ Tables cleared');
  } catch (err: any) {
    console.error('⚠ Failed to clear tables, continuing demo:', err.message || err);
  }

  const text = 'Influenza infection causes fever and cough.';
  console.log('[Demo] 3/7: Ingesting text with summary:', text);
  const { added_entities, added_relations } = await tom_surreal.ingest_text_with_summary(text);
  console.log('✔ Added entities:', added_entities.map(e => e.eid));
  console.log('✔ Added relations:', added_relations.map(r => r.rid));

  console.log('[Demo] 4/7: Querying all entities...');
  // Cast to any[] for demo convenience
  const allEntities = (await tom_surreal.queries.getAllEntities()) as any[];
  console.log(`→ Total entities: ${allEntities.length}`);

  if (allEntities.length) {
    console.log('[Demo] 5/7: Semantic search on primary_vec using first entity');
    const vec = allEntities[0].primary_vec as number[];
    // Cast to any[] for demo convenience
    const top5 = (await tom_surreal.queries.semanticSearchEntitiesByPrimary(vec, 5)) as any[];
    console.log('✔ Top5 IDs:', top5.map((r: any) => r.id));
  } else {
    console.log('⚠ No entities for semantic search');
  }

  console.log('[Demo] 6/7: Generating LLM-driven query');
  const llmQuery = await tom_surreal.think_about_db_query_surreal();
  console.log('→ Query:', llmQuery);
  try {
    // Execute the generated query and cast to any[] for demo
    const llmResults = (await client.query(llmQuery as string)) as any[];
    if (llmResults.length) {
      console.log('✔ LLM query result:', llmResults[0]);
    } else {
      console.log('⚠ LLM returned no results');
    }
  } catch (err: any) {
    console.error('✖ LLM query failed:', err.message || err);
  }

  console.log('[Demo] 7/7: Exporting database...');
  const dump = await client.export({ tables: true, records: true });
  console.log(`→ Dump length: ${dump.length}`);
  console.log('Importing dump back...');
  await client.import(dump);
  console.log('✔ Import complete');
}
