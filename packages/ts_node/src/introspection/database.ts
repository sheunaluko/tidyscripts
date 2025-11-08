/**
 * SurrealDB Database Operations for Tidyscripts Introspection System
 *
 * Handles connection, schema initialization, and all CRUD operations.
 */

import Surreal from 'surrealdb';
import { loadSurrealConfig } from './config';
import { SCHEMA, CACHE_STATS_QUERY } from './schema';
import { TABLE_NAMES, NodeKind, getKindName } from './constants';
import { logger } from './logger';
import type {
  FunctionNode,
  ClassNode,
  ModuleNode,
  InterfaceNode,
  TypeAliasNode,
  FileMetadata,
  RemoteAsset,
} from './types';

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Connect to SurrealDB
 *
 * @returns Connected Surreal instance
 * @throws Error if connection fails
 */
export async function connect(): Promise<Surreal> {
  const config = loadSurrealConfig();
  const db = new Surreal();

  try {
    await db.connect(config.url);

    // Sign in if credentials provided
    if (config.user && config.password) {
      await db.signin({
        username: config.user,
        password: config.password,
      });
    }

    // Select namespace and database
    await db.use({
      namespace: config.namespace,
      database: config.database,
    });

    logger.info('Connected to SurrealDB', {
      url: config.url,
      namespace: config.namespace,
      database: config.database,
    });

    return db;
  } catch (error) {
    logger.error('Failed to connect to SurrealDB', error as Error, {
      url: config.url,
      namespace: config.namespace,
      database: config.database,
    });
    throw new Error(`Failed to connect to SurrealDB: ${error}`);
  }
}

/**
 * Disconnect from SurrealDB
 *
 * @param db - SurrealDB instance
 */
export async function disconnect(db: Surreal): Promise<void> {
  try {
    await db.close();
    logger.info('Disconnected from SurrealDB');
  } catch (error) {
    logger.error('Error disconnecting from SurrealDB', error as Error);
  }
}

// ============================================================================
// Schema Initialization
// ============================================================================

/**
 * Initialize database schema
 *
 * Executes all schema definitions from schema.ts.
 *
 * @param db - SurrealDB instance
 * @throws Error if schema initialization fails
 */
export async function initializeSchema(db: Surreal): Promise<void> {
  logger.startTimer('schema-init');
  try {
    logger.info('Initializing database schema...');

    // Execute schema definition
    await db.query(SCHEMA);

    const duration = logger.endTimer('schema-init');
    logger.success('Schema initialized successfully');
    logger.logTiming('Schema initialization', duration);
  } catch (error) {
    const errorMessage = (error as Error).message || String(error);

    // If schema already exists, treat as success
    if (errorMessage.includes('already exists')) {
      const duration = logger.endTimer('schema-init');
      logger.info('Schema already exists (OK)');
      logger.logTiming('Schema check', duration);
      return;
    }

    // For other errors, log and throw
    logger.error('Failed to initialize schema', error as Error);
    throw new Error(`Failed to initialize schema: ${error}`);
  }
}

/**
 * Check if schema is initialized
 *
 * @param db - SurrealDB instance
 * @returns true if schema is initialized
 */
