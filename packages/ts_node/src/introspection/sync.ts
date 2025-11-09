/**
 * Synchronization Orchestration for Tidyscripts Introspection System
 *
 * Main entry point for syncing jdoc.json to SurrealDB.
 * Orchestrates file-level sync with incremental updates.
 */

import type Surreal from 'surrealdb';
import { getJdocPath, getProjectRoot } from './config';
import { loadJdoc, extractAllNodes, groupNodesByFile } from './parser';
import { hashFile } from './hasher';
import { logger } from './logger';
import {
  connect,
  disconnect,
  initializeSchema,
  isSchemaInitialized,
  getFileMetadata,
  updateFileMetadata,
  getRemoteAssets,
  getTableCounts,
  getCacheStats,
  createContainsEdgesForNode,
  deleteOutgoingEdges,
  getTableNameForKind,
  createImportsEdgesBatch,
} from './database';
import { NodeKind } from './constants';
import {
  reconcile,
  processCreates,
  processUpdates,
  processDeletes,
  getReconcileStats,
} from './reconciler';
import type { JDocNode, SyncStats } from './types';
import { parseImportsFromFiles } from './import-parser';
import * as path from 'path';

// ============================================================================
// File-Level Synchronization
// ============================================================================

/**
 * Sync a single file
 *
 * Process:
 * 1. Check if file hash changed (if unchanged, skip)
 * 2. Fetch remote assets for this file
 * 3. Get local nodes from jdoc.json
 * 4. Reconcile (in-memory diff)
 * 5. Process creates, updates, deletes
 * 6. Update file metadata
 *
 * @param filePath - Path to file to sync
 * @param db - SurrealDB instance
 * @param jdoc - Parsed jdoc.json root
 * @returns Stats for this file sync
 */
export async function syncFile(
  filePath: string,
  db: Surreal,
  jdoc: JDocNode
): Promise<{
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
}> {
  logger.startTimer(`sync-file-${filePath}`);
  logger.info(`Syncing file: ${filePath}`, { filePath });

  // Step 1: File-level change detection
  const localFileHash = await hashFile(filePath);
  const remoteFile = await getFileMetadata(db, filePath);

  if (remoteFile && localFileHash === remoteFile.contentHash) {
    logger.info('File unchanged - skipping', {
      filePath,
      contentHash: localFileHash.slice(0, 8) + '...',
    });
    return { created: 0, updated: 0, deleted: 0, unchanged: 0 };
  }

  logger.info('File changed - reconciling...', {
    filePath,
    localHash: localFileHash.slice(0, 8) + '...',
    remoteHash: remoteFile?.contentHash.slice(0, 8) + '...',
  });

  // Step 2: Fetch remote assets for this file
  const remoteAssets = await getRemoteAssets(db, filePath);
  logger.debug('Remote assets loaded', {
    filePath,
    count: remoteAssets.length,
  });

  // Step 3: Get local nodes for this file
  const allNodes = extractAllNodes(jdoc);
  const localNodes = allNodes.filter(n => n.filePath === filePath);
  logger.debug('Local nodes extracted', {
    filePath,
    count: localNodes.length,
  });

  // Step 4: In-memory reconciliation
  const diff = reconcile(localNodes, remoteAssets);
  const stats = getReconcileStats(diff);

  logger.info('Reconciliation complete', {
    filePath,
    create: stats.toCreate,
    update: stats.toUpdate,
    delete: stats.toDelete,
    unchanged: stats.unchanged,
    changeRate: stats.changeRate,
  });

  // Step 5: Process changes
  await processCreates(diff.toCreate, db);
  await processUpdates(diff.toUpdate, remoteAssets, db);
  await processDeletes(diff.toDelete, db);

  // Step 5.5: Create CONTAINS edges for nodes with children
  logger.startTimer('create-edges');
  let totalEdges = 0;

  // For updated nodes: delete old outgoing edges first
  for (const node of diff.toUpdate) {
    if (node.children && node.children.length > 0) {
      const tableName = getTableNameForKind(node.kind as NodeKind);
      await deleteOutgoingEdges(db, tableName, node.id);
    }
  }

  // For all nodes with children (created + updated): create edges
  const nodesWithChildren = [...diff.toCreate, ...diff.toUpdate].filter(
    n => n.children && n.children.length > 0
  );

  for (const node of nodesWithChildren) {
    const edgeCount = await createContainsEdgesForNode(db, node);
    totalEdges += edgeCount;
  }

  const edgeDuration = logger.endTimer('create-edges');
  if (totalEdges > 0) {
    logger.info('CONTAINS edges created', {
      filePath,
      edgeCount: totalEdges,
    });
    logger.logTiming(`Edge creation: ${filePath}`, edgeDuration);
  }

  // Step 6: Update file metadata
  await updateFileMetadata(db, {
    filePath,
    contentHash: localFileHash,
    lastProcessed: new Date(),
    nodeIds: localNodes.map(n => n.id),
  });

  const duration = logger.endTimer(`sync-file-${filePath}`);
  logger.success('File sync complete', {
    filePath,
    created: stats.toCreate,
    updated: stats.toUpdate,
    deleted: stats.toDelete,
    unchanged: stats.unchanged,
  });
  logger.logTiming(`File sync: ${filePath}`, duration);

  return {
    created: stats.toCreate,
    updated: stats.toUpdate,
    deleted: stats.toDelete,
    unchanged: stats.unchanged,
  };
}

