/**
 * Query Functions for Tidyscripts Introspection System
 *
 * Provides vector similarity search using SurrealDB's HNSW index
 */

import type Surreal from 'surrealdb';
import { generateEmbedding } from './embeddings';
import { logger } from './logger';
import { NodeKind } from './constants';

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
 * Similarity search result with distance score
 */
export interface SimilarityResult {
  id: string;              // embedding_cache record ID
  contentHash: string;     // Content hash for matching to nodes
  dist: number;            // Distance score (lower is better)
  node?: NodeResult;       // Optional populated node data
}

/**
 * Options for embedding-based similarity search
 */
export interface SimilaritySearchOptions {
  limit?: number;           // Number of results to return (default: 5)
  effort?: number;          // HNSW search effort parameter (default: 40)
}

// ============================================================================
// Vector Search Implementation
// ============================================================================

/**
 * Search for nodes similar to a query using vector similarity with HNSW index
 *
 * This uses SurrealDB's vector::distance::knn() function with the <|limit,effort|> syntax
 * to efficiently search using the HNSW index. The effort parameter (second value) MUST be
 * a number to force index usage.
 *
 * @param db - SurrealDB instance
 * @param queryEmbedding - Pre-generated embedding vector to search with
 * @param options - Search options:
 *   - limit: Number of results to return (default: 5)
 *   - effort: HNSW search effort parameter (default: 40) - higher values = more accurate but slower
 * @returns Array of embedding cache results with distance scores (lower distance = more similar)
 *
 * @example
 * const embedding = await generateEmbedding("authentication");
 * const results = await vectorSearch(db, embedding, { limit: 10, effort: 40 });
 */
export async function vectorSearch(
  db: Surreal,
  queryEmbedding: number[],
  options: SimilaritySearchOptions = {}
): Promise<SimilarityResult[]> {
  const {
    limit = 5,
    effort = 40,
  } = options;

  logger.startTimer('vector-search');
  logger.debug('Starting vector search', { limit, effort, dimensions: queryEmbedding.length });

  try {
    // Use SurrealDB's vector search with HNSW index
    // The <|limit,effort|> syntax forces HNSW index usage
    // The effort parameter (40) MUST be a number, not a variable
    const query = `
      SELECT id, contentHash, vector::distance::knn() as dist
      FROM embedding_cache
      WHERE embedding <|${limit},${effort}|> $e
      ORDER BY dist ASC
    `;

    const result = await db.query<[SimilarityResult[]]>(query, { e: queryEmbedding });
    const results = result?.[0] || [];

    const duration = logger.endTimer('vector-search');
    logger.info('Vector search completed', {
      resultsFound: results.length,
      durationMs: duration,
    });

    return results;
  } catch (error) {
    logger.error('Vector search failed', error as Error);
    throw new Error(`Vector search failed: ${error}`);
  }
}

/**
 * Get nodes from embedding IDs by using the EMAP relationship
 *
 * The EMAP edge table connects embedding_cache records to their corresponding
 * code nodes (functions, modules, classes, etc). This function traverses those
 * relationships to retrieve the actual node data.
 *
 * @param db - SurrealDB instance
 * @param eids - Array of embedding_cache record IDs (e.g., ["embedding_cache:abc123"])
 * @returns Array of nodes containing the full code element data
 *
 * @example
 * const nodes = await getNodesFromEmbeddingIds(db, ["embedding_cache:xyz", "embedding_cache:abc"]);
 */
export async function getNodesFromEmbeddingIds(
  db: Surreal,
  eids: string[]
): Promise<NodeResult[]> {
  logger.debug('Getting nodes from embedding IDs', { count: eids.length });

  try {
    const result = await db.query<[Array<{ in: NodeResult }> ]>(
      'SELECT in.* FROM EMAP WHERE out IN $eids',
      { eids }
    );

    const nodes = result?.[0]?.map((item) => item.in) || [];

    logger.debug('Retrieved nodes', { count: nodes.length });
    return nodes;
  } catch (error) {
    logger.error('Get nodes from embedding IDs failed', error as Error);
    throw new Error(`Get nodes from embedding IDs failed: ${error}`);
  }
}

