/**
 * Introspection Package
 *
 * Utilities for understanding and working on the tidyscripts codebase through
 * a Retrieval Augmented Generation (RAG) system.
 *
 * PURPOSE
 * -------
 * This package builds a RAG system that enables AI agents to understand and work
 * with the tidyscripts codebase by:
 *
 * 1. Reading TypeDoc-generated JSON documentation (jdoc.json)
 * 2. Parsing codebase structure (functions, classes, modules, types)
 * 3. Generating vector embeddings for semantic code search
 * 4. Storing metadata in SurrealDB with graph relationships
 * 5. Providing hybrid query interface (semantic + graph traversal)
 * 6. Maintaining sync when code changes
 *
 * ARCHITECTURE
 * ------------
 * - **Hybrid Storage**: SurrealDB graph database + vector embeddings
 * - **Multi-level Indexing**: Module, Class, and Function level embeddings
 * - **Two-Hash Caching**: Separate hashes for node metadata vs embedding content
 * - **Content-Addressable Storage**: Deduplicated embeddings across codebase
 * - **Incremental Updates**: Only re-process changed files/functions
 * - **Batch Reconciliation**: Efficient sync using in-memory diffs
 *
 * IMPLEMENTATION ROADMAP
 * ----------------------
 * For complete implementation details, architecture diagrams, code examples,
 * and phase-by-phase instructions, see:
 *
 *     ./introspection_implementation_roadmap.md
 *
 * The roadmap includes:
 * - Detailed JSON structure documentation
 * - Complete code examples for each phase
 * - Two-hash strategy explained with scenarios
 * - Batch reconciliation algorithms
 * - Query interface patterns
 * - Agent integration workflows
 *
 * USAGE
 * -----
 * ```typescript
 * import { fullSync, incrementalSync } from '@tidyscripts/ts_node/introspection';
 *
 * // Run full sync
 * await fullSync();
 *
 * // Run incremental sync
 * await incrementalSync();
 * ```
 *
 * STATUS
 * ------
 * ✓ Part 1 Implementation Complete (Codebase → Database)
 */

// ============================================================================
// Public API - Synchronization
// ============================================================================

export { fullSync, incrementalSync, syncFile, syncAllFiles } from './sync';

// ============================================================================
// Public API - Database Operations
// ============================================================================

export {
  connect,
  disconnect,
  initializeSchema,
  isSchemaInitialized,
  getTableCounts,
  getCacheStats,
} from './database';

// ============================================================================
// Public API - Configuration
// ============================================================================

export {
  loadConfig,
  loadSurrealConfig,
  getJdocPath,
  validateConfig,
  getConfigSummary,
} from './config';

// ============================================================================
// Public API - Parsing
// ============================================================================

export {
  loadJdoc,
  extractAllNodes,
  groupNodesByFile,
  groupNodesByKind,
  getParsingStats,
} from './parser';

// ============================================================================
// Public API - Types
// ============================================================================

export * from './types';

// ============================================================================
// Public API - Constants
// ============================================================================

export { NodeKind, getKindName, shouldGenerateEmbedding } from './constants';

// ============================================================================
// Public API - Logging
// ============================================================================

export { logger, LogLevel, initializeLogger } from './logger';

// ============================================================================
// Legacy Function (for compatibility)
// ============================================================================

/**
 * Get codebase JSON documentation
 *
 * Legacy function name. Use fullSync() instead.
 *
 * @deprecated Use fullSync() instead
 */
export async function get_codebase_json_documentation(): Promise<void> {
  const { fullSync } = await import('./sync');
  await fullSync();
}


