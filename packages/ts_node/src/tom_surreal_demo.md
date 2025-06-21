# TOM SurrealDB v2 Demo

This document demonstrates how to use the `tom_surreal_v2` library with the SurrealDB JS SDK v2.

## 1. Setup and Initialization
```ts
import { tom_surreal, set_database_url } from './tom_surreal_v2';

// (Optional) Override default RPC endpoint
set_database_url('http://localhost:8000/rpc');

// Internally, the first call will connect, select namespace/database, authenticate, and initialize schema
const client = await tom_surreal._internals.get_client();
```

## 2. Ingesting Text
```ts
// Basic ingestion: extracts and stores entities & relations
await tom_surreal.ingest_text(
  'Aspirin is a medication used to treat headaches and reduce fever.'
);

// Ingest with summary record created in `knowledge_update`
const { added_entities, added_relations } = await tom_surreal.ingest_text_with_summary(
  'COVID-19 infection causes fever and cough.'
);
console.log(added_entities, added_relations);
```

## 3. Low-Level Entity & Relation Operations
```ts
// Extract entities without storing
const entities = await tom_surreal.extract_entities('Fever indicates infection.');
console.log(entities);

// Manually create an entity
await tom_surreal.process_entity({ kind: 'entity', eid: 'infection', category: 'condition' });

// Extract relations and store them
const relations = await tom_surreal.extract_relations(
  'Influenza causes fever', entities
);
await Promise.all(relations.map(r => tom_surreal.process_relation(r)));
```

## 4. Semantic Search Queries
```ts
// Retrieve all entities
const allEnts = await tom_surreal.queries.getAllEntities();

// Perform vector search on primary embedding
const sampleVec = allEnts[0].primary_vec as number[];
const top5 = await tom_surreal.queries.semanticSearchEntitiesByPrimary(sampleVec, 5);
console.log(top5);
```

## 5. Dynamic Query Generation via LLM
```ts
// Ask the internal LLM to produce a SurrealQL TypeScript snippet
const generatedQuery = await tom_surreal.think_about_db_query_surreal();
console.log('LLM-generated query:', generatedQuery);

// Execute the generated query
const [results] = await client.query(generatedQuery);
console.log(results);
```

## 6. Exporting and Importing Data
```ts
// Export entire database (tables & records only)
const dump = await client.export({ tables: true, records: true });

// Later, import back
await client.import(dump);
```

## 7. Utilities
```ts
// Convert entity ID to deterministic UUID
const uuid = tom_surreal.util.eid_to_uuid('headache');

// Check if an entity exists
const exists = await tom_surreal.util.check_for_eid('headache');
console.log(`Entity exists?`, exists);
```