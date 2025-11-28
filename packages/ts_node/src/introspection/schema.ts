/**
 * SurrealDB Schema Definition for Tidyscripts Introspection System
 *
 * Defines all tables, fields, indexes, and relationships for storing
 * codebase metadata and embeddings.
 */

/**
 * Complete SurrealDB schema as SurrealQL
 *
 * This schema defines:
 * - Node tables (function_node, class_node, module_node, etc.)
 * - Embedding cache for content-addressable storage
 * - File metadata for incremental updates
 * - Relationship edges (CONTAINS, USES)
 * - Indexes for efficient querying
 */
export const SCHEMA = `
-- ============================================================================
-- Function Nodes
-- ============================================================================

DEFINE TABLE function_node SCHEMAFULL;

DEFINE FIELD nodeId ON function_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD name ON function_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD filePath ON function_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD kind ON function_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD nodeHash ON function_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD embeddingHash ON function_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD docstring ON function_node TYPE string;

DEFINE FIELD signature ON function_node TYPE option<object>;

DEFINE FIELD sources ON function_node TYPE array;

DEFINE FIELD lastUpdated ON function_node TYPE datetime
  DEFAULT time::now();

-- Indexes for function_node
DEFINE INDEX idx_function_nodeId ON function_node FIELDS nodeId UNIQUE;
DEFINE INDEX idx_function_kind ON function_node FIELDS kind;
DEFINE INDEX idx_function_name ON function_node FIELDS name;
DEFINE INDEX idx_function_file ON function_node FIELDS filePath;
DEFINE INDEX idx_function_nodeHash ON function_node FIELDS nodeHash;

-- ============================================================================
-- Class Nodes
-- ============================================================================

DEFINE TABLE class_node SCHEMAFULL;

DEFINE FIELD nodeId ON class_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD name ON class_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD filePath ON class_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD kind ON class_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD nodeHash ON class_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD embeddingHash ON class_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD docstring ON class_node TYPE string;

DEFINE FIELD sources ON class_node TYPE array;

DEFINE FIELD lastUpdated ON class_node TYPE datetime
  DEFAULT time::now();

-- Indexes for class_node
DEFINE INDEX idx_class_nodeId ON class_node FIELDS nodeId UNIQUE;
DEFINE INDEX idx_class_name ON class_node FIELDS name;
DEFINE INDEX idx_class_file ON class_node FIELDS filePath;
DEFINE INDEX idx_class_nodeHash ON class_node FIELDS nodeHash;

-- ============================================================================
-- Module Nodes
-- ============================================================================

DEFINE TABLE module_node SCHEMAFULL;

DEFINE FIELD nodeId ON module_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD name ON module_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD path ON module_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD kind ON module_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD nodeHash ON module_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD embeddingHash ON module_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD docstring ON module_node TYPE string;

DEFINE FIELD exports ON module_node TYPE array
  DEFAULT [];

DEFINE FIELD lastUpdated ON module_node TYPE datetime
  DEFAULT time::now();

-- Indexes for module_node
DEFINE INDEX idx_module_nodeId ON module_node FIELDS nodeId UNIQUE;
DEFINE INDEX idx_module_path ON module_node FIELDS path;
DEFINE INDEX idx_module_name ON module_node FIELDS name;
DEFINE INDEX idx_module_nodeHash ON module_node FIELDS nodeHash;

-- ============================================================================
-- Interface Nodes
-- ============================================================================

DEFINE TABLE interface_node SCHEMAFULL;

DEFINE FIELD nodeId ON interface_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD name ON interface_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD filePath ON interface_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD kind ON interface_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD nodeHash ON interface_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD embeddingHash ON interface_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD docstring ON interface_node TYPE string;

DEFINE FIELD sources ON interface_node TYPE array;

DEFINE FIELD lastUpdated ON interface_node TYPE datetime
  DEFAULT time::now();

-- Indexes for interface_node
DEFINE INDEX idx_interface_nodeId ON interface_node FIELDS nodeId UNIQUE;
DEFINE INDEX idx_interface_name ON interface_node FIELDS name;
DEFINE INDEX idx_interface_file ON interface_node FIELDS filePath;
DEFINE INDEX idx_interface_nodeHash ON interface_node FIELDS nodeHash;

-- ============================================================================
-- Type Alias Nodes
-- ============================================================================

DEFINE TABLE type_alias_node SCHEMAFULL;

DEFINE FIELD nodeId ON type_alias_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD name ON type_alias_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD filePath ON type_alias_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD kind ON type_alias_node TYPE number
  ASSERT $value != NONE;

DEFINE FIELD nodeHash ON type_alias_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD embeddingHash ON type_alias_node TYPE string
  ASSERT $value != NONE;

DEFINE FIELD docstring ON type_alias_node TYPE string;

DEFINE FIELD type ON type_alias_node TYPE option<object>;

DEFINE FIELD sources ON type_alias_node TYPE array;

DEFINE FIELD lastUpdated ON type_alias_node TYPE datetime
  DEFAULT time::now();

-- Indexes for type_alias_node
DEFINE INDEX idx_type_alias_nodeId ON type_alias_node FIELDS nodeId UNIQUE;
DEFINE INDEX idx_type_alias_name ON type_alias_node FIELDS name;
DEFINE INDEX idx_type_alias_file ON type_alias_node FIELDS filePath;
DEFINE INDEX idx_type_alias_nodeHash ON type_alias_node FIELDS nodeHash;

-- ============================================================================
-- Content-Addressable Embedding Cache
-- ============================================================================

DEFINE TABLE embedding_cache SCHEMAFULL;

DEFINE FIELD contentHash ON embedding_cache TYPE string
  ASSERT $value != NONE;

DEFINE FIELD embedding ON embedding_cache TYPE array<float>
  ASSERT $value != NONE;

DEFINE FIELD usageCount ON embedding_cache TYPE number
  DEFAULT 0;

DEFINE FIELD createdAt ON embedding_cache TYPE datetime
  DEFAULT time::now();

-- Indexes for embedding_cache
DEFINE INDEX idx ON embedding_cache FIELDS embedding HNSW DIMENSION 1536 ;

-- ============================================================================
-- File Metadata (for incremental updates)
-- ============================================================================

DEFINE TABLE file_metadata SCHEMAFULL;

DEFINE FIELD filePath ON file_metadata TYPE string
  ASSERT $value != NONE;

DEFINE FIELD contentHash ON file_metadata TYPE string
  ASSERT $value != NONE;

DEFINE FIELD lastProcessed ON file_metadata TYPE datetime
  DEFAULT time::now();

DEFINE FIELD nodeIds ON file_metadata TYPE array
  DEFAULT [];

-- Indexes for file_metadata
DEFINE INDEX idx_file_path ON file_metadata FIELDS filePath UNIQUE;

-- ============================================================================
-- Relationship Tables
-- ============================================================================

-- CONTAINS relationship: Module -> Function/Class/Interface
DEFINE TABLE CONTAINS TYPE RELATION SCHEMAFULL;

-- USES relationship: Function/Class -> Type
DEFINE TABLE USES TYPE RELATION SCHEMAFULL;

-- IMPORTS relationship: Module -> Module (for future use)
DEFINE TABLE IMPORTS TYPE RELATION SCHEMAFULL;


`;

