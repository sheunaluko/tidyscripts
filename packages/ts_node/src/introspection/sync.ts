/**
 * Synchronization Orchestration for Tidyscripts Introspection System
 *
 * Main entry point for syncing jdoc.json to SurrealDB.
 * Orchestrates file-level sync with incremental updates.
 */

import type Surreal from 'surrealdb';
import { getJdocPath } from './config';
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
} from './database';
import {
  reconcile,
  processCreates,
  processUpdates,
  processDeletes,
  getReconcileStats,
} from './reconciler';
import type { JDocNode, SyncStats } from './types';

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
 * Sync all files from jdoc.json
 *
 * Process:
 * 1. Load jdoc.json
 * 2. Extract and group nodes by file
 * 3. Sync each file individually
 * 4. Report final statistics
 *
 * @param db - SurrealDB instance
 * @returns Sync statistics
 */
export async function syncAllFiles(db: Surreal): Promise<SyncStats> {
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

  logger.info('Files to process', { count: nodesByFile.size });

  // Sync each file
  let fileIndex = 0;
  for (const [filePath, nodes] of nodesByFile) {
    fileIndex++;
    logger.logProgress(fileIndex, nodesByFile.size, `Processing: ${filePath}`);
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
 * 3. Sync all files
 * 4. Display statistics
 * 5. Disconnect
 *
 * @throws Error if sync fails
 */
export async function fullSync(): Promise<void> {
  logger.startTimer('full-sync');
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║   Tidyscripts Introspection System - Full Sync          ║');
  logger.info('╚══════════════════════════════════════════════════════════╝');

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

    // Step 3: Sync all files
    logger.info('Step 3: Syncing files...');
    const syncStats = await syncAllFiles(db);

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
