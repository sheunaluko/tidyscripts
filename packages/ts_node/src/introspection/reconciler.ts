/**
 * Batch Reconciliation for Tidyscripts Introspection System
 *
 * Compares local parsed nodes with remote database state to determine
 * what needs to be created, updated, or deleted.
 *
 * Implements the two-hash strategy to optimize embedding generation:
 * - If nodeHash changed but embeddingHash unchanged → update metadata only
 * - If embeddingHash changed → update metadata AND regenerate embedding
 */

import type Surreal from 'surrealdb';
import { NodeKind } from './constants';
import { hashNode, hashEmbeddingText } from './hasher';
import { buildEmbeddingText, getOrGenerateEmbedding } from './embeddings';
import { logger } from './logger';
import {
  insertFunctionNode,
  insertClassNode,
  insertModuleNode,
  insertInterfaceNode,
  insertTypeAliasNode,
  updateFunctionNode,
  updateClassNode,
  updateModuleNode,
  updateInterfaceNode,
  updateTypeAliasNode,
  deleteFunctionNode,
  deleteClassNode,
  deleteModuleNode,
  deleteInterfaceNode,
  deleteTypeAliasNode,
} from './database';
import type { ParsedNode, RemoteAsset, ReconcileResult } from './types';

// ============================================================================
// Reconciliation Logic
// ============================================================================

/**
 * Reconcile local nodes with remote assets
 *
 * Performs in-memory diff to categorize nodes as:
 * - toCreate: New nodes not in database
 * - toUpdate: Nodes with changed hashes
 * - toDelete: Nodes in database but not in local
 * - unchanged: Nodes with identical hashes
 *
 * @param localNodes - Parsed nodes from jdoc.json
 * @param remoteAssets - Minimal node data from database
 * @returns Reconciliation result with categorized nodes
 */
export function reconcile(
  localNodes: ParsedNode[],
  remoteAssets: RemoteAsset[]
): ReconcileResult {
  // Create lookup maps for efficient comparison
  const remoteMap = new Map(remoteAssets.map(asset => [asset.nodeId, asset]));
  const localMap = new Map(localNodes.map(node => [node.id, node]));

  const toCreate: ParsedNode[] = [];
  const toUpdate: ParsedNode[] = [];
  const unchanged: ParsedNode[] = [];

  // Check each local node
  for (const local of localNodes) {
    const remote = remoteMap.get(local.id);

    if (!remote) {
      // Node doesn't exist in database - create it
      toCreate.push(local);
    } else {
      // Node exists - check if it changed
      const localHash = hashNode(local);

      if (localHash !== remote.nodeHash) {
        // Node changed - update it
        toUpdate.push(local);
      } else {
        // Node unchanged - skip it
        unchanged.push(local);
      }

      // Mark as processed
      remoteMap.delete(local.id);
    }
  }

  // Remaining remote nodes were deleted locally
  const toDelete = Array.from(remoteMap.values());

  return {
    toCreate,
    toUpdate,
    toDelete,
    unchanged,
  };
}

// ============================================================================
// Node Creation
// ============================================================================

/**
 * Process nodes to create
 *
 * For each new node:
 * 1. Generate nodeHash
 * 2. Build embedding text
 * 3. Generate embeddingHash
 * 4. Get or generate embedding (with caching)
 * 5. Insert into appropriate table
 *
 * @param nodes - Nodes to create
 * @param db - SurrealDB instance
 */