/**
 * Search for nodes similar to a query (high-level convenience function)
 *
 * This combines embedding generation, vector search, and node retrieval into
 * a single function call. Use this when you need the raw search results with nodes
 * but don't need formatted context. For LLM-ready context, use getContextForQuery instead.
 *
 * @param db - SurrealDB instance
 * @param query - Natural language query text (e.g., "authentication functions")
 * @param options - Search options:
 *   - limit: Number of results to return (default: 5)
 *   - effort: HNSW search effort parameter (default: 40)
 * @returns Array of similarity results, each containing:
 *   - id: embedding_cache record ID
 *   - contentHash: Hash for matching to nodes
 *   - dist: Distance score (lower = more similar)
 *   - node: Full node data (if matched)
 *
 * @example
 * const results = await searchBySimilarity(db, "user authentication", { limit: 10 });
 * for (const result of results) {
 *   console.log(`${result.node?.name} (distance: ${result.dist})`);
 * }
 */
export async function searchBySimilarity(
  db: Surreal,
  query: string,
  options: SimilaritySearchOptions = {}
): Promise<SimilarityResult[]> {
  logger.startTimer('similarity-search');
  logger.debug('Starting similarity search', { query, options });

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    logger.debug('Query embedding generated', { dimensions: queryEmbedding.length });

    // Perform vector search
    const searchResults = await vectorSearch(db, queryEmbedding, options);

    if (searchResults.length === 0) {
      logger.info('No search results found');
      return [];
    }

    // Get embedding IDs
    const eids = searchResults.map((r) => r.id);

    // Get nodes from embedding IDs
    const nodes = await getNodesFromEmbeddingIds(db, eids);

    // Match nodes to search results by contentHash
    for (const sr of searchResults) {
      const { contentHash } = sr;
      const matchingNode = nodes.find((n: any) => n.embeddingHash === contentHash);
      if (matchingNode) {
        sr.node = matchingNode;
      }
    }

    const duration = logger.endTimer('similarity-search');
    logger.info('Similarity search completed', {
      query,
      resultsFound: searchResults.filter(r => r.node).length,
      durationMs: duration,
    });

    return searchResults;
  } catch (error) {
    logger.error('Similarity search failed', error as Error, { query });
    throw new Error(`Similarity search failed: ${error}`);
  }
}

// ============================================================================
// Context Conversion for LLM
// ============================================================================

/**
 * Get a node by its numeric node ID
 *
 * Looks up a node across function_node and module_node tables using the numeric
 * portion of the record ID.
 *
 * @param db - SurrealDB instance
 * @param nodeId - Numeric node ID (e.g., 4495)
 * @returns Node data or null if not found
 *
 * @example
 * const node = await getNodeFromId(db, 4495);
 * if (node) console.log(node.name);
 */
export async function getNodeFromId(db: Surreal, nodeId: number): Promise<NodeResult | null> {
  try {
    const result = await db.query<[NodeResult[]]>(
      `SELECT * FROM module_node, function_node WHERE string::split(<string>id, ":")[1] = $nodeId`,
      { nodeId: String(nodeId) }
    );
    return result?.[0]?.[0] || null;
  } catch (error: any) {
    logger.error('Get node from ID failed', error);
    return null;
  }
}

/**
 * Get ancestor paths for a node using graph traversal
 *
 * Traverses the graph backwards to find all paths from the node to its ancestors,
 * showing the containment hierarchy (e.g., function -> class -> module -> project).
 *
 * @param db - SurrealDB instance
 * @param node - Node object or record ID to get ancestors for
 * @returns Array of ancestor paths, where each path is an array of nodes from child to parent
 *
 * @example
 * const paths = await getNodeAncestorPaths(db, myNode);
 * // Returns: [[childNode, parentNode, grandparentNode], [...]]
 */
export async function getNodeAncestorPaths(db: Surreal, node: any): Promise<any[]> {
  logger.debug('Getting ancestor paths', { nodeId: node.id || node });
  try {
    const result = await db.query<[any[]]>(
      `SELECT * FROM $nodeId.{..+path}(<-?<-?).{name,id}`,
      { nodeId: node }
    );
    return result?.[0] ?? [];
  } catch (error: any) {
    logger.error('Get ancestor paths failed', error);
    return [];
  }
}

/**
 * Format a single path for LLM context
 *
 * Converts a path array into a human-readable string showing the containment hierarchy
 * from parent to child (reversed from the graph traversal order).
 *
 * @param path - Array of path nodes from child to parent
 * @param index - Path index for numbering in output
 * @returns Formatted path string in format: "Path N:: parent|type=X|id=Y -> child|type=Z|id=W"
 *
 * @example
 * // Input: [functionNode, classNode, moduleNode]
 * // Output: "Path 0:: module|type=module_node|id=123 -> class|type=class_node|id=456 -> function|type=function_node|id=789"
 */
