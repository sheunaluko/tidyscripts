#!/usr/bin/env ts-node
/**
 * tom_surreal_demo_script.ts
 * --------------------------
 * A step-by-step executable demo script showcasing
 * `tom_surreal_v2` usage with frequent logging and comments.
 *
 * Run with:
 *    ts-node tom_surreal_demo_script.ts
 */

import { tom_surreal, set_database_url } from './tom_surreal_v2';

async function main() {
  // 1. Configure RPC endpoint (optional override)
  console.log('[1/7] Configuring database URL...');
  set_database_url('http://127.0.0.1:8000/rpc');

  // 2. Establish connection, select namespace & database, authenticate, and set up schema
  console.log('[2/8] Connecting to SurrealDB and initializing schema...');
  let client;
  try {
    client = await tom_surreal._internals.get_client();
    console.log('✔ Connected and schema initialized.');
  } catch (err: any) {
    console.error('✖ Connection/init failed:', err.message || err);
    return;
  }
  // 2.5/8: Clear existing data for a clean demo
  console.log('[3/8] Clearing existing tables...');
  try {
    await client.query('DELETE FROM knowledge_update');
    await client.query('DELETE FROM relation');
    await client.query('DELETE FROM entity');
    console.log('✔ Tables cleared');
  } catch (err: any) {
    console.error('⚠ Clearing tables failed, but continuing demo:', err.message || err);
  }

  // 3. Ingest sample text and record knowledge update
  const sampleText = 'COVID-19 infection causes fever and cough.';
  console.log('[3/7] Ingesting text with summary:', sampleText);
  const { added_entities, added_relations } = await tom_surreal.ingest_text_with_summary(sampleText);
  console.log('✔ Added entities:', added_entities.map(e => e.eid));
  console.log('✔ Added relations:', added_relations.map(r => r.rid));

  // 4. List all entities in `entity` table
  console.log('[4/7] Querying all entities...');
  const allEntities = await tom_surreal.queries.getAllEntities();
  console.log(`→ Total entities: ${allEntities.length}`);

  // 5. Perform semantic vector search on primary embeddings
  if (allEntities.length > 0) {
    console.log('[5/7] Performing semantic search (primary_vec) using first entity...');
    const vec = (allEntities[0] as any).primary_vec as number[];
    console.log('→ Base vector sample:', vec.slice(0,5), '...');
    const topResults = await tom_surreal.queries.semanticSearchEntitiesByPrimary(vec, 5);
    console.log('✔ Search results:', topResults.map(r => r.id));
  } else {
    console.log('⚠ No entities found; skip semantic search.');
  }

  // 6. Generate and execute a DB query via internal LLM helper
  console.log('[6/7] Generating a SurrealQL query via LLM...');
  const llmQuery = await tom_surreal.think_about_db_query_surreal();
  console.log('→ LLM-generated query:', llmQuery);
  try {
    const [llmResult] = await client.query(llmQuery);
    console.log('✔ LLM query result:', llmResult);
  } catch (err) {
    console.error('✖ LLM query failed:', err);
  }

  // 7. Export and re-import the database state
  console.log('[7/7] Exporting database...');
  const dump = await client.export({ tables: true, records: true });
  console.log(`→ Exported data length: ${dump.length} chars`);
  console.log('Importing back exported data...');
  await client.import(dump);
  console.log('✔ Import complete.');

  console.log('Demo script completed successfully.');
}

// Execute main and handle errors
main().catch(err => {
  console.error('Demo script encountered an error:', err);
  process.exit(1);
});