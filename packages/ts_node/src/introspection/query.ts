/**
 * Query Functions for Tidyscripts Introspection System
 *
 * Provides three types of queries:
 * 1. Embedding-based similarity search
 * 2. Text-based regex search
 * 3. Graph traversal queries (CONTAINS and IMPORTS relationships)
 */

import type Surreal from 'surrealdb';
import { generateEmbedding } from './embeddings.js';
import { logger } from './logger.js';
import { TABLE_NAMES } from './constants.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Base node result containing common fields
 */
export interface BaseNodeResult {
  id: string;           // Record ID (e.g., "function_node:123")
  nodeId: number;       // Node ID
  name: string;
  kind: number;
  docstring: string;
}

/**
 * Function node query result
 */
export interface FunctionNodeResult extends BaseNodeResult {
  filePath: string;
  signature: any;
  sources: any[];
}

/**
 * Class node query result
 */
export interface ClassNodeResult extends BaseNodeResult {
  filePath: string;
  sources: any[];
}

/**
 * Module node query result
 */
export interface ModuleNodeResult extends BaseNodeResult {
  path: string;
  exports: string[];
}

/**
 * Interface node query result
 */
export interface InterfaceNodeResult extends BaseNodeResult {
  filePath: string;
  sources: any[];
}

/**
 * Type alias node query result
 */
export interface TypeAliasNodeResult extends BaseNodeResult {
  filePath: string;
  type: any;
  sources: any[];
}

/**
 * Union type for all node results
 */
export type NodeResult =
  | FunctionNodeResult
  | ClassNodeResult
  | ModuleNodeResult
  | InterfaceNodeResult
  | TypeAliasNodeResult;

/**
 * Similarity search result with score
 */
export interface SimilarityResult<T = NodeResult> {
  node: T;
  similarity: number;   // Cosine similarity score (0-1, higher is better)
}

/**
 * Options for embedding-based similarity search
 */
export interface SimilaritySearchOptions {
  limit?: number;           // Number of results to return (default: 10)
  threshold?: number;       // Minimum similarity score (0-1, default: 0)
  tables?: string[];        // Tables to search (default: all node tables)
}

/**
 * Options for text-based search
 */
export interface TextSearchOptions {
  limit?: number;           // Number of results to return (default: 10)
  fields?: string[];        // Fields to search (default: ['name', 'docstring'])
  tables?: string[];        // Tables to search (default: all node tables)
  caseInsensitive?: boolean; // Case-insensitive search (default: true)
}

/**
 * Graph relationship edge
 */
export interface RelationshipEdge {
  from: string;     // Source record ID
  to: string;       // Target record ID
}

// ============================================================================
// 1. Embedding-Based Similarity Search
// ============================================================================

/**
 * Search for nodes similar to a query using embedding similarity
 *
 * @param db - SurrealDB instance
 * @param query - Natural language query
 * @param options - Search options
 * @returns Array of nodes with similarity scores
 */
export async function searchBySimilarity(
  db: Surreal,
  query: string,
  options: SimilaritySearchOptions = {}
): Promise<SimilarityResult[]> {
  const {
    limit = 10,
    threshold = 0,
    tables = [
      TABLE_NAMES.FUNCTION_NODE,
      TABLE_NAMES.CLASS_NODE,
      TABLE_NAMES.MODULE_NODE,
      TABLE_NAMES.INTERFACE_NODE,
      TABLE_NAMES.TYPE_ALIAS_NODE,
    ],
  } = options;

  logger.startTimer('similarity-search');
  logger.debug('Starting similarity search', { query, limit, threshold, tables });

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    logger.debug('Query embedding generated', { dimensions: queryEmbedding.length });

    // Search each table and collect results
    const allResults: SimilarityResult[] = [];

    for (const table of tables) {
      // Get embedding hash for each node
      const nodesResult = await db.query<[Array<{ id: string; embeddingHash: string }>]>(
        `SELECT id, embeddingHash FROM ${table}`
      );

      const nodes = nodesResult?.[0] || [];

      for (const node of nodes) {
        // Get embedding from cache using embeddingHash
        const embeddingResult = await db.query<[Array<{ embedding: number[] }>]>(
          `SELECT embedding FROM embedding_cache WHERE contentHash = $hash`,
          { hash: node.embeddingHash }
        );

        const cachedEmbedding = embeddingResult?.[0]?.[0]?.embedding;
        if (!cachedEmbedding) {
          logger.debug('No embedding found for node', { recordId: node.id } as any);
          continue;
        }

        // Calculate cosine similarity
        const similarityResult = await db.query<[{ similarity: number }]>(
          `RETURN vector::similarity::cosine($embedding1, $embedding2)`,
          { embedding1: queryEmbedding, embedding2: cachedEmbedding }
        );

        const similarity = similarityResult?.[0]?.similarity ?? 0;

        // Filter by threshold
        if (similarity >= threshold) {
          // Fetch full node data
          const nodeDataResult = await db.query<[NodeResult[]]>(
            `SELECT * FROM ${node.id}`
          );

          const nodeData = nodeDataResult?.[0]?.[0];
          if (nodeData) {
            allResults.push({
              node: nodeData,
              similarity,
            });
          }
        }
      }
    }

    // Sort by similarity (descending) and limit
    allResults.sort((a, b) => b.similarity - a.similarity);
    const results = allResults.slice(0, limit);

    const duration = logger.endTimer('similarity-search');
    logger.info('Similarity search completed', {
      query,
      resultsFound: results.length,
      durationMs: duration,
    });

    return results;
  } catch (error) {
    logger.error('Similarity search failed', error as Error, { query });
    throw new Error(`Similarity search failed: ${error}`);
  }
}

// ============================================================================
// 2. Text-Based Regex Search
// ============================================================================

/**
 * Search for nodes using case-insensitive regex matching
 *
 * @param db - SurrealDB instance
 * @param pattern - Regex pattern to search for
 * @param options - Search options
 * @returns Array of matching nodes
 */
export async function searchByText(
  db: Surreal,
  pattern: string,
  options: TextSearchOptions = {}
): Promise<NodeResult[]> {
  const {
    limit = 10,
    fields = ['name', 'docstring'],
    tables = [
      TABLE_NAMES.FUNCTION_NODE,
      TABLE_NAMES.CLASS_NODE,
      TABLE_NAMES.MODULE_NODE,
      TABLE_NAMES.INTERFACE_NODE,
      TABLE_NAMES.TYPE_ALIAS_NODE,
    ],
    caseInsensitive = true,
  } = options;

  logger.startTimer('text-search');
  logger.debug('Starting text search', { pattern, limit, fields, tables });

  try {
    const allResults: NodeResult[] = [];

    // Build regex pattern
    const regexPattern = caseInsensitive ? `(?i)${pattern}` : pattern;

    for (const table of tables) {
      // Build WHERE clause for multiple fields
      const whereConditions = fields.map(field => `${field} ~ $pattern`).join(' OR ');

      const query = `SELECT * FROM ${table} WHERE ${whereConditions} LIMIT $limit`;

      const result = await db.query<[NodeResult[]]>(query, {
        pattern: regexPattern,
        limit,
      });

      const nodes = result?.[0] || [];
      allResults.push(...nodes);
    }

    // Sort by name and limit total results
    allResults.sort((a, b) => a.name.localeCompare(b.name));
    const results = allResults.slice(0, limit);

    const duration = logger.endTimer('text-search');
    logger.info('Text search completed', {
      pattern,
      resultsFound: results.length,
      durationMs: duration,
    });

    return results;
  } catch (error) {
    logger.error('Text search failed', error as Error, { pattern });
    throw new Error(`Text search failed: ${error}`);
  }
}