export function convertPathForContext(path: any, index: number): string {
  const header = `Path ${index}:: `;
  return header + path.map((p: any) => {
    return `${p.name}|type=${p.id.tb}|id=${p.id.id}`;
  }).reverse().join(' -> ');
}

/**
 * Format multiple paths for LLM context
 *
 * Formats an array of paths, with each path on its own line showing the full hierarchy.
 *
 * @param paths - Array of paths, where each path is an array of nodes
 * @returns Formatted multi-line string with all paths, one per line
 *
 * @example
 * const formatted = convertPathsForContext([[node1, node2], [node3, node4]]);
 * // Returns:
 * // "Path 0:: node2 -> node1
 * //  Path 1:: node4 -> node3"
 */
export function convertPathsForContext(paths: any[]): string {
  return paths.map((path: any, i: number) => convertPathForContext(path, i)).join('\n');
}

/**
 * Get and format ancestor paths for a node
 *
 * Combines path retrieval and formatting into one function. Retrieves all ancestor
 * paths for a node and returns them as a formatted, LLM-ready string showing
 * the containment hierarchy.
 *
 * @param db - SurrealDB instance
 * @param node - Node object or numeric node ID
 * @returns Formatted string showing all ancestor paths, ready for LLM context
 *
 * @example
 * const pathContext = await getNodePathsForContext(db, 4495);
 * // Returns formatted paths like:
 * // "Path 0:: tidyscripts -> ts_node -> introspection -> query.ts -> searchBySimilarity"
 */
export async function getNodePathsForContext(db: Surreal, node: any): Promise<string> {
  const n = typeof node === 'object' ? node : await getNodeFromId(db, node);
  if (!n) return 'Node not found';

  const paths = await getNodeAncestorPaths(db, n);

  // Prepend the queried node to each path
  for (let i = 0; i < paths.length; i++) {
    paths[i] = [n].concat(paths[i]);
  }

  return convertPathsForContext(paths);
}

/**
 * Format a single node for LLM context
 * Preserves docstring, name, file path, function signature, and distance
 *
 * @param result - Search result with node and distance
 * @param db - SurrealDB instance (optional, for including import paths)
 * @returns Formatted node string
 */
export async function convertNodeForContext(result: SimilarityResult, db?: Surreal): Promise<string> {
  const { dist, node: nodeData } = result;

  if (!nodeData) return 'No node data available';

  const { kind, name, docstring, nodeId } = nodeData;
  const filePath = (nodeData as any).filePath || (nodeData as any).path || 'Unknown';
  const signature = (nodeData as any).signature;
  const exports = (nodeData as any).exports;

  const output: string[] = [];

  // Add similarity score (convert distance to similarity)
  output.push(`Similarity: ${(1 - dist).toFixed(4)} (distance: ${dist.toFixed(4)})`);

  // Determine node type using NodeKind mapping
  let nodeType = 'Unknown';
  for (const [kindName, kindValue] of Object.entries(NodeKind)) {
    if (kindValue === kind) {
      nodeType = kindName;
      break;
    }
  }
  output.push(`Type: ${nodeType}`);

  // Add name
  output.push(`Name: ${name}`);

  // Add nodeId for reference
  if (nodeId !== undefined) {
    output.push(`NodeId: ${nodeId}`);
  }

  // Add file path
  output.push(`File: ${filePath}`);

  // Add docstring if present
  if (docstring) {
    output.push(`Description: ${docstring}`);
  } else if (signature?.comment?.summary) {
    // Extract docstring from signature comment if available
    const summaryText = signature.comment.summary
      .map((s: any) => s.text || '')
      .join('');
    if (summaryText) {
      output.push(`Description: ${summaryText}`);
    }
  }

  // For functions, add signature information
  if (kind === NodeKind.Function && signature?.parameters) {
    const params = signature.parameters
      .map((p: any) => {
        const paramName = p.name;
        const paramType = p.type?.name || 'unknown';
        return `${paramName}: ${paramType}`;
      })
      .join(', ');
    output.push(`Parameters: ${params || 'none'}`);

    // Add return type if available
    if (signature.type?.name) {
      output.push(`Returns: ${signature.type.name}`);
    }
  }

  // For modules, add exports
  if (kind === NodeKind.Module && exports && exports.length > 0) {
    output.push(`Exports: ${exports.join(', ')}`);
  }

  // Add import paths if db provided
  if (db && nodeId !== undefined) {
    const importInfo = await getNodePathsForContext(db, nodeId);
    output.push(`Imported by::\n${importInfo}`);
  }

  return output.join('\n');
}

