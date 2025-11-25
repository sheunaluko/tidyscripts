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
   - Options: `includeHidden`, `fileExtensions`, `maxDepth`
   - Returns `DirectoryNode` and `FileNode` hierarchy

3. **Chunk Directory Structure** (`chunk_directory_structure.ts`)
   - `chunkDirectoryStructure()` - Adds chunks to all files in directory tree
   - Immutable transformation - returns new tree
   - Passes `maxTokensPerChunk` down to `chunkFile()`

4. **Embedding Generation** (`embed_directory_structure.ts`)
   - `embedDirectoryStructure()` - Generates embeddings for all chunks
   - **Batch processing** - respects OpenAI limits:
     - 8192 tokens per chunk (configurable, default 6000 for safety)
     - 300,000 tokens per batch
     - 2048 chunks per batch
   - **Filesystem caching** - caches entire batch API calls
     - Cache directory: `./data/.cache/ghe_embeddings`
     - Uses `FileSystemCache` from `node_cache`
     - Cache key: hash of `(texts[], model, dimensions)`
   - Conservative token estimation: 2.5 chars/token (was 4, caused API errors)
   - Handles failures gracefully, continues with next batch

5. **Statistics** (`stats.ts`)
   - `getChunkStats()` - Calculates file/chunk counts, token estimates, cost
   - Default cost: $0.00000002/token (OpenAI text-embedding-3-small)

6. **Database Configuration** (`config.ts`, `database.ts`)
   - Environment variables:
     - `SURREAL_TIDYSCRIPTS_BACKEND_URL` (required)
     - `SURREAL_TIDYSCRIPTS_BACKEND_USER` (optional)
     - `SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD` (optional)
   - Defaults: namespace `tidyscripts`, database `GHE`
   - `get_database()` - Singleton cached connection

7. **Main API** (`main.ts`)
   - `recursively_chunk_directory()` - Chunks entire directory
   - `prepare_directory_embedding()` - Chunks + calculates stats
   - `embed_directory()` - **Main entry point**
     - Cost limit protection (default $1.00)
     - Estimates cost BEFORE embedding
     - Returns `{ embeddedDirectory, chunkStats, embedStats }`

## Architecture Decisions

### Database Design (Planned, Not Yet Implemented)
- **Option 3 (Table-Level with Project ID)** - CHOSEN APPROACH
- Single database with `projectId` scoping
- Shared embedding cache across all projects (deduplication!)
- Schema (to be implemented):
  ```
  - project (id: sha256(rootPath), name, rootPath, created)
  - directory_node (id, projectId, path, name, ...)
  - file_node (id, projectId, path, name, ...)
  - chunk (id, projectId, fileId, content, embedding, ...)
  - embedding_cache (contentHash, embedding, usageCount) // SHARED!
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
   - Fixed: More conservative estimation (2.5 chars/token)
   - Fixed: Safety buffer (6000 token max instead of 8192)
   - Fixed: Automatic chunk splitting via `split_chunk()`

2. **Batch caching** - Initially implemented per-chunk caching
   - Fixed: Now caches entire batch API call for efficiency

## Next Steps (TODO from main.ts)

```typescript
/*
	Status:
	- have the db connection in database.ts
	- implemented obtaining the batch embeddings and population chunked_directory (not tested)

	Todo:
	- need to parse the chunked_dir (with embeddings) and write the nodes to the db
	  - along with graph relations
	  - and links to embeddings
	  - embeddings in their own separate table

	- ensure to save by PROJECT_ID (so can filter by project - can be hash of the dir)
	- ensure that actual relations are used for linking nodes to the embedding

*/
```

## Usage Example

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

## Important Constants

- Default model: `text-embedding-3-small`
- Default delimiter: `/\n{2,}/g` (2+ newlines)
- Default chars/token: `2.5` (conservative for code)
- Default max tokens/chunk: `6000` (safety buffer)
- Default cost/token: `$0.00000002` (OpenAI pricing)
- Cache directory: `./data/.cache/ghe_embeddings`

## Environment Setup

```bash
# Required for database (when implemented)
export SURREAL_TIDYSCRIPTS_BACKEND_URL="ws://localhost:8000"
export SURREAL_TIDYSCRIPTS_BACKEND_USER="root"
export SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD="root"

# Optional cache directory
export TIDYSCRIPTS_DATA_DIR="/path/to/data"

# Required for OpenAI
export OPENAI_API_KEY="sk-..."
```
