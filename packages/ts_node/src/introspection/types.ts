/**
 * Type Definitions for Tidyscripts Introspection System
 *
 * Central type definitions for the RAG system that ingests TypeDoc JSON
 * documentation into SurrealDB with vector embeddings.
 */

// ============================================================================
// jdoc.json Node Types (from TypeDoc output)
// ============================================================================

/**
 * Source location information for a node
 */
export interface SourceLocation {
  fileName: string;
  line: number;
  character: number;
  url: string;
}

/**
 * Comment/docstring structure from TypeDoc
 */
export interface CommentNode {
  summary?: Array<{
    kind: string;
    text: string;
  }>;
  blockTags?: Array<{
    tag: string;
    content: Array<{
      kind: string;
      text: string;
    }>;
  }>;
}

/**
 * Type node structure from TypeDoc
 */
export interface TypeNode {
  type: string;
  name?: string;
  value?: any;
  typeArguments?: TypeNode[];
  elementType?: TypeNode;
  types?: TypeNode[];
  declaration?: JDocNode;
}

/**
 * Parameter node structure
 */
export interface ParameterNode {
  id: number;
  name: string;
  variant: string;
  kind: number;
  type?: TypeNode;
  flags?: Record<string, boolean>;
  comment?: CommentNode;
}

/**
 * Function/method signature node
 */
export interface SignatureNode {
  id: number;
  name: string;
  variant: string;
  kind: number;
  comment?: CommentNode;
  parameters?: ParameterNode[];
  type?: TypeNode;
  typeParameter?: any[];
}

/**
 * Main jdoc.json node structure from TypeDoc
 */
export interface JDocNode {
  id: number;
  name: string;
  kind: number;
  variant: string;
  flags?: Record<string, boolean>;
  children?: JDocNode[];
  sources?: SourceLocation[];
  signatures?: SignatureNode[];
  comment?: CommentNode;
  type?: TypeNode;
  parameters?: ParameterNode[];
  kindString?: string;
  groups?: any[];
}

// ============================================================================
// Parsed Node Types (intermediate representation)
// ============================================================================

/**
 * Parsed node after traversal and extraction from jdoc.json
 */
export interface ParsedNode {
  id: number;
  name: string;
  kind: number;
  filePath: string;
  docstring: string;
  signature?: SignatureNode;
  sources: SourceLocation[];
  children: ParsedNode[];
  type?: TypeNode;
}

// ============================================================================
// Database Node Types (stored in SurrealDB)
// ============================================================================

/**
 * Function node stored in SurrealDB
 * Includes two-hash strategy for optimal caching
 */
export interface FunctionNode {
  nodeId: number;
  name: string;
  filePath: string;
  kind: number;
  nodeHash: string;        // Hash of entire node (for change detection)
  embeddingHash: string;   // Hash of embedding text only (for API cost savings)
  docstring: string;
  signature: any;
  sources: SourceLocation[];
  lastUpdated: Date;
}

/**
 * Class node stored in SurrealDB
 */
export interface ClassNode {
  nodeId: number;
  name: string;
  filePath: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  sources: SourceLocation[];
  lastUpdated: Date;
}

/**
 * Module/namespace node stored in SurrealDB
 */
export interface ModuleNode {
  nodeId: number;
  name: string;
  path: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  exports: string[];
  lastUpdated: Date;
}

/**
 * Interface node stored in SurrealDB
 */
export interface InterfaceNode {
  nodeId: number;
  name: string;
  filePath: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  sources: SourceLocation[];
  lastUpdated: Date;
}

/**
 * Type alias node stored in SurrealDB
 */
export interface TypeAliasNode {
  nodeId: number;
  name: string;
  filePath: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  type: any;
  sources: SourceLocation[];
  lastUpdated: Date;
}

// ============================================================================
// Caching & Metadata Types
// ============================================================================

/**
 * Content-addressable embedding cache
 * Deduplicates embeddings across the codebase to save API costs
 */
export interface EmbeddingCache {
  contentHash: string;     // Primary key
  embedding: number[];     // The actual vector (1536 dimensions for text-embedding-3-small)
  usageCount: number;      // Reference count - tracks how many nodes use this embedding
}

/**
 * File metadata for incremental updates
 * Tracks which files have been processed and their content hash
 */
export interface FileMetadata {
  filePath: string;
  contentHash: string;     // SHA-256 of file contents
  lastProcessed: Date;
  nodeIds: number[];       // IDs of nodes extracted from this file
}

// ============================================================================
// Reconciliation Types
// ============================================================================

/**
 * Remote asset representation (minimal data fetched from DB for comparison)
 */
export interface RemoteAsset {
  nodeId: number;
  name: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
}

/**
 * Result of reconciliation between local and remote state
 */
export interface ReconcileResult {
  toCreate: ParsedNode[];
  toUpdate: ParsedNode[];
  toDelete: RemoteAsset[];
  unchanged: ParsedNode[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SurrealDB connection configuration
 */
export interface SurrealConfig {
  url: string;
  namespace: string;
  database: string;
  user: string;
  password: string;
}

/**
 * Introspection system configuration
 */
export interface IntrospectionConfig {
  jdocPath: string;
  surreal: SurrealConfig;
}

// ============================================================================
// Statistics & Monitoring Types
// ============================================================================

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  totalGenerated: number;
  totalCacheHits: number;
  hitRate: number;
}

/**
 * Sync operation statistics
 */
export interface SyncStats {
  filesProcessed: number;
  nodesCreated: number;
  nodesUpdated: number;
  nodesDeleted: number;
  nodesUnchanged: number;
  embeddingsGenerated: number;
  embeddingsCached: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}