// ============================================================================
// 3. Graph Traversal Queries
// ============================================================================

/**
 * Find what a node contains (children via CONTAINS edge)
 *
 * @param db - SurrealDB instance
 * @param nodeId - Record ID (e.g., "module_node:123")
 * @returns Array of child nodes
 */
export async function findContains(
  db: Surreal,
  nodeId: string
): Promise<NodeResult[]> {
  logger.debug('Finding contained nodes', { recordId: nodeId } as any);

  try {
    // Get all outgoing CONTAINS edges and fetch the target nodes
    const result = await db.query<[NodeResult[]]>(
      `SELECT VALUE ->CONTAINS.out.* FROM ${nodeId}`
    );

    const nodes = result?.[0] || [];
    logger.debug('Found contained nodes', { recordId: nodeId, count: nodes.length } as any);

    return nodes;
  } catch (error) {
    logger.error('Find contains failed', error as Error, { recordId: nodeId } as any);
    throw new Error(`Find contains failed: ${error}`);
  }
}

/**
 * Find what contains a node (parent via CONTAINS edge)
 *
 * @param db - SurrealDB instance
 * @param nodeId - Record ID (e.g., "function_node:123")
 * @returns Array of parent nodes
 */
export async function findContainedBy(
  db: Surreal,
  nodeId: string
): Promise<NodeResult[]> {
  logger.debug('Finding container nodes', { recordId: nodeId } as any);

  try {
    // Get all incoming CONTAINS edges and fetch the source nodes
    const result = await db.query<[NodeResult[]]>(
      `SELECT VALUE <-CONTAINS.in.* FROM ${nodeId}`
    );

    const nodes = result?.[0] || [];
    logger.debug('Found container nodes', { recordId: nodeId, count: nodes.length } as any);

    return nodes;
  } catch (error) {
    logger.error('Find contained by failed', error as Error, { recordId: nodeId } as any);
    throw new Error(`Find contained by failed: ${error}`);
  }
}

/**
 * Find all descendants of a node (recursive CONTAINS traversal)
 *
 * @param db - SurrealDB instance
 * @param nodeId - Record ID (e.g., "module_node:123")
 * @param maxDepth - Maximum recursion depth (default: 10)
 * @returns Array of all descendant nodes
 */
export async function findAllDescendants(
  db: Surreal,
  nodeId: string,
  maxDepth: number = 10
): Promise<NodeResult[]> {
  logger.debug('Finding all descendants', { recordId: nodeId, maxDepth } as any);

  try {
    // Use recursive traversal with depth limit
    const result = await db.query<[NodeResult[]]>(
      `SELECT VALUE ->CONTAINS(1..${maxDepth}).out.* FROM ${nodeId}`
    );

    const nodes = result?.[0] || [];
    logger.debug('Found all descendants', { recordId: nodeId, count: nodes.length } as any);

    return nodes;
  } catch (error) {
    logger.error('Find all descendants failed', error as Error, { recordId: nodeId } as any);
    throw new Error(`Find all descendants failed: ${error}`);
  }
}

/**
 * Find all ancestors of a node (recursive CONTAINS traversal)
 *
 * @param db - SurrealDB instance
 * @param nodeId - Record ID (e.g., "function_node:123")
 * @param maxDepth - Maximum recursion depth (default: 10)
 * @returns Array of all ancestor nodes
 */
export async function findAllAncestors(
  db: Surreal,
  nodeId: string,
  maxDepth: number = 10
): Promise<NodeResult[]> {
  logger.debug('Finding all ancestors', { recordId: nodeId, maxDepth } as any);

  try {
    // Use recursive traversal with depth limit
    const result = await db.query<[NodeResult[]]>(
      `SELECT VALUE <-CONTAINS(1..${maxDepth}).in.* FROM ${nodeId}`
    );

    const nodes = result?.[0] || [];
    logger.debug('Found all ancestors', { recordId: nodeId, count: nodes.length } as any);

    return nodes;
  } catch (error) {
    logger.error('Find all ancestors failed', error as Error, { recordId: nodeId } as any);
    throw new Error(`Find all ancestors failed: ${error}`);
  }
}

