# Generic Hierarchical Embedder - Context for Claude

## Project Overview

The `generic_hierarchical_embedder` module provides utilities for recursively chunking directory structures and generating embeddings for code/text files using OpenAI's batch embedding API.

## Current Status

### ✅ Completed Features

1. **File Chunking** (`file_chunker.ts`)
   - `chunkFile()` - Chunks files based on regex delimiters (default: 2+ newlines)
   - `split_chunk()` - Recursively splits oversized chunks to fit token limits
   - Returns chunks with position metadata: `startChar`, `endChar`, `startLine`, `endLine`
   - Automatic splitting if `maxTokensPerChunk` is provided

2. **Directory Structure** (`directory_structure.ts`)
   - `getDirectoryStructure()` - Recursively builds directory tree (no content)
   - `convertDirectoryNodeToTypeSet()` - Extracts unique file extensions from tree
   - `produceFileTypeSet()` - Convenience function (path → file type set)
   - Options: `includeHidden`, `fileExtensions`, `maxDepth`
   - Returns `DirectoryNode` and `FileNode` hierarchy

3. **Chunk Directory Structure** (`chunk_directory_structure.ts`)
   - `chunkDirectoryStructure()` - Adds chunks to all files in directory tree
   - Immutable transformation - returns new tree
   - Passes `maxTokensPerChunk` down to `chunkFile()`

4. **Embedding Generation** (`embed_directory_structure.ts`)
   - `embedDirectoryStructure()` - Generates embeddings for all chunks
   - **Actual token counting** - Uses tiktoken (cl100k_base encoding)
   - **Automatic splitting** - Splits oversized chunks instead of skipping
   - **Batch processing** - respects OpenAI limits:
     - 8192 tokens per chunk (configurable, default 6000 for safety)
     - 300,000 tokens per batch
     - 2048 chunks per batch
   - **Filesystem caching** - caches entire batch API calls
     - Cache directory: `./data/.cache/ghe_embeddings`
     - Uses `FileSystemCache` from `node_cache`
     - Cache key: hash of `(texts[], model, dimensions)`
   - Handles failures gracefully, continues with next batch

5. **Statistics** (`stats.ts`)
   - `getChunkStats()` - Calculates file/chunk counts, token estimates, cost
   - Default cost: $0.00000002/token (OpenAI text-embedding-3-small)

6. **Database Storage** (`config.ts`, `database.ts`) - **FULLY IMPLEMENTED**
   - Environment variables:
     - `SURREAL_TIDYSCRIPTS_BACKEND_URL` (required)
     - `SURREAL_TIDYSCRIPTS_BACKEND_USER` (optional)
     - `SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD` (optional)
   - Defaults: namespace `tidyscripts`, database `GHE`
   - `get_database()` - Singleton cached connection
   - `initialize_schema()` - Creates HNSW vector index on embedding_store
   - `store_embedded_directory()` - **Stores embedded directory in SurrealDB**
     - Deterministic IDs via SHA256 hashing
     - Hierarchical graph structure with relations
     - Shared embedding deduplication
     - Automatic cleanup of existing project data

7. **Main API** (`main.ts`)
   - `recursively_chunk_directory()` - Chunks entire directory
   - `prepare_directory_embedding()` - Chunks + calculates stats
   - `embed_directory()` - Embeds directory with cost protection
     - Cost limit protection (default $1.00)
     - Estimates cost BEFORE embedding
     - Returns `{ embeddedDirectory, chunkStats, embedStats }`
   - `embed_and_store_directory()` - **Complete end-to-end function**
     - Embeds directory
     - Stores in SurrealDB
     - Returns all stats including storage stats

## Architecture Decisions

### Database Design (Implemented)
- **Option 3 (Table-Level with Project ID)** - IMPLEMENTED APPROACH
- Single database with `projectId` scoping
- Shared embedding store across all projects (deduplication!)
- Schema:
  ```
  - project (id: sha256(rootPath), name, rootPath, created)
  - directory_node (id, projectId, path, name, parentId)
  - file_node (id, projectId, path, name, parentId)
  - chunk (id, projectId, fileId, content, contentHash, embeddingId, startChar, endChar, startLine, endLine)
  - embedding_store (id: contentHash, vector, model, dimensions, usageCount, created) // SHARED!
  - Relations: contains (directory->directory, directory->file), has_chunk (file->chunk), has_embedding (chunk->embedding)
    - ALL relations store projectId as metadata for efficient deletion
  ```
- All IDs are deterministic SHA256 hashes using `type::thing($table, $hash)` pattern
- HNSW vector index on `embedding_store.vector` for similarity search
- **SurrealQL ID Pattern**: All queries use the following pattern for consistent ID handling:
  ```surrealql
  LET $id = type::thing($table, $idHash);
  CREATE $id SET field1 = $value1, field2 = $value2;
  ```
  This ensures deterministic IDs with no RETURN statements needed (IDs are predetermined)
- **Relation Metadata Pattern**: All relations store projectId for efficient scoped deletion:
  ```surrealql
  RELATE $parent->contains->$child SET projectId = $projectId;
  DELETE contains WHERE projectId = $projectId;  // Fast, no fetch needed
  ```