/**
 * Format all search results for LLM context
 *
 * @param results - Array of similarity results
 * @param db - SurrealDB instance (optional, for including import paths)
 * @returns Formatted context string
 */
export async function convertSearchResultsForContext(
  results: SimilarityResult[],
  db?: Surreal
): Promise<string> {
  if (!results || results.length === 0) {
    return 'No search results found.';
  }

  const output: string[] = [`Found ${results.length} matching code elements:\n`];

  for (const [index, result] of results.entries()) {
    output.push(`\n--- Result ${index + 1} ---`);
    output.push(await convertNodeForContext(result, db));
  }

  return output.join('\n');
}

/**
 * Complete vector search with context generation
 * This combines all steps: embedding generation, search, node retrieval, and context formatting
 *
 * @param db - SurrealDB instance
 * @param query - Natural language query text
 * @param limit - Number of results to return (default: 5)
 * @returns Object with all search data including:
 *   - embedding: The generated query embedding vector
 *   - searchResults: Raw search results with distance scores and nodes
 *   - eids: Array of embedding cache record IDs
 *   - nodes: Array of matched node data
 *   - context: Formatted string ready for LLM consumption
 *
 * @example
 * const result = await getMatchingNodesWithVectorSearch(db, "authentication functions", 5);
 * console.log(result.context); // LLM-ready context string
 * console.log(result.nodes);   // Raw node data
 */
export async function getMatchingNodesWithVectorSearch(
  db: Surreal,
  query: string,
  limit: number = 5
): Promise<{
  embedding: number[];
  searchResults: SimilarityResult[];
  eids: string[];
  nodes: NodeResult[];
  context: string;
}> {
  logger.debug('Starting complete vector search with context', { query, limit });

  // Generate embedding
  const embedding = await generateEmbedding(query);
  logger.debug('Generated embedding');

  // Perform vector search
  const searchResults = await vectorSearch(db, embedding, { limit });
  logger.debug('Got search results');

  // Extract embedding IDs
  const eids = searchResults.map((o: any) => o.id);
  logger.debug('Got embedding IDs');

  // Get nodes from embedding IDs
  logger.debug('Getting nodes');
  const nodes = await getNodesFromEmbeddingIds(db, eids);

  // Match nodes with search results
  logger.debug('Matching nodes');
  for (const sr of searchResults) {
    const { contentHash } = sr;
    const [node] = nodes.filter((n: any) => n.embeddingHash === contentHash);
    if (node) {
      sr.node = node;
    }
  }

  // Generate context
  logger.debug('Preparing context');
  const context = await convertSearchResultsForContext(searchResults, db);

  return {
    embedding,
    searchResults,
    eids,
    nodes,
    context,
  };
}

/**
 * Get formatted LLM context for a natural language query
 *
 * This is a convenience function that performs a complete vector search
 * and returns only the formatted context string, ready to be passed to an LLM.
 * Use this when you only need the context and don't need the raw search results.
 *
 * @param db - SurrealDB instance
 * @param query - Natural language query text
 * @param limit - Number of results to include in context (default: 5)
 * @returns Formatted context string containing matching code elements with:
 *   - Similarity scores
 *   - Node types, names, and descriptions
 *   - File paths and locations
 *   - Function signatures and parameters
 *   - Module exports
 *   - Import/ancestor paths
 *
 * @example
 * const context = await getContextForQuery(db, "user authentication", 5);
 * // Pass to LLM: "Here's the relevant code:\n" + context
 */
export async function getContextForQuery(
  db: Surreal,
  query: string,
  limit: number = 5
): Promise<string> {
  logger.startTimer('get-context-for-query');
  logger.debug('Getting context for query', { query, limit });

  const result = await getMatchingNodesWithVectorSearch(db, query, limit);

  const duration = logger.endTimer('get-context-for-query');
  logger.info('Context generation completed', {
    query,
    resultsCount: result.nodes.length,
    durationMs: duration,
  });

  return result.context;
}
