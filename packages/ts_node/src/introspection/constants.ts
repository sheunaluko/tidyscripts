/**
 * Constants and Enums for Tidyscripts Introspection System
 *
 * Central constants to avoid magic numbers throughout the codebase.
 * These values correspond to TypeDoc's node kind enumeration.
 */

// ============================================================================
// TypeDoc Node Kind Enumeration
// ============================================================================

/**
 * NodeKind enum for jdoc.json node types
 *
 * These values come from TypeDoc's ReflectionKind enum and are used to
 * identify what type of code element a node represents.
 *
 * @example
 * ```typescript
 * // Instead of magic numbers
 * if (node.kind === 64) { ... }  // ❌ Bad
 *
 * // Use named constants
 * if (node.kind === NodeKind.Function) { ... }  // ✅ Good
 * ```
 */
export const NodeKind = {
  Project: 1,
  Module: 4,
  Namespace: 4,           // Same as Module in TypeDoc
  Enum: 8,
  EnumMember: 16,
  Variable: 32,
  Function: 64,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  CallSignature: 4096,
  IndexSignature: 8192,
  ConstructorSignature: 16384,
  Parameter: 32768,
  TypeLiteral: 65536,
  TypeParameter: 131072,
  Accessor: 262144,
  GetSignature: 524288,
  SetSignature: 1048576,
  TypeAlias: 2097152,
  Reference: 16777216,
} as const;

export type NodeKind = typeof NodeKind[keyof typeof NodeKind];

/**
 * Helper to check if a kind is a container type (can have children)
 */
export function isContainerKind(kind: number): boolean {
  return [
    NodeKind.Project,
    NodeKind.Module,
    NodeKind.Class,
    NodeKind.Interface,
    NodeKind.Enum,
    NodeKind.TypeLiteral,
  ].includes(kind);
}

/**
 * Helper to check if a kind should have an embedding generated
 */
export function shouldGenerateEmbedding(kind: number): boolean {
  return [
    NodeKind.Function,
    NodeKind.Class,
    NodeKind.Interface,
    NodeKind.Module,
    NodeKind.Method,
    NodeKind.TypeAlias,
  ].includes(kind);
}

/**
 * Get human-readable name for a NodeKind
 */
export function getKindName(kind: number): string {
  const entry = Object.entries(NodeKind).find(([_, value]) => value === kind);
  return entry ? entry[0] : `Unknown(${kind})`;
}

// ============================================================================
// Node Variant Types
// ============================================================================

/**
 * TypeDoc node variant types
 */
export const NodeVariant = {
  Project: 'project',
  Declaration: 'declaration',
  Signature: 'signature',
  Param: 'param',
  Reference: 'reference',
} as const;

export type NodeVariant = typeof NodeVariant[keyof typeof NodeVariant];

// ============================================================================
// Default Configuration Values
// ============================================================================

/**
 * Default path to TypeDoc-generated JSON documentation
 */
export const DEFAULT_JDOC_PATH = '/home/oluwa/dev/tidyscripts/apps/docs/jdoc.json';

/**
 * Default SurrealDB connection URL
 */
export const DEFAULT_SURREAL_URL = 'http://localhost:8000';

/**
 * Default SurrealDB namespace
 */
export const DEFAULT_SURREAL_NAMESPACE = 'tidyscripts';

/**
 * Default SurrealDB database name
 */
export const DEFAULT_SURREAL_DATABASE = 'introspection';

// ============================================================================
// Embedding Configuration
// ============================================================================

/**
 * OpenAI embedding model to use
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Expected embedding dimensionality for text-embedding-3-small
 */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Maximum batch size for embedding generation
 */
export const MAX_EMBEDDING_BATCH_SIZE = 100;

// ============================================================================
// Environment Variable Names
// ============================================================================

/**
 * Environment variable prefix for SurrealDB configuration
 */
export const ENV_PREFIX = 'TS_INTROSPECTION_SURREAL_';

/**
 * Environment variable names
 */
export const ENV_VARS = {
  SURREAL_URL: `${ENV_PREFIX}URL`,
  SURREAL_NAMESPACE: `${ENV_PREFIX}NAMESPACE`,
  SURREAL_DATABASE: `${ENV_PREFIX}DATABASE`,
  SURREAL_USER: `${ENV_PREFIX}USER`,
  SURREAL_PASSWORD: `${ENV_PREFIX}PASSWORD`,
  JDOC_PATH: 'TS_INTROSPECTION_JDOC_PATH',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
} as const;

// ============================================================================
// Database Table Names
// ============================================================================

/**
 * SurrealDB table names
 */
export const TABLE_NAMES = {
  FUNCTION_NODE: 'function_node',
  CLASS_NODE: 'class_node',
  MODULE_NODE: 'module_node',
  INTERFACE_NODE: 'interface_node',
  TYPE_ALIAS_NODE: 'type_alias_node',
  EMBEDDING_CACHE: 'embedding_cache',
  FILE_METADATA: 'file_metadata',
  CONTAINS: 'CONTAINS',
  USES: 'USES',
} as const;

// ============================================================================
// Hash Algorithm Configuration
// ============================================================================

/**
 * Hash algorithm to use for content hashing
 */
export const HASH_ALGORITHM = 'sha256';

/**
 * Hash output encoding
 */
export const HASH_ENCODING = 'hex';

// ============================================================================
// Sync & Reconciliation Configuration
// ============================================================================

/**
 * Batch size for database operations
 */
export const DB_BATCH_SIZE = 50;

/**
 * Maximum concurrent embedding API calls
 */
export const MAX_CONCURRENT_EMBEDDINGS = 5;

/**
 * Retry configuration for API calls
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
} as const;