/**
 * Schema version for tracking migrations
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Get schema initialization status query
 *
 * Returns a query to check if schema is already initialized.
 */
export const CHECK_SCHEMA_QUERY = `
  SELECT * FROM function_node LIMIT 1
`;

/**
 * Get table counts query
 *
 * @deprecated This query has a SQL syntax error (missing FROM clause).
 * Use getTableCounts() function in database.ts instead, which runs separate queries.
 *
 * Returns a query to get counts of all tables.
 */
export const TABLE_COUNTS_QUERY = `
  SELECT
    (SELECT count() FROM function_node)[0].count AS functions,
    (SELECT count() FROM class_node)[0].count AS classes,
    (SELECT count() FROM module_node)[0].count AS modules,
    (SELECT count() FROM interface_node)[0].count AS interfaces,
    (SELECT count() FROM type_alias_node)[0].count AS type_aliases,
    (SELECT count() FROM embedding_cache)[0].count AS embeddings,
    (SELECT count() FROM file_metadata)[0].count AS files
`;

/**
 * Get cache statistics query
 *
 * Note: We use array operations to aggregate stats properly
 */
export const CACHE_STATS_QUERY = `
  SELECT
    count() AS total_entries,
    math::sum((SELECT VALUE usageCount FROM embedding_cache)) AS total_usage,
    math::max((SELECT VALUE usageCount FROM embedding_cache)) AS max_usage,
    math::min((SELECT VALUE usageCount FROM embedding_cache)) AS min_usage,
    math::mean((SELECT VALUE usageCount FROM embedding_cache)) AS avg_usage
  FROM embedding_cache
  GROUP ALL
`;