export async function isSchemaInitialized(db: Surreal): Promise<boolean> {
  try {
    await db.query('SELECT * FROM function_node LIMIT 1');
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Function Node Operations
// ============================================================================

/**
 * Insert a function node
 *
 * @param db - SurrealDB instance
 * @param node - Function node to insert
 */
export async function insertFunctionNode(db: Surreal, node: FunctionNode): Promise<void> {
  await db.query(
    `LET $tb = $table;
     LET $id = $nodeId;
     CREATE type::thing($tb, $id) CONTENT {
      nodeId: $nodeId,
      name: $name,
      filePath: $filePath,
      kind: $kind,
      nodeHash: $nodeHash,
      embeddingHash: $embeddingHash,
      docstring: $docstring,
      signature: $signature,
      sources: $sources,
      lastUpdated: time::now()
    }`,
    {
      table: TABLE_NAMES.FUNCTION_NODE,
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      kind: node.kind,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      signature: node.signature,
      sources: node.sources,
    }
  );
}

/**
 * Update a function node
 *
 * @param db - SurrealDB instance
 * @param node - Function node with updated data
 */
export async function updateFunctionNode(db: Surreal, node: FunctionNode): Promise<void> {
  await db.query(
    `UPDATE ${TABLE_NAMES.FUNCTION_NODE} SET
      name = $name,
      filePath = $filePath,
      nodeHash = $nodeHash,
      embeddingHash = $embeddingHash,
      docstring = $docstring,
      signature = $signature,
      sources = $sources,
      lastUpdated = time::now()
    WHERE nodeId = $nodeId`,
    {
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      signature: node.signature,
      sources: node.sources,
    }
  );
}

/**
 * Delete a function node
 *
 * @param db - SurrealDB instance
 * @param nodeId - Node ID to delete
 */
export async function deleteFunctionNode(db: Surreal, nodeId: number): Promise<void> {
  await db.query(`DELETE ${TABLE_NAMES.FUNCTION_NODE} WHERE nodeId = $nodeId`, { nodeId });
}

/**
 * Get function nodes by file path
 *
 * @param db - SurrealDB instance
 * @param filePath - File path to query
 * @returns Array of function nodes
 */
export async function getFunctionNodesByFile(
  db: Surreal,
  filePath: string
): Promise<FunctionNode[]> {
  const result = await db.query<[FunctionNode[]]>(
    `SELECT * FROM ${TABLE_NAMES.FUNCTION_NODE} WHERE filePath = $filePath`,
    { filePath }
  );

  return result?.[0] || [];
}

// ============================================================================
// Class Node Operations
// ============================================================================

/**
 * Insert a class node
 *
 * @param db - SurrealDB instance
 * @param node - Class node to insert
 */
export async function insertClassNode(db: Surreal, node: ClassNode): Promise<void> {
  await db.query(
    `LET $tb = $table;
     LET $id = $nodeId;
     CREATE type::thing($tb, $id) CONTENT {
      nodeId: $nodeId,
      name: $name,
      filePath: $filePath,
      kind: $kind,
      nodeHash: $nodeHash,
      embeddingHash: $embeddingHash,
      docstring: $docstring,
      sources: $sources,
      lastUpdated: time::now()
    }`,
    {
      table: TABLE_NAMES.CLASS_NODE,
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      kind: node.kind,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      sources: node.sources,
    }
  );
}

/**
 * Update a class node
 *
 * @param db - SurrealDB instance
 * @param node - Class node with updated data
 */
export async function updateClassNode(db: Surreal, node: ClassNode): Promise<void> {
  await db.query(
    `UPDATE ${TABLE_NAMES.CLASS_NODE} SET
      name = $name,
      filePath = $filePath,
      nodeHash = $nodeHash,
      embeddingHash = $embeddingHash,
      docstring = $docstring,
      sources = $sources,
      lastUpdated = time::now()
    WHERE nodeId = $nodeId`,
    {
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      sources: node.sources,
    }
  );
}

/**
 * Delete a class node
 *
 * @param db - SurrealDB instance
 * @param nodeId - Node ID to delete
 */
export async function deleteClassNode(db: Surreal, nodeId: number): Promise<void> {
  await db.query(`DELETE ${TABLE_NAMES.CLASS_NODE} WHERE nodeId = $nodeId`, { nodeId });
}

// ============================================================================
// Module Node Operations
// ============================================================================

/**
 * Insert a module node
 *
 * @param db - SurrealDB instance
 * @param node - Module node to insert
 */
export async function insertModuleNode(db: Surreal, node: ModuleNode): Promise<void> {
  await db.query(
    `LET $tb = $table;
     LET $id = $nodeId;
     CREATE type::thing($tb, $id) CONTENT {
      nodeId: $nodeId,
      name: $name,
      path: $path,
      kind: $kind,
      nodeHash: $nodeHash,
      embeddingHash: $embeddingHash,
      docstring: $docstring,
      exports: $exports,
      lastUpdated: time::now()
    }`,
    {
      table: TABLE_NAMES.MODULE_NODE,
      nodeId: node.nodeId,
      name: node.name,
      path: node.path,
      kind: node.kind,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      exports: node.exports,
    }
  );
}

/**
 * Update a module node
 *
 * @param db - SurrealDB instance
 * @param node - Module node with updated data
 */
export async function updateModuleNode(db: Surreal, node: ModuleNode): Promise<void> {
  await db.query(
    `UPDATE ${TABLE_NAMES.MODULE_NODE} SET
      name = $name,
      path = $path,
      nodeHash = $nodeHash,
      embeddingHash = $embeddingHash,
      docstring = $docstring,
      exports = $exports,
      lastUpdated = time::now()
    WHERE nodeId = $nodeId`,
    {
      nodeId: node.nodeId,
      name: node.name,
      path: node.path,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      exports: node.exports,
    }
  );
}

/**
 * Delete a module node
 *
 * @param db - SurrealDB instance
 * @param nodeId - Node ID to delete
 */
export async function deleteModuleNode(db: Surreal, nodeId: number): Promise<void> {
  await db.query(`DELETE ${TABLE_NAMES.MODULE_NODE} WHERE nodeId = $nodeId`, { nodeId });
}

// ============================================================================
// Interface Node Operations
// ============================================================================

/**
 * Insert an interface node
 *
 * @param db - SurrealDB instance
 * @param node - Interface node to insert
 */
export async function insertInterfaceNode(db: Surreal, node: InterfaceNode): Promise<void> {
  await db.query(
    `LET $tb = $table;
     LET $id = $nodeId;
     CREATE type::thing($tb, $id) CONTENT {
      nodeId: $nodeId,
      name: $name,
      filePath: $filePath,
      kind: $kind,
      nodeHash: $nodeHash,
      embeddingHash: $embeddingHash,
      docstring: $docstring,
      sources: $sources,
      lastUpdated: time::now()
    }`,
    {
      table: TABLE_NAMES.INTERFACE_NODE,
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      kind: node.kind,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      sources: node.sources,
    }
  );
}

/**
 * Update an interface node
 *
 * @param db - SurrealDB instance
 * @param node - Interface node with updated data
 */
export async function updateInterfaceNode(db: Surreal, node: InterfaceNode): Promise<void> {
  await db.query(
    `UPDATE ${TABLE_NAMES.INTERFACE_NODE} SET
      name = $name,
      filePath = $filePath,
      nodeHash = $nodeHash,
      embeddingHash = $embeddingHash,
      docstring = $docstring,
      sources = $sources,
      lastUpdated = time::now()
    WHERE nodeId = $nodeId`,
    {
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      sources: node.sources,
    }
  );
}

/**
 * Delete an interface node
 *
 * @param db - SurrealDB instance
 * @param nodeId - Node ID to delete
 */
export async function deleteInterfaceNode(db: Surreal, nodeId: number): Promise<void> {
  await db.query(`DELETE ${TABLE_NAMES.INTERFACE_NODE} WHERE nodeId = $nodeId`, { nodeId });
}

// ============================================================================
// Type Alias Node Operations
// ============================================================================

/**
 * Insert a type alias node
 *
 * @param db - SurrealDB instance
 * @param node - Type alias node to insert
 */
export async function insertTypeAliasNode(db: Surreal, node: TypeAliasNode): Promise<void> {
  await db.query(
    `LET $tb = $table;
     LET $id = $nodeId;
     CREATE type::thing($tb, $id) CONTENT {
      nodeId: $nodeId,
      name: $name,
      filePath: $filePath,
      kind: $kind,
      nodeHash: $nodeHash,
      embeddingHash: $embeddingHash,
      docstring: $docstring,
      type: $type,
      sources: $sources,
      lastUpdated: time::now()
    }`,
    {
      table: TABLE_NAMES.TYPE_ALIAS_NODE,
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      kind: node.kind,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      type: node.type,
      sources: node.sources,
    }
  );
}

/**
 * Update a type alias node
 *
 * @param db - SurrealDB instance
 * @param node - Type alias node with updated data
 */
export async function updateTypeAliasNode(db: Surreal, node: TypeAliasNode): Promise<void> {
  await db.query(
    `UPDATE ${TABLE_NAMES.TYPE_ALIAS_NODE} SET
      name = $name,
      filePath = $filePath,
      nodeHash = $nodeHash,
      embeddingHash = $embeddingHash,
      docstring = $docstring,
      type = $type,
      sources = $sources,
      lastUpdated = time::now()
    WHERE nodeId = $nodeId`,
    {
      nodeId: node.nodeId,
      name: node.name,
      filePath: node.filePath,
      nodeHash: node.nodeHash,
      embeddingHash: node.embeddingHash,
      docstring: node.docstring,
      type: node.type,
      sources: node.sources,
    }
  );
}

/**
 * Delete a type alias node
 *
 * @param db - SurrealDB instance
 * @param nodeId - Node ID to delete
 */
export async function deleteTypeAliasNode(db: Surreal, nodeId: number): Promise<void> {
  await db.query(`DELETE ${TABLE_NAMES.TYPE_ALIAS_NODE} WHERE nodeId = $nodeId`, { nodeId });
}

// ============================================================================
// File Metadata Operations
// ============================================================================

/**
 * Get file metadata
 *
 * @param db - SurrealDB instance
 * @param filePath - File path to query
 * @returns File metadata or null if not found
 */
export async function getFileMetadata(
  db: Surreal,
  filePath: string
): Promise<FileMetadata | null> {
  const result = await db.query<[FileMetadata[]]>(
    `SELECT * FROM ${TABLE_NAMES.FILE_METADATA} WHERE filePath = $filePath`,
    { filePath }
  );

  return result?.[0]?.[0] || null;
}

/**
 * Update file metadata
 *
 * @param db - SurrealDB instance
 * @param metadata - File metadata to upsert
 */
export async function updateFileMetadata(db: Surreal, metadata: FileMetadata): Promise<void> {
  await db.query(
    `UPSERT ${TABLE_NAMES.FILE_METADATA} CONTENT {
      filePath: $filePath,
      contentHash: $contentHash,
      lastProcessed: time::now(),
      nodeIds: $nodeIds
    }`,
    {
      filePath: metadata.filePath,
      contentHash: metadata.contentHash,
      nodeIds: metadata.nodeIds,
    }
  );
}

// ============================================================================
// Remote Asset Queries (for reconciliation)
// ============================================================================

/**
 * Get all remote assets for a file
 *
 * Fetches minimal data from all node tables for reconciliation.
 *
 * @param db - SurrealDB instance
 * @param filePath - File path to query
 * @returns Array of remote assets
 */
export async function getRemoteAssets(db: Surreal, filePath: string): Promise<RemoteAsset[]> {
  const assets: RemoteAsset[] = [];

  // Query all node tables
  const tables = [
    TABLE_NAMES.FUNCTION_NODE,
    TABLE_NAMES.CLASS_NODE,
    TABLE_NAMES.MODULE_NODE,
    TABLE_NAMES.INTERFACE_NODE,
    TABLE_NAMES.TYPE_ALIAS_NODE,
  ];

  for (const table of tables) {
    const result = await db.query<[RemoteAsset[]]>(
      `SELECT nodeId, name, kind, nodeHash, embeddingHash FROM ${table} WHERE filePath = $filePath`,
      { filePath }
    );

    if (result?.[0]) {
      assets.push(...result[0]);
    }
  }

  return assets;
}

// ============================================================================
// Relationship Operations
// ============================================================================

/**
 * Get table name for a node kind
 *
 * Maps NodeKind enum to SurrealDB table name.
 *
 * @param kind - NodeKind value
 * @returns Table name
 * @throws Error if kind is unknown
 */
export function getTableNameForKind(kind: NodeKind): string {
  switch (kind) {
    case NodeKind.Function:
      return TABLE_NAMES.FUNCTION_NODE;
    case NodeKind.Class:
      return TABLE_NAMES.CLASS_NODE;
    case NodeKind.Module:
      return TABLE_NAMES.MODULE_NODE;
    case NodeKind.Interface:
      return TABLE_NAMES.INTERFACE_NODE;
    case NodeKind.TypeAlias:
      return TABLE_NAMES.TYPE_ALIAS_NODE;
    case NodeKind.Method:
      return TABLE_NAMES.FUNCTION_NODE; // Methods stored as functions
    default:
      throw new Error(`Unknown kind: ${kind} (${getKindName(kind)})`);
  }
}

/**
 * Create CONTAINS edge between parent and child nodes
 *
 * Links a container (module/class) to its contained nodes (functions/methods/classes).
 *
 * @param db - SurrealDB instance
 * @param parentTable - Table name of parent ('module_node', 'class_node', etc)
 * @param parentId - nodeId of parent
 * @param childTable - Table name of child ('function_node', 'class_node', etc)
 * @param childId - nodeId of child
 */
export async function createContainsEdge(
  db: Surreal,
  parentTable: string,
  parentId: number,
  childTable: string,
  childId: number
): Promise<void> {
  await db.query(`
    RELATE ${parentTable}:${parentId}->CONTAINS->${childTable}:${childId}
  `);
}

/**
 * Delete outgoing CONTAINS edges for a node
 *
 * Removes all edges where this node is the source (in).
 * Preserves incoming edges where this node is the target (out).
 *
 * Use when updating a module/class that may have changed children.
 *
 * @param db - SurrealDB instance
 * @param table - Table name
 * @param nodeId - Node ID
 */
export async function deleteOutgoingEdges(
  db: Surreal,
  table: string,
  nodeId: number
): Promise<void> {
  await db.query(`DELETE CONTAINS WHERE in = ${table}:${nodeId}`);
}

/**
 * Collect CONTAINS edges from a node to its IMMEDIATE children only (non-recursive, no DB calls)
 *
 * Creates edges only for direct parent->child relationships, not the entire subtree.
 * This prevents duplicates when called on every node in a tree.
 *
 * @param parentNode - Parent node with children array populated
 * @param edges - Accumulated edges array (for recursion)
 * @returns Array of edge definitions
 */
function collectContainsEdges(
  parentNode: any, // ParsedNode type, but importing causes circular dependency
  edges: Array<{ parentTable: string; parentId: number; childTable: string; childId: number }> = []
): Array<{ parentTable: string; parentId: number; childTable: string; childId: number }> {
  if (!parentNode.children || parentNode.children.length === 0) {
    return edges;
  }

  const parentTable = getTableNameForKind(parentNode.kind);

  for (const child of parentNode.children) {
    const childTable = getTableNameForKind(child.kind);

    // Add edge to immediate child only
    edges.push({
      parentTable,
      parentId: parentNode.id,
      childTable,
      childId: child.id,
    });

    // NO recursion - only create edges to immediate children
    // Each node will be processed separately, creating its own edges
  }

  return edges;
}

/**
 * Create multiple CONTAINS edges in a single batch query
 *
 * More efficient than creating edges one-by-one - uses single DB call.
 *
 * @param db - SurrealDB instance
 * @param edges - Array of edge definitions
 */
async function createContainsEdgesBatch(
  db: Surreal,
  edges: Array<{ parentTable: string; parentId: number; childTable: string; childId: number }>
): Promise<void> {
  if (edges.length === 0) return;

  // Build batch RELATE query
  const queries = edges
    .map(edge => `RELATE ${edge.parentTable}:${edge.parentId}->CONTAINS->${edge.childTable}:${edge.childId}`)
    .join('; ');

  await db.query(queries);
}

/**
 * Create CONTAINS edges for IMMEDIATE children of a parent node (batched)
 *
 * Creates edges only to direct children, not the entire subtree.
 * Call this on every node with children to build the full graph without duplicates.
 *
 * @param db - SurrealDB instance
 * @param parentNode - Parent node with children array populated
 * @returns Number of edges created
 */
export async function createContainsEdgesForNode(
  db: Surreal,
  parentNode: any // ParsedNode type, but importing causes circular dependency
): Promise<number> {
  // Step 1: Collect edges to immediate children only (no DB calls)
  const edges = collectContainsEdges(parentNode, []);

  // Step 2: Batch create (single DB call)
  await createContainsEdgesBatch(db, edges);

  return edges.length;
}

/**
 * Create CONTAINS relationships
 *
 * Links modules to their contained functions/classes/interfaces.
 *
 * @param db - SurrealDB instance
 */
export async function createRelationships(db: Surreal): Promise<void> {
  logger.info('Creating relationships...');

  // This is a placeholder - relationships will be created during sync
  // based on actual parent-child relationships in the jdoc.json tree

  logger.success('Relationships created');
}

// ============================================================================
// Statistics & Validation
// ============================================================================

/**
 * Get table counts
 *
 * @param db - SurrealDB instance
 * @returns Object with counts for each table
 */
export async function getTableCounts(db: Surreal): Promise<{
  functions: number;
  classes: number;
  modules: number;
  interfaces: number;
  type_aliases: number;
  embeddings: number;
  files: number;
}> {
  // Run separate count queries for each table
  // Use COUNT() with GROUP ALL to get total count, not per-row count
  const [functionsResult] = await db.query('SELECT COUNT() as count FROM function_node GROUP ALL');
  const [classesResult] = await db.query('SELECT COUNT() as count FROM class_node GROUP ALL');
  const [modulesResult] = await db.query('SELECT COUNT() as count FROM module_node GROUP ALL');
  const [interfacesResult] = await db.query('SELECT COUNT() as count FROM interface_node GROUP ALL');
  const [typeAliasesResult] = await db.query('SELECT COUNT() as count FROM type_alias_node GROUP ALL');
  const [embeddingsResult] = await db.query('SELECT COUNT() as count FROM embedding_cache GROUP ALL');
  const [filesResult] = await db.query('SELECT COUNT() as count FROM file_metadata GROUP ALL');

  return {
    functions: functionsResult?.[0]?.count || 0,
    classes: classesResult?.[0]?.count || 0,
    modules: modulesResult?.[0]?.count || 0,
    interfaces: interfacesResult?.[0]?.count || 0,
    type_aliases: typeAliasesResult?.[0]?.count || 0,
    embeddings: embeddingsResult?.[0]?.count || 0,
    files: filesResult?.[0]?.count || 0,
  };
}

/**
 * Get cache statistics
 *
 * @param db - SurrealDB instance
 * @returns Cache statistics
 */
export async function getCacheStats(db: Surreal): Promise<{
  total_entries: number;
  total_usage: number;
  max_usage: number;
  min_usage: number;
  avg_usage: number;
}> {
  const result = await db.query(CACHE_STATS_QUERY);

  return result?.[0]?.[0] || {
    total_entries: 0,
    total_usage: 0,
    max_usage: 0,
    min_usage: 0,
    avg_usage: 0,
  };
}
