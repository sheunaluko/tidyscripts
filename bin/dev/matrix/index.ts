/**
 * Matrix Knowledge Graph - Main Export
 *
 * Matrix is a knowledge graph built on SurrealDB with LLM-based entity/relation
 * extraction and vector search capabilities.
 *
 * @example Quick Start
 * ```typescript
 * import { matrix } from "tidyscripts/bin/dev";
 *
 * // Create and initialize
 * const kg = new matrix.Matrix({
 *   name: 'my_kg',
 *   connectionOps: {
 *     url: 'ws://localhost:8000/rpc',
 *     namespace: 'test',
 *     database: 'knowledge'
 *   },
 *   completionOps: { model: 'gpt-4o' }
 * });
 *
 * await kg.connect();
 * await kg.setup();
 *
 * // Add knowledge
 * await kg.add_knowledge(
 *   "Albert Einstein developed relativity",
 *   { source: 'textbook' }
 * );
 *
 * // Search
 * const results = await kg.search_for_knowledge("Einstein", { limit: 5 });
 * ```
 *
 * @example Using Helpers Directly
 * ```typescript
 * import { matrix } from "tidyscripts/bin/dev";
 *
 * // Generate entity ID
 * const id = matrix.helpers.generate_entity_id("Albert Einstein");
 * // => "albert_einstein"
 *
 * // Get embedding
 * const embedding = await matrix.helpers.get_embedding("some text");
 * // => [0.123, -0.456, ...] (1536 dimensions)
 *
 * // Create entity with embedding
 * const entity = await matrix.helpers.create_entity("Einstein", "update_123");
 * // => { id: 'einstein', embedding: [...], updateId: 'update_123' }
 * ```
 */

export { Matrix } from "./matrix";
export * as helpers from "./matrix_helpers";
export * as prompts from "./matrix_prompt_templates";
export * as templates from "./matrix_surreal_query_templates";
export { initialize } from "./init";