### Caching Strategy
- **Filesystem cache** for batch embeddings (not SurrealDB cache)
- Caches entire batch API call, not individual chunks
- Cache hits when exact same texts in exact same order
- Following TOM pattern from `tom.ts`

## Key Files

- `file_chunker.ts` - File chunking with auto-splitting
- `directory_structure.ts` - Directory tree traversal
- `chunk_directory_structure.ts` - Add chunks to tree
- `embed_directory_structure.ts` - Batch embedding with caching
- `stats.ts` - Cost/token estimation
- `config.ts` - SurrealDB config
- `database.ts` - DB connection (singleton)
- `main.ts` - High-level API

## Recent Issues Fixed

1. **Token limit errors** - Chunks exceeded 8192 token limit
   - Fixed: Replaced character estimation with actual tiktoken counting (cl100k_base)
   - Fixed: Safety buffer (6000 token max instead of 8192)
   - Fixed: Automatic chunk splitting via `split_chunk()` instead of skipping

2. **Batch caching** - Initially implemented per-chunk caching
   - Fixed: Now caches entire batch API call for efficiency

3. **Module resolution for js-tiktoken** - TypeScript couldn't resolve ESM exports
   - Fixed: Added `@ts-ignore` comments for imports

4. **SurrealDB ID handling** - String concatenation causing RELATE errors
   - Fixed: Use `type::thing($table, $hash)` pattern consistently
   - Fixed: Deterministic SHA256-based IDs
   - Fixed: Remove all RETURN statements (IDs are predetermined)

5. **Database.ts Critical Fixes (2025-01-25)**
   - Fixed: Relation deletion was deleting ALL projects (not scoped to current project)
     - Solution: Store `projectId` as metadata on all relations
     - Now: `DELETE contains WHERE projectId = $projectId` (fast, no fetch)
   - Fixed: Missing `usageCount` increment when reusing embeddings
     - Solution: `UPDATE embedding_store SET usageCount += 1` on reuse
   - Fixed: Wrong order of operations (chunks created before embeddings)
     - Solution: Check/create embedding FIRST, then create chunk with embeddingId
     - Order: 1) Check embedding, 2) Create/update embedding, 3) Create chunk, 4) Create relations

## Usage Examples

### Embed and Store (Complete End-to-End)

```typescript
import { embed_and_store_directory } from 'ts_node/generic_hierarchical_embedder';

// Embed and store MDX documentation files
const result = await embed_and_store_directory('/path/to/docs', {
    fileExtensions: ['.mdx'],    // Only process .mdx files
    costLimit: 0.50,             // $0.50 max
    model: 'text-embedding-3-small',
    dimensions: 1536,
    deleteExisting: true         // Clean up old project data
});

console.log(`Project: ${result.storageStats.projectId}`);
console.log(`Embeddings: ${result.embedStats.successfulEmbeddings}`);
console.log(`Storage: ${result.storageStats.chunksCreated} chunks`);
console.log(`Embeddings: ${result.storageStats.embeddingsCreated} new, ${result.storageStats.embeddingsReused} reused`);
```

### Embed Only (No Database)

```typescript
import { embed_directory } from 'ts_node/generic_hierarchical_embedder';

// Embed directory with cost protection
const result = await embed_directory('/path/to/project', {
    costLimit: 1.0,              // $1 max
    fileExtensions: ['.ts', '.js'],
    delimiter: /\n{2,}/g,
    maxTokensPerChunk: 6000,
    charsPerToken: 2.5
});

console.log(`Embeddings: ${result.embedStats.successfulEmbeddings}`);
console.log(`Cost: $${result.embedStats.successfulEmbeddings * 0.00000002}`);
```

### Get File Types in Directory

```typescript
import { directory_structure } from 'ts_node/generic_hierarchical_embedder';

// Get all file extensions in a directory
const fileTypes = directory_structure.produceFileTypeSet('/path/to/project', {
    includeHidden: false,
    maxDepth: 10
});

console.log(fileTypes); // Set { '.ts', '.js', '.json', '.md', 'none' }
```

## Important Constants

- Default model: `text-embedding-3-small`
- Default delimiter: `/\n{2,}/g` (2+ newlines)
- Default chars/token: `2.5` (conservative for code)
- Default max tokens/chunk: `6000` (safety buffer)
- Default cost/token: `$0.00000002` (OpenAI pricing)
- Cache directory: `./data/.cache/ghe_embeddings`

## Environment Setup

```bash
# Required for OpenAI embeddings
export OPENAI_API_KEY="sk-..."

# Required for SurrealDB storage
export SURREAL_TIDYSCRIPTS_BACKEND_URL="ws://localhost:8000"

# Optional SurrealDB credentials
export SURREAL_TIDYSCRIPTS_BACKEND_USER="root"
export SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD="root"

# Optional cache directory (defaults to ./data/.cache/ghe_embeddings)
export TIDYSCRIPTS_DATA_DIR="/path/to/data"
```
