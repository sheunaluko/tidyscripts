# Tidyscripts Introspection System

A Retrieval Augmented Generation (RAG) system for the tidyscripts codebase that enables AI agents to understand and work with the codebase through semantic search and graph relationships.

## ✅ Implementation Status

**Part 1 Complete**: Codebase → Database (All 11 modules implemented)

## Architecture

### Hybrid Storage Strategy
- **SurrealDB Graph Database**: Complete structural metadata with relationships
- **Vector Embeddings**: Semantic search capabilities via OpenAI
- **Content-Addressable Caching**: Deduplicated embeddings to minimize API costs
- **Two-Hash Strategy**: Separate hashes for node metadata vs embedding content

### Key Features
- **Multi-level Indexing**: Module, Class, and Function level embeddings
- **Incremental Updates**: Only re-process changed files/functions
- **Batch Reconciliation**: Efficient sync using in-memory diffs
- **On-Demand OpenAI Init**: Prevents errors when API key is missing

## Modules Implemented

### Phase 0: Foundation
1. **types.ts** - All TypeScript interfaces
2. **constants.ts** - NodeKind enums and constants
3. **config.ts** - Environment variable loading

### Phase 1-2: Parsing & Text Preparation
4. **parser.ts** - JSON parsing and traversal
5. **hasher.ts** - Two-hash strategy implementation
6. **embeddings.ts** - OpenAI integration (on-demand init)

### Phase 3-6: Database & Sync
7. **schema.ts** - SurrealDB schema definition
8. **database.ts** - Connection and CRUD operations
9. **reconciler.ts** - Batch reconciliation logic
10. **sync.ts** - Main synchronization orchestration
11. **index.ts** - Public API and exports

### Utilities
12. **validate.ts** - Database validation script
13. **logger.ts** - Structured logging utility

## Configuration

### Environment Variables

All SurrealDB config uses prefix: `TS_INTROSPECTION_SURREAL_`

```bash
# SurrealDB Configuration
TS_INTROSPECTION_SURREAL_URL=http://localhost:8000
TS_INTROSPECTION_SURREAL_NAMESPACE=tidyscripts
TS_INTROSPECTION_SURREAL_DATABASE=introspection
TS_INTROSPECTION_SURREAL_USER=root
TS_INTROSPECTION_SURREAL_PASSWORD=root

# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here

# Optional: Custom jdoc.json path
TS_INTROSPECTION_JDOC_PATH=/path/to/jdoc.json
```

### Default Values
- **SurrealDB URL**: `http://localhost:8000`
- **Namespace**: `tidyscripts`
- **Database**: `introspection`
- **jdoc.json Path**: `/home/oluwa/dev/tidyscripts/apps/docs/jdoc.json`

## Logging & Debugging

All modules use a structured logging utility that provides timestamped logs with context, making debugging a breeze. You can review a complete log trace that combines logs from all modules that ran prior to any error.

### Log Levels

Control verbosity with the `TS_INTROSPECTION_LOG_LEVEL` environment variable:

```bash
# Available levels: DEBUG, INFO, WARN, ERROR, SILENT
export TS_INTROSPECTION_LOG_LEVEL=DEBUG  # Most verbose
export TS_INTROSPECTION_LOG_LEVEL=INFO   # Default (standard operations)
export TS_INTROSPECTION_LOG_LEVEL=WARN   # Warnings and errors only
export TS_INTROSPECTION_LOG_LEVEL=ERROR  # Errors only
export TS_INTROSPECTION_LOG_LEVEL=SILENT # No output
```

### Log Features

- **Timestamps**: Every log entry includes ISO timestamp
- **Structured Context**: Rich context objects with relevant data
- **Performance Tracking**: Automatic timing for operations
- **Error Context**: Full stack traces with operation context
- **Progress Tracking**: Visual progress indicators for batch operations

### Example Log Output

```
[2025-11-06T12:00:00.000Z] [INFO] Connecting to SurrealDB...
[2025-11-06T12:00:00.123Z] [INFO] Connected to SurrealDB {
  url: "http://localhost:8000",
  namespace: "tidyscripts",
  database: "introspection"
}
[2025-11-06T12:00:01.456Z] [INFO] [1/10] (10.0%) Processing: src/index.ts
[2025-11-06T12:00:02.789Z] [DEBUG] Embedding cache HIT {
  contentHash: "a1b2c3d4...",
}
[2025-11-06T12:00:05.012Z] ⏱️  File sync: src/index.ts: 3456ms (3.46s)
```