export async function processCreates(nodes: ParsedNode[], db: Surreal): Promise<void> {
  if (nodes.length === 0) return;

  logger.startTimer('process-creates');
  logger.info(`Creating ${nodes.length} new nodes...`, { count: nodes.length });

  for (const node of nodes) {
    try {
      // Generate hashes
      const nodeHash = hashNode(node);
      const embeddingText = buildEmbeddingText(node);
      const embeddingHash = hashEmbeddingText(embeddingText);

      // Get or generate embedding with content-addressable caching
      const embedding = await getOrGenerateEmbedding(embeddingHash, embeddingText, db);

      // Create node data based on kind
      const nodeData = {
        nodeId: node.id,
        name: node.name,
        filePath: node.filePath,
        kind: node.kind,
        nodeHash,
        embeddingHash,
        docstring: node.docstring,
        sources: node.sources,
        lastUpdated: new Date(),
      };

      // Insert into appropriate table
      switch (node.kind) {
        case NodeKind.Function:
        case NodeKind.Method:
          await insertFunctionNode(db, {
            ...nodeData,
            signature: node.signature,
          });
          break;

        case NodeKind.Class:
          await insertClassNode(db, nodeData);
          break;

        case NodeKind.Module:
          await insertModuleNode(db, {
            ...nodeData,
            path: node.filePath,
            exports: node.children.map(c => c.name),
          });
          break;

        case NodeKind.Interface:
          await insertInterfaceNode(db, nodeData);
          break;

        case NodeKind.TypeAlias:
          await insertTypeAliasNode(db, {
            ...nodeData,
            type: node.type,
          });
          break;

        default:
          logger.warn(`Unknown node kind for node ${node.name}, skipping`, {
            nodeKind: node.kind,
            nodeName: node.name,
            nodeId: node.id,
          });
      }

      logger.success(`Created: ${node.name}`, {
        nodeName: node.name,
        nodeId: node.id,
        filePath: node.filePath,
        kind: node.kind,
      });
    } catch (error) {
      logger.logNodeError('create', node.name, node.id, node.filePath, error as Error);
      throw error;
    }
  }

  const duration = logger.endTimer('process-creates');
  logger.logTiming(`Created ${nodes.length} nodes`, duration);
}

// ============================================================================
// Node Updates
// ============================================================================

/**
 * Process nodes to update
 *
 * Uses two-hash strategy:
 * - Compare embeddingHash to determine if embedding needs regeneration
 * - If embeddingHash unchanged: update metadata only (no API call!)
 * - If embeddingHash changed: update metadata AND regenerate embedding
 *
 * @param nodes - Nodes to update
 * @param remoteAssets - Remote assets for comparison
 * @param db - SurrealDB instance
 */
export async function processUpdates(
  nodes: ParsedNode[],
  remoteAssets: RemoteAsset[],
  db: Surreal
): Promise<void> {
  if (nodes.length === 0) return;

  logger.startTimer('process-updates');
  logger.info(`Updating ${nodes.length} changed nodes...`, { count: nodes.length });

  // Create lookup map for remote assets
  const remoteMap = new Map(remoteAssets.map(asset => [asset.nodeId, asset]));

  for (const node of nodes) {
    try {
      const remote = remoteMap.get(node.id);
      if (!remote) {
        logger.warn('Remote asset not found for node, skipping update', {
          nodeId: node.id,
          nodeName: node.name,
        });
        continue;
      }

      // Generate new hashes
      const newNodeHash = hashNode(node);
      const embeddingText = buildEmbeddingText(node);
      const newEmbeddingHash = hashEmbeddingText(embeddingText);

      let embedding: number[];

      // Two-hash strategy: check if embedding needs regeneration
      if (newEmbeddingHash === remote.embeddingHash) {
        // Embedding content unchanged - no need to regenerate!
        logger.debug('Metadata updated, embedding reused', {
          nodeName: node.name,
          nodeId: node.id,
          embeddingHash: newEmbeddingHash.slice(0, 8) + '...',
        });
        // We don't actually need the embedding value for metadata-only updates
        embedding = []; // Placeholder
      } else {
        // Embedding content changed - need to regenerate
        logger.debug('Metadata AND embedding updated', {
          nodeName: node.name,
          nodeId: node.id,
          oldEmbeddingHash: remote.embeddingHash.slice(0, 8) + '...',
          newEmbeddingHash: newEmbeddingHash.slice(0, 8) + '...',
        });
        embedding = await getOrGenerateEmbedding(newEmbeddingHash, embeddingText, db);
      }

      // Create updated node data
      const nodeData = {
        nodeId: node.id,
        name: node.name,
        filePath: node.filePath,
        kind: node.kind,
        nodeHash: newNodeHash,
        embeddingHash: newEmbeddingHash,
        docstring: node.docstring,
        sources: node.sources,
        lastUpdated: new Date(),
      };

      // Update appropriate table
      switch (node.kind) {
        case NodeKind.Function:
        case NodeKind.Method:
          await updateFunctionNode(db, {
            ...nodeData,
            signature: node.signature,
          });
          break;

        case NodeKind.Class:
          await updateClassNode(db, nodeData);
          break;

        case NodeKind.Module:
          await updateModuleNode(db, {
            ...nodeData,
            path: node.filePath,
            exports: node.children.map(c => c.name),
          });
          break;

        case NodeKind.Interface:
          await updateInterfaceNode(db, nodeData);
          break;

        case NodeKind.TypeAlias:
          await updateTypeAliasNode(db, {
            ...nodeData,
            type: node.type,
          });
          break;

        default:
          logger.warn(`Unknown node kind for node ${node.name}, skipping`, {
            nodeKind: node.kind,
            nodeName: node.name,
            nodeId: node.id,
          });
      }

      logger.success(`Updated: ${node.name}`, {
        nodeName: node.name,
        nodeId: node.id,
        filePath: node.filePath,
        kind: node.kind,
      });
    } catch (error) {
      logger.logNodeError('update', node.name, node.id, node.filePath, error as Error);
      throw error;
    }
  }

  const duration = logger.endTimer('process-updates');
  logger.logTiming(`Updated ${nodes.length} nodes`, duration);
}