// ============================================================================
// Full Synchronization
// ============================================================================

/**
 * Sync all files from jdoc.json (optionally filtered by path pattern)
 *
 * Process:
 * 1. Load jdoc.json
 * 2. Extract and group nodes by file
 * 3. Filter files by path pattern (if provided)
 * 4. Sync each file individually
 * 5. Report final statistics
 *
 * @param db - SurrealDB instance
 * @param pathFilter - Optional path filter (e.g., "packages/ts_web/src/apis")
 * @returns Sync statistics
 */
export async function syncAllFiles(db: Surreal, pathFilter?: string): Promise<SyncStats> {
  logger.startTimer('sync-all-files');
  const startTime = new Date();
  const stats: SyncStats = {
    filesProcessed: 0,
    nodesCreated: 0,
    nodesUpdated: 0,
    nodesDeleted: 0,
    nodesUnchanged: 0,
    embeddingsGenerated: 0,
    embeddingsCached: 0,
    startTime,
  };

  logger.info('Starting full sync of all files');

  // Load jdoc.json
  const jdocPath = getJdocPath();
  logger.info('Loading jdoc.json', { path: jdocPath });
  const jdoc = await loadJdoc(jdocPath);

  // Extract and group nodes
  const allNodes = extractAllNodes(jdoc);
  const nodesByFile = groupNodesByFile(allNodes);

  // Apply path filter if provided
  let filesToProcess = nodesByFile;
  if (pathFilter) {
    const filtered = new Map<string, any[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }
    filesToProcess = filtered;
    logger.info('Path filter applied', {
      filter: pathFilter,
      totalFiles: nodesByFile.size,
      filteredFiles: filesToProcess.size,
    });
  }

  logger.info('Files to process', { count: filesToProcess.size });

  // Sync each file
  let fileIndex = 0;
  for (const [filePath, nodes] of filesToProcess) {
    fileIndex++;
    logger.logProgress(fileIndex, filesToProcess.size, `Processing: ${filePath}`);
    logger.debug('Nodes in file', {
      filePath,
      nodeCount: nodes.length,
    });

    try {
      const fileStats = await syncFile(filePath, db, jdoc);

      stats.filesProcessed++;
      stats.nodesCreated += fileStats.created;
      stats.nodesUpdated += fileStats.updated;
      stats.nodesDeleted += fileStats.deleted;
      stats.nodesUnchanged += fileStats.unchanged;
    } catch (error) {
      logger.logFileError('sync', filePath, error as Error);
      throw error;
    }
  }

  // Step 3.5: Parse imports and create IMPORTS edges
  logger.info('Creating IMPORTS edges...');
  logger.startTimer('create-imports-edges');

  try {
    const relativeFiles = Array.from(filesToProcess.keys());
    const projectRoot = getProjectRoot();

    // Convert relative paths to absolute paths
    const sourceFiles = relativeFiles.map(f => path.join(projectRoot, f));

    logger.debug('Parsing imports from source files', {
      fileCount: sourceFiles.length,
      projectRoot,
      sampleFile: sourceFiles[0],
    });

    // Parse imports from all processed files
    const fileImports = await parseImportsFromFiles(sourceFiles, projectRoot);

    // Build edge list from parsed imports
    // Convert absolute paths back to relative paths (to match module_node.path)
    const importEdges: Array<{ fromPath: string; toPath: string }> = [];
    for (const file of fileImports) {
      for (const imp of file.imports) {
        const relativeFrom = path.relative(projectRoot, imp.sourcePath);
        const relativeTo = path.relative(projectRoot, imp.targetPath);
        importEdges.push({
          fromPath: relativeFrom,
          toPath: relativeTo,
        });
      }
    }

    // Batch create all IMPORTS edges (with duplicate checking)
    if (importEdges.length > 0) {
      const { stats, newImports } = await createImportsEdgesBatch(db, importEdges);
      const importsDuration = logger.endTimer('create-imports-edges');

      logger.info('IMPORTS edges from TypeScript analysis - Summary', {
        attempted: stats.attempted,
        created: stats.created,
        alreadyExisted: stats.alreadyExisted,
        failed: stats.failed,
        filesWithImports: fileImports.filter(f => f.imports.length > 0).length,
      });

      // Log ALL new imports that were created (full list, not sample)
      if (newImports.length > 0) {
        logger.info('New IMPORTS discovered from TypeScript - FULL LIST', {
          count: newImports.length,
          imports: newImports,
        });
      }

      logger.logTiming('IMPORTS edge creation', importsDuration);
    } else {
      logger.endTimer('create-imports-edges');
      logger.info('No IMPORTS edges to create');
    }
  } catch (error) {
    logger.error('Failed to create IMPORTS edges', error as Error);
    // Don't throw - IMPORTS edges are supplementary, continue with sync
  }

  // Finalize stats
  stats.endTime = new Date();
  stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

  const totalDuration = logger.endTimer('sync-all-files');
  logger.info('All files synced', {
    filesProcessed: stats.filesProcessed,
    nodesCreated: stats.nodesCreated,
    nodesUpdated: stats.nodesUpdated,
    nodesDeleted: stats.nodesDeleted,
    nodesUnchanged: stats.nodesUnchanged,
  });
  logger.logTiming('Full sync of all files', totalDuration);

  return stats;
}