### Debugging Tips

**Enable debug logging for troubleshooting:**
```bash
TS_INTROSPECTION_LOG_LEVEL=DEBUG ts-node -e "import('./index.js').then(m => m.fullSync())"
```

**Debug mode shows:**
- Cache hit/miss decisions
- Hash comparisons (first 8 chars)
- Reconciliation decisions (create/update/delete)
- Individual node processing
- Embedding generation timing

**For production use:**
```bash
# Reduce noise with INFO level (default)
TS_INTROSPECTION_LOG_LEVEL=INFO

# Or only errors
TS_INTROSPECTION_LOG_LEVEL=ERROR
```

See `LOGGING.md` for detailed logging documentation and usage examples.

## Usage

### Prerequisites

1. **SurrealDB** running (version >1.4.2)
```bash
surreal start --unauthenticated
```

2. **TypeDoc JSON** generated at `apps/docs/jdoc.json`

3. **OpenAI API Key** set in environment

### Running Full Sync

```typescript
import { fullSync } from '@tidyscripts/ts_node/introspection';

await fullSync();
```

Or from command line:
```bash
# From the introspection directory
ts-node -e "import('./index.js').then(m => m.fullSync())"
```

### Running Incremental Sync

```typescript
import { incrementalSync } from '@tidyscripts/ts_node/introspection';

// Sync only changed files
await incrementalSync();

// Sync specific files
await incrementalSync([
  'packages/ts_common/src/apis/aidx.ts',
  'packages/ts_node/src/index.ts'
]);
```

### Validating Database

```typescript
import { validate } from '@tidyscripts/ts_node/introspection/validate';

await validate();
```

Or from command line:
```bash
ts-node validate.ts
```

## Database Schema

### Node Tables
- **function_node** - Functions and methods
- **class_node** - Classes
- **module_node** - Modules/namespaces
- **interface_node** - Interfaces
- **type_alias_node** - Type aliases

### Cache & Metadata Tables
- **embedding_cache** - Content-addressable embedding storage
- **file_metadata** - File-level tracking for incremental updates

### Relationships
- **CONTAINS** - Module → Function/Class/Interface
- **USES** - Function/Class → Type
- **IMPORTS** - Module → Module (future)

## Two-Hash Strategy

Every node maintains two hashes for optimal caching:

```typescript
interface FunctionNode {
  nodeHash: string;       // Hash of ENTIRE node (for change detection)
  embeddingHash: string;  // Hash of embedding text only (for API savings)
}
```

### Example Scenario
```typescript
// Function implementation changes
function validateEmail(email: string): boolean {
  // Implementation changed from simple to regex-based
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

- **nodeHash changes**: Source code changed
- **embeddingHash unchanged**: Signature and docstring identical
- **Result**: Update metadata, reuse embedding (no API call!)

## Content-Addressable Embedding Storage

Embeddings are deduplicated by content hash:

```typescript
// Same embedding text → same hash → reuse embedding
// Example: Identical helper functions across files
function isEmptyString(str: string): boolean {
  return str.trim().length === 0;
}