/**
 * Find what modules a module imports (via IMPORTS edge)
 *
 * @param db - SurrealDB instance
 * @param moduleId - Module record ID (e.g., "module_node:123")
 * @returns Array of imported module nodes
 */
export async function findImports(
  db: Surreal,
  moduleId: string
): Promise<NodeResult[]> {
  logger.debug('Finding imports', { recordId: moduleId } as any);

  try {
    const result = await db.query<[NodeResult[]]>(
      `SELECT VALUE ->IMPORTS.out.* FROM ${moduleId}`
    );

    const nodes = result?.[0] || [];
    logger.debug('Found imports', { recordId: moduleId, count: nodes.length } as any);

    return nodes;
  } catch (error) {
    logger.error('Find imports failed', error as Error, { recordId: moduleId } as any);
    throw new Error(`Find imports failed: ${error}`);
  }
}

/**
 * Find what imports a module (via IMPORTS edge)
 *
 * @param db - SurrealDB instance
 * @param moduleId - Module record ID (e.g., "module_node:123")
 * @returns Array of module nodes that import this module
 */
export async function findImportedBy(
  db: Surreal,
  moduleId: string
): Promise<NodeResult[]> {
  logger.debug('Finding importers', { recordId: moduleId } as any);

  try {
    const result = await db.query<[NodeResult[]]>(
      `SELECT VALUE <-IMPORTS.in.* FROM ${moduleId}`
    );

    const nodes = result?.[0] || [];
    logger.debug('Found importers', { recordId: moduleId, count: nodes.length } as any);

    return nodes;
  } catch (error) {
    logger.error('Find imported by failed', error as Error, { recordId: moduleId } as any);
    throw new Error(`Find imported by failed: ${error}`);
  }
}

/**
 * Get CONTAINS edges for a node
 *
 * @param db - SurrealDB instance
 * @param nodeId - Record ID
 * @returns Array of relationship edges
 */
export async function getContainsEdges(
  db: Surreal,
  nodeId: string
): Promise<RelationshipEdge[]> {
  logger.debug('Getting CONTAINS edges', { recordId: nodeId } as any);

  try {
    const result = await db.query<[RelationshipEdge[]]>(
      `SELECT in as from, out as to FROM CONTAINS WHERE in = $nodeId`,
      { nodeId }
    );

    const edges = result?.[0] || [];
    logger.debug('Found CONTAINS edges', { recordId: nodeId, count: edges.length } as any);

    return edges;
  } catch (error) {
    logger.error('Get CONTAINS edges failed', error as Error, { recordId: nodeId } as any);
    throw new Error(`Get CONTAINS edges failed: ${error}`);
  }
}

/**
 * Get IMPORTS edges for a module
 *
 * @param db - SurrealDB instance
 * @param moduleId - Module record ID
 * @returns Array of relationship edges
 */
export async function getImportsEdges(
  db: Surreal,
  moduleId: string
): Promise<RelationshipEdge[]> {
  logger.debug('Getting IMPORTS edges', { recordId: moduleId } as any);

  try {
    const result = await db.query<[RelationshipEdge[]]>(
      `SELECT in as from, out as to FROM IMPORTS WHERE in = $moduleId`,
      { moduleId }
    );

    const edges = result?.[0] || [];
    logger.debug('Found IMPORTS edges', { recordId: moduleId, count: edges.length } as any);

    return edges;
  } catch (error) {
    logger.error('Get IMPORTS edges failed', error as Error, { recordId: moduleId } as any);
    throw new Error(`Get IMPORTS edges failed: ${error}`);
  }
}