// ============================================================================
// Sync Analysis (Dry Run)
// ============================================================================

/**
 * Analyze what will be synced without actually syncing
 *
 * Returns expected counts for validation purposes.
 *
 * @param pathFilter - Optional path filter (e.g., "packages/ts_web/src/apis")
 * @returns Expected counts for nodes, files, and edges
 */
export async function analyzeSync(pathFilter?: string): Promise<{
  files: number;
  nodes: {
    total: number;
    functions: number;
    classes: number;
    modules: number;
    interfaces: number;
    type_aliases: number;
    methods: number;
  };
  edges: {
    contains: number;
  };
  fileBreakdown: Array<{
    filePath: string;
    nodeCount: number;
    edgeCount: number;
  }>;
}> {
  // Load jdoc.json
  const jdocPath = getJdocPath();
  const jdoc = await loadJdoc(jdocPath);

  // Extract and group nodes
  const allNodes = extractAllNodes(jdoc);
  const nodesByFile = groupNodesByFile(allNodes);

  // Apply path filter if provided
  let filesToProcess = nodesByFile;
  if (pathFilter) {
    const filtered = new Map<string, any[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }
    filesToProcess = filtered;
  }

  // Count nodes by type and track per-file statistics
  let functions = 0;
  let classes = 0;
  let modules = 0;
  let interfaces = 0;
  let type_aliases = 0;
  let methods = 0;

  const fileBreakdown: Array<{
    filePath: string;
    nodeCount: number;
    edgeCount: number;
  }> = [];

  let totalContainsEdges = 0;

  for (const [filePath, nodes] of filesToProcess) {
    let fileEdgeCount = 0;

    // Count nodes and edges for this file
    for (const node of nodes) {
      // Count node type
      switch (node.kind) {
        case NodeKind.Function:
          functions++;
          break;
        case NodeKind.Class:
          classes++;
          break;
        case NodeKind.Module:
          modules++;
          break;
        case NodeKind.Interface:
          interfaces++;
          break;
        case NodeKind.TypeAlias:
          type_aliases++;
          break;
        case NodeKind.Method:
          methods++;
          break;
      }

      // Count edges from this node to its immediate children
      if (node.children && node.children.length > 0) {
        fileEdgeCount += node.children.length;
      }
    }

    totalContainsEdges += fileEdgeCount;

    fileBreakdown.push({
      filePath,
      nodeCount: nodes.length,
      edgeCount: fileEdgeCount,
    });
  }

  const totalNodes = functions + classes + modules + interfaces + type_aliases + methods;

  return {
    files: filesToProcess.size,
    nodes: {
      total: totalNodes,
      functions,
      classes,
      modules,
      interfaces,
      type_aliases,
      methods,
    },
    edges: {
      contains: totalContainsEdges,
    },
    fileBreakdown,
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Full sync: jdoc.json → SurrealDB
 *
 * This is the main entry point for synchronization.
 *
 * Process:
 * 1. Connect to SurrealDB
 * 2. Initialize schema (if needed)
 * 3. Sync all files (optionally filtered by path)
 * 4. Display statistics
 * 5. Disconnect
 *
 * @param pathFilter - Optional path filter (e.g., "packages/ts_web/src/apis")
 * @throws Error if sync fails
 */
export async function fullSync(pathFilter?: string): Promise<void> {
  logger.startTimer('full-sync');
  logger.info('╔══════════════════════════════════════════════════════════╗');
  if (pathFilter) {
    logger.info('║   Tidyscripts Introspection System - Filtered Sync      ║');
  } else {
    logger.info('║   Tidyscripts Introspection System - Full Sync          ║');
  }
  logger.info('╚══════════════════════════════════════════════════════════╝');

  if (pathFilter) {
    logger.info('Path filter:', { filter: pathFilter });
  }

  let db: Surreal | null = null;

  try {
    // Step 1: Connect to database
    logger.info('Step 1: Connecting to SurrealDB...');
    db = await connect();

    // Step 2: Initialize schema if needed
    logger.info('Step 2: Checking schema...');
    const schemaExists = await isSchemaInitialized(db);

    if (!schemaExists) {
      logger.info('Schema not found - initializing...');
      await initializeSchema(db);
    } else {
      logger.info('Schema already initialized');
    }

    // Step 3: Sync all files (with optional filter)
    logger.info('Step 3: Syncing files...');
    const syncStats = await syncAllFiles(db, pathFilter);

    // Step 4: Display final statistics
    const totalDuration = logger.endTimer('full-sync');

    logger.info('╔══════════════════════════════════════════════════════════╗');
    logger.info('║   Sync Complete - Statistics                            ║');
    logger.info('╚══════════════════════════════════════════════════════════╝');

    logger.info('Files:', { processed: syncStats.filesProcessed });

    const totalNodes = syncStats.nodesCreated + syncStats.nodesUpdated + syncStats.nodesDeleted + syncStats.nodesUnchanged;
    logger.info('Nodes:', {
      created: syncStats.nodesCreated,
      updated: syncStats.nodesUpdated,
      deleted: syncStats.nodesDeleted,
      unchanged: syncStats.nodesUnchanged,
      total: totalNodes,
    });

    logger.logTiming('Full sync', totalDuration);

    // Get database statistics
    const tableCounts = await getTableCounts(db);
    logger.info('Database Statistics:', {
      functions: tableCounts.functions,
      classes: tableCounts.classes,
      modules: tableCounts.modules,
      interfaces: tableCounts.interfaces,
      type_aliases: tableCounts.type_aliases,
      files: tableCounts.files,
    });

    const cacheStats = await getCacheStats(db);
    const hitRate = cacheStats.total_entries > 0
      ? ((cacheStats.total_usage - cacheStats.total_entries) / cacheStats.total_usage * 100).toFixed(2)
      : '0.00';
    logger.info('Embedding Cache:', {
      entries: cacheStats.total_entries,
      totalUsage: cacheStats.total_usage,
      maxUsage: cacheStats.max_usage,
      hitRate: `${hitRate}%`,
    });

    logger.success('Full sync completed successfully!');
  } catch (error) {
    logger.error('Sync failed', error as Error);
    throw error;
  } finally {
    // Step 5: Disconnect
    if (db) {
      await disconnect(db);
    }
  }
}

// ============================================================================
// Incremental Sync
// ============================================================================

/**
 * Incremental sync: only sync changed files
 *
 * More efficient than full sync when only a few files have changed.
 *
 * @param filePaths - Optional array of specific files to sync
 */
export async function incrementalSync(filePaths?: string[]): Promise<void> {
  logger.startTimer('incremental-sync');
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║   Tidyscripts Introspection System - Incremental Sync   ║');
  logger.info('╚══════════════════════════════════════════════════════════╝');

  let db: Surreal | null = null;

  try {
    // Connect
    db = await connect();

    // Load jdoc.json
    const jdocPath = getJdocPath();
    const jdoc = await loadJdoc(jdocPath);

    // If specific files provided, sync only those
    if (filePaths && filePaths.length > 0) {
      logger.info(`Syncing specific files`, { count: filePaths.length });

      for (const filePath of filePaths) {
        await syncFile(filePath, db, jdoc);
      }
    } else {
      // Otherwise, detect changed files
      logger.info('Detecting changed files...');

      const allNodes = extractAllNodes(jdoc);
      const nodesByFile = groupNodesByFile(allNodes);

      const changedFiles: string[] = [];

      for (const [filePath] of nodesByFile) {
        const localHash = await hashFile(filePath);
        const remoteFile = await getFileMetadata(db, filePath);

        if (!remoteFile || localHash !== remoteFile.contentHash) {
          changedFiles.push(filePath);
        }
      }

      logger.info(`Changed files detected`, { count: changedFiles.length });

      for (const filePath of changedFiles) {
        await syncFile(filePath, db, jdoc);
      }
    }

    const duration = logger.endTimer('incremental-sync');
    logger.success('Incremental sync completed successfully!');
    logger.logTiming('Incremental sync', duration);
  } catch (error) {
    logger.error('Incremental sync failed', error as Error);
    throw error;
  } finally {
    if (db) {
      await disconnect(db);
    }
  }
}