// If this function appears in multiple files:
// - Only ONE embedding generated
// - usageCount tracked in embedding_cache
// - Massive API cost savings!
```

## API Reference

### Synchronization
- `fullSync()` - Full sync of jdoc.json to SurrealDB
- `incrementalSync(filePaths?)` - Sync only changed files
- `syncFile(filePath, db, jdoc)` - Sync single file
- `syncAllFiles(db)` - Sync all files

### Database Operations
- `connect()` - Connect to SurrealDB
- `disconnect(db)` - Disconnect from SurrealDB
- `initializeSchema(db)` - Initialize database schema
- `isSchemaInitialized(db)` - Check if schema exists
- `getTableCounts(db)` - Get counts of all tables
- `getCacheStats(db)` - Get embedding cache statistics

### Configuration
- `loadConfig()` - Load complete configuration
- `loadSurrealConfig()` - Load SurrealDB config only
- `getJdocPath()` - Get path to jdoc.json
- `validateConfig(requireOpenAI?)` - Validate configuration
- `getConfigSummary()` - Get human-readable config summary

### Parsing
- `loadJdoc(path)` - Load and parse jdoc.json
- `extractAllNodes(root)` - Extract all nodes from jdoc
- `groupNodesByFile(nodes)` - Group nodes by file path
- `groupNodesByKind(nodes)` - Group nodes by kind
- `getParsingStats(nodes)` - Get parsing statistics

### Logging
- `logger.debug(message, context?)` - Debug level logging
- `logger.info(message, context?)` - Info level logging
- `logger.warn(message, context?)` - Warning level logging
- `logger.error(message, error, context?)` - Error level logging
- `logger.success(message, context?)` - Success level logging
- `logger.startTimer(label)` - Start performance timer
- `logger.endTimer(label)` - End timer and return duration
- `logger.logTiming(label, durationMs)` - Log timing information
- `initializeLogger()` - Initialize logger from environment

## Performance

### Batch Operations
- **File-level sync**: Only process changed files
- **In-memory reconciliation**: Fast diff before DB operations
- **Batch queries**: Fetch all remote assets in one query

### Caching
- **Embedding cache**: Reuse embeddings across identical functions
- **Two-hash strategy**: Skip embedding regeneration when only metadata changes
- **Content-addressable**: Deduplicate embeddings globally

### Example Stats
After initial sync of tidyscripts codebase (~3.4MB jdoc.json):
- Functions: 500+
- Classes: 100+
- Modules: 50+
- Embeddings cached: 300+
- Cache hit rate: 40-60% on incremental updates

## Validation Queries

### Count Nodes
```sql
SELECT
  (SELECT count() FROM function_node)[0].count AS functions,
  (SELECT count() FROM class_node)[0].count AS classes,
  (SELECT count() FROM module_node)[0].count AS modules
```

### Cache Statistics
```sql
SELECT
  count() AS total_entries,
  math::sum(usageCount) AS total_usage,
  math::max(usageCount) AS max_usage
FROM embedding_cache
```

### Find Functions Without Docstrings
```sql
SELECT name, filePath
FROM function_node
WHERE docstring = '' OR docstring IS NULL
```

## Next Steps (Part 2)

See `introspection_querying_roadmap.md` for:
- Semantic search by embedding similarity
- Graph traversal queries (dependencies, usages)
- Hybrid query interface (semantic + graph)
- Context assembly for agents
- Agent integration and auto-sync workflows

## Troubleshooting

### Schema Errors
```bash
# Reset database
DROP DATABASE introspection;

# Re-run sync
await fullSync();
```

### OpenAI API Errors
- Ensure `OPENAI_API_KEY` is set
- Check API quota/billing
- OpenAI client initialized on-demand (not at module level)

### Connection Errors
- Ensure SurrealDB is running
- Check URL, namespace, database settings
- Verify credentials if authentication enabled

## File Structure

```
packages/ts_node/src/introspection/
├── index.ts                               # Main entry point and public API
├── instructions.md                        # Getting started guide
├── introspection_implementation_roadmap.md # Part 1 implementation details
├── introspection_querying_roadmap.md      # Part 2 (future)
├── README.md                              # This file
├── LOGGING.md                             # Logging guide and documentation
│
├── types.ts                               # TypeScript interfaces
├── constants.ts                           # Constants and enums
├── config.ts                              # Configuration management
├── logger.ts                              # Structured logging utility
│
├── parser.ts                              # JSON parsing and traversal
├── hasher.ts                              # Hashing utilities
├── embeddings.ts                          # OpenAI integration
│
├── schema.ts                              # SurrealDB schema definition
├── database.ts                            # Database operations
├── reconciler.ts                          # Batch reconciliation
├── sync.ts                                # Synchronization orchestration
│
└── validate.ts                            # Validation script
```

## Contributing

When modifying this system:

1. **Never initialize OpenAI at module level** - Always on-demand within functions
2. **Use NodeKind constants** - Never magic numbers
3. **Maintain two-hash strategy** - Both nodeHash and embeddingHash
4. **Update validation queries** - When changing schema
5. **Test incremental updates** - Not just full sync
6. **Use structured logging** - Always use logger, never console.log
7. **Add context to logs** - Include relevant IDs, file paths, operations

## License

Part of the tidyscripts project. See root LICENSE file.