// ============================================================================
// Node Deletion
// ============================================================================

/**
 * Process nodes to delete
 *
 * Deletes nodes that exist in database but not in local jdoc.json.
 *
 * @param assets - Remote assets to delete
 * @param db - SurrealDB instance
 */
export async function processDeletes(assets: RemoteAsset[], db: Surreal): Promise<void> {
  if (assets.length === 0) return;

  logger.startTimer('process-deletes');
  logger.info(`Deleting ${assets.length} removed nodes...`, { count: assets.length });

  for (const asset of assets) {
    try {
      // Delete from appropriate table based on kind
      switch (asset.kind) {
        case NodeKind.Function:
        case NodeKind.Method:
          await deleteFunctionNode(db, asset.nodeId);
          break;

        case NodeKind.Class:
          await deleteClassNode(db, asset.nodeId);
          break;

        case NodeKind.Module:
          await deleteModuleNode(db, asset.nodeId);
          break;

        case NodeKind.Interface:
          await deleteInterfaceNode(db, asset.nodeId);
          break;

        case NodeKind.TypeAlias:
          await deleteTypeAliasNode(db, asset.nodeId);
          break;

        default:
          logger.warn(`Unknown node kind for asset ${asset.name}, skipping`, {
            nodeKind: asset.kind,
            nodeName: asset.name,
            nodeId: asset.nodeId,
          });
      }

      logger.success(`Deleted: ${asset.name}`, {
        nodeName: asset.name,
        nodeId: asset.nodeId,
        kind: asset.kind,
      });
    } catch (error) {
      logger.error('Failed to delete node', error as Error, {
        operation: 'delete',
        nodeName: asset.name,
        nodeId: asset.nodeId,
      });
      throw error;
    }
  }

  const duration = logger.endTimer('process-deletes');
  logger.logTiming(`Deleted ${assets.length} nodes`, duration);
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get reconciliation statistics
 *
 * @param result - Reconciliation result
 * @returns Statistics object
 */
export function getReconcileStats(result: ReconcileResult): {
  total: number;
  toCreate: number;
  toUpdate: number;
  toDelete: number;
  unchanged: number;
  changeRate: string;
} {
  const total =
    result.toCreate.length +
    result.toUpdate.length +
    result.toDelete.length +
    result.unchanged.length;

  const changed = result.toCreate.length + result.toUpdate.length + result.toDelete.length;
  const changeRate = total > 0 ? ((changed / total) * 100).toFixed(2) + '%' : '0%';

  return {
    total,
    toCreate: result.toCreate.length,
    toUpdate: result.toUpdate.length,
    toDelete: result.toDelete.length,
    unchanged: result.unchanged.length,
    changeRate,
  };
}
