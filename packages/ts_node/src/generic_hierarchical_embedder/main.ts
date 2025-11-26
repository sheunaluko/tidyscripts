/**
 * Generic Hierarchical Embedder
 *
 * Provides utilities for recursively chunking directory structures.
 * Supports building directory trees and splitting files into semantic chunks
 * with position tracking (character and line numbers).
 * @packageDocumentation 
 */

import * as common from "tidyscripts_common"
import { getDirectoryStructure, DirectoryStructureOptions } from "./directory_structure"
import { chunkDirectoryStructure, ChunkedDirectoryNode } from "./chunk_directory_structure"
import { getChunkStats, ChunkStats, ChunkStatsOptions } from "./stats"
import { embedDirectoryStructure, EmbeddedDirectoryNode, EmbedOptions, EmbedStats } from "./embed_directory_structure"

export * as file_chunker from "./file_chunker"
export * as directory_structure from "./directory_structure"
export * as query from "./query"
export { recreate_index, computeProjectId } from "./database"

let log = common.logger.get_logger({id: "generic_hierarchical_embedder"})
let fp = common.fp
let debug = common.util.debug



/**
 * Recursively chunks all files in a directory tree.
 *
 * This is a convenience function that combines getDirectoryStructure() and
 * chunkDirectoryStructure() into a single operation. It traverses the directory
 * tree, identifies all files, and chunks them based on the provided delimiter.
 *
 * @param rootPath - Absolute path to the root directory to process
 * @param options - Options for directory traversal and chunking
 * @param options.delimiter - Regex pattern to split files on (default: /\n{2,}/g - 2+ newlines)
 * @param options.includeHidden - Include hidden files/directories (default: false)
 * @param options.fileExtensions - Only process files with these extensions (default: all files)
 * @param options.maxDepth - Maximum recursion depth (default: unlimited)
 * @returns Hierarchical structure with all files chunked, including position metadata
 *
 * @example
 * // Chunk all files in a directory with default settings
 * const result = recursively_chunk_directory('/path/to/project');
 *
 * @example
 * // Chunk only TypeScript files, split on 3+ newlines
 * const result = recursively_chunk_directory('/path/to/src', {
 *   delimiter: /\n{3,}/g,
 *   fileExtensions: ['.ts', '.tsx'],
 *   includeHidden: false,
 *   maxDepth: 10
 * });
 *
 * @example
 * // Access the chunks
 * result.children.forEach(node => {
 *   if (node.type === 'file') {
 *     console.log(`File: ${node.path}`);
 *     node.chunks.forEach(chunk => {
 *       console.log(`  Lines ${chunk.startLine}-${chunk.endLine}: ${chunk.content.substring(0, 50)}...`);
 *     });
 *   }
 * });
 */
export function recursively_chunk_directory(
    rootPath: string,
    options: DirectoryStructureOptions & { delimiter?: RegExp, maxTokensPerChunk?: number, charsPerToken?: number } = {}
): ChunkedDirectoryNode {
    const { delimiter = /\n{2,}/g, maxTokensPerChunk, charsPerToken = 2.5, ...structureOptions } = options;

    log(`Starting recursive chunk of directory: ${rootPath}`);

    // Step 1: Get the directory structure (no content)
    const structure = getDirectoryStructure(rootPath, structureOptions);

    // Step 2: Chunk all files in the structure
    const chunked = chunkDirectoryStructure(structure, delimiter, maxTokensPerChunk, charsPerToken);

    log(`Completed recursive chunk of directory: ${rootPath}`);

    return chunked;
}

/**
 * Result of preparing a directory for embedding
 */
export interface DirectoryEmbeddingPreparation {
    chunkedDirectory: ChunkedDirectoryNode;
    stats: ChunkStats;
}

/**
 * Prepares a directory for embedding by chunking all files and calculating statistics.
 *
 * This is the recommended high-level function for preparing a directory structure
 * for embedding operations. It combines chunking and statistics calculation into
 * a single operation, providing both the chunked data and insights about the scope
 * of the embedding task (token count, estimated cost, etc.).
 *
 * @param rootPath - Absolute path to the root directory to process
 * @param options - Options for directory traversal, chunking, and cost estimation
 * @param options.delimiter - Regex pattern to split files on (default: /\n{2,}/g - 2+ newlines)
 * @param options.includeHidden - Include hidden files/directories (default: false)
 * @param options.fileExtensions - Only process files with these extensions (default: all files)
 * @param options.maxDepth - Maximum recursion depth (default: unlimited)
 * @param options.charsPerToken - Average characters per token for estimation (default: 4)
 * @param options.costPerToken - Cost per token in dollars for estimation (default: 0.00000002, OpenAI text-embedding-3-small)
 * @returns Object containing the chunked directory structure and statistics
 *
 * @example
 * // Prepare a directory for embedding with default settings
 * const { chunkedDirectory, stats } = prepare_directory_embedding('/path/to/project');
 * console.log(`Ready to embed ${stats.numChunks} chunks from ${stats.numFiles} files`);
 * console.log(`Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
 *
 * @example
 * // Prepare TypeScript files only with custom pricing
 * const result = prepare_directory_embedding('/path/to/src', {
 *   fileExtensions: ['.ts', '.tsx'],
 *   delimiter: /\n{3,}/g,
 *   charsPerToken: 4,
 *   costPerToken: 0.00002 / 1000  // OpenAI text-embedding-3-small pricing
 * });
 * console.log(`Files: ${result.stats.numFiles}`);
 * console.log(`Chunks: ${result.stats.numChunks}`);
 * console.log(`Tokens: ${result.stats.estimatedTokens}`);
 * console.log(`Cost: $${result.stats.estimatedCost.toFixed(6)}`);
 *
 * @example
 * // Use the chunked directory for embedding
 * const { chunkedDirectory, stats } = prepare_directory_embedding('/path/to/project');
 * // Iterate through chunks and embed them
 * for (const node of chunkedDirectory.children) {
 *   if (node.type === 'file') {
 *     for (const chunk of node.chunks) {
 *       await embedChunk(chunk.content, chunk.filePath, chunk.startLine);
 *     }
 *   }
 * }
 */
export function prepare_directory_embedding(
    rootPath: string,
    options: DirectoryStructureOptions & { delimiter?: RegExp } & ChunkStatsOptions = {}
): DirectoryEmbeddingPreparation {
    const { charsPerToken, costPerToken, ...chunkOptions } = options;

    log(`Preparing directory for embedding: ${rootPath}`);

    // Step 1: Recursively chunk the directory
    const chunkedDirectory = recursively_chunk_directory(rootPath, chunkOptions);

    // Step 2: Calculate statistics
    const stats = getChunkStats(chunkedDirectory, {
        charsPerToken,
        costPerToken
    });

    log(`Preparation complete. Files: ${stats.numFiles}, Chunks: ${stats.numChunks}, Est. cost: $${stats.estimatedCost.toFixed(6)}`);

    return {
        chunkedDirectory,
        stats
    };
}

/**
 * Result of embedding a directory
 */
export interface EmbedDirectoryResult {
    embeddedDirectory: EmbeddedDirectoryNode;
    chunkStats: ChunkStats;
    embedStats: EmbedStats;
}

/**
 * Embeds an entire directory with cost limit protection.
 *
 * This is the recommended high-level function for embedding a directory.
 * It performs the following steps with safety checks:
 *
 * 1. Chunks the directory structure
 * 2. Calculates statistics and estimated cost
 * 3. Checks cost against limit (aborts if over limit)
 * 4. Generates embeddings using batch API
 *
 * @param filePath - Absolute path to the directory to embed
 * @param options - Options for chunking, stats, and embedding
 * @param options.costLimit - Maximum allowed cost in dollars (default: 1.0)
 * @param options.delimiter - Regex pattern to split files on (default: /\n{2,}/g)
 * @param options.includeHidden - Include hidden files/directories (default: false)
 * @param options.fileExtensions - Only process files with these extensions (default: all files)
 * @param options.maxDepth - Maximum recursion depth (default: unlimited)
 * @param options.charsPerToken - Average characters per token for estimation (default: 4)
 * @param options.costPerToken - Cost per token in dollars (default: 0.00000002, OpenAI text-embedding-3-small)
 * @param options.model - OpenAI model (default: 'text-embedding-3-small')
 * @param options.dimensions - Output dimensions (optional, model default)
 * @returns Object containing embedded directory, chunk stats, and embed stats
 * @throws Error if estimated cost exceeds cost limit
 *
 * @example
 * // Embed directory with default $1 limit
 * try {
 *   const result = await embed_directory('/path/to/project');
 *   console.log(`Success! Generated ${result.embedStats.successfulEmbeddings} embeddings`);
 *   console.log(`Actual batches used: ${result.embedStats.totalBatches}`);
 * } catch (error) {
 *   console.error('Embedding failed:', error.message);
 * }
 *
 * @example
 * // Custom cost limit and file filtering
 * const result = await embed_directory('/path/to/src', {
 *   costLimit: 0.10,  // 10 cents max
 *   fileExtensions: ['.ts', '.tsx'],
 *   delimiter: /\n{3,}/g
 * });
 *
 * @example
 * // Use larger model with custom dimensions
 * const result = await embed_directory('/path/to/project', {
 *   costLimit: 5.0,
 *   model: 'text-embedding-3-large',
 *   dimensions: 512,
 *   costPerToken: 0.00000013  // Update for larger model pricing
 * });
 */
export async function embed_directory(
    filePath: string,
    options: DirectoryStructureOptions &
             { delimiter?: RegExp } &
             ChunkStatsOptions &
             EmbedOptions &
             { costLimit?: number } = {}
): Promise<EmbedDirectoryResult> {
    const {
        costLimit = 1.0,
        charsPerToken,
        costPerToken,
        model,
        dimensions,
        maxTokensPerChunk,
        maxTokensPerBatch,
        maxChunksPerBatch,
        ...chunkOptions
    } = options;

    log(`=== embed_directory started ===`)
    log(`Directory: ${filePath}`)
    log(`Cost limit: $${costLimit.toFixed(6)}`)

    // Step 1: Prepare directory (chunk + calculate stats)
    log(`Step 1: Preparing directory for embedding`)
    const { chunkedDirectory, stats: chunkStats } = prepare_directory_embedding(filePath, {
        ...chunkOptions,
        charsPerToken,
        costPerToken
    });

    // Step 2: Check cost against limit
    log(`Step 2: Checking estimated cost against limit`)
    log(`Estimated cost: $${chunkStats.estimatedCost.toFixed(6)} (limit: $${costLimit.toFixed(6)})`)

    if (chunkStats.estimatedCost > costLimit) {
        const errorMsg = `Estimated cost ($${chunkStats.estimatedCost.toFixed(6)}) exceeds limit ($${costLimit.toFixed(6)}). Aborting.`;
        log(`ERROR: ${errorMsg}`)
        throw new Error(errorMsg);
    }

    log(`Cost check passed. Proceeding with embedding.`)

    // Step 3: Generate embeddings
    log(`Step 3: Generating embeddings`)
    const { embeddedDirectory, stats: embedStats } = await embedDirectoryStructure(chunkedDirectory, {
        model,
        dimensions,
        charsPerToken,
        maxTokensPerChunk,
        maxTokensPerBatch,
        maxChunksPerBatch
    });

    // Step 4: Calculate actual cost (if all embeddings succeeded)
    const actualCost = embedStats.successfulEmbeddings * (costPerToken || 0.00000002);
    log(`Step 4: Embedding complete`)
    log(`Actual embeddings generated: ${embedStats.successfulEmbeddings}`)
    log(`Actual cost: $${actualCost.toFixed(6)} (estimated: $${chunkStats.estimatedCost.toFixed(6)})`)

    log(`=== embed_directory complete ===`)
    log(`Summary: ${embedStats.successfulEmbeddings}/${chunkStats.numChunks} embeddings, ${embedStats.totalBatches} batches, $${actualCost.toFixed(6)} cost`)

    return {
        embeddedDirectory,
        chunkStats,
        embedStats
    };
}

/**
 * Result of embedding and storing a directory
 */
export interface EmbedAndStoreResult {
    embeddedDirectory: EmbeddedDirectoryNode;
    chunkStats: ChunkStats;
    embedStats: EmbedStats;
    storageStats: any; // StorageStats from database.ts
}

/**
 * Embeds and stores an entire directory in SurrealDB.
 *
 * This is the complete end-to-end function that:
 * 1. Chunks the directory structure
 * 2. Generates embeddings using OpenAI's batch API
 * 3. Stores everything in SurrealDB with graph relations
 *
 * @param filePath - Absolute path to the directory to embed and store
 * @param options - Combined options for all stages
 * @param options.costLimit - Maximum allowed cost in dollars (default: 1.0)
 * @param options.fileExtensions - Only process files with these extensions (e.g., ['.mdx'])
 * @param options.delimiter - Regex pattern to split files on (default: /\n{2,}/g)
 * @param options.model - OpenAI model (default: 'text-embedding-3-small')
 * @param options.dimensions - Output dimensions (default: 1536)
 * @param options.deleteExisting - Delete existing project data (default: true)
 * @returns Object containing embedded directory, stats, and storage stats
 *
 * @example
 * // Embed and store MDX files only
 * const result = await embed_and_store_directory('/path/to/docs', {
 *   fileExtensions: ['.mdx'],
 *   costLimit: 0.50,
 *   model: 'text-embedding-3-small',
 *   dimensions: 1536
 * });
 * console.log(`Project: ${result.storageStats.projectId}`);
 * console.log(`Stored: ${result.storageStats.chunksCreated} chunks`);
 * console.log(`Embeddings: ${result.storageStats.embeddingsCreated} new, ${result.storageStats.embeddingsReused} reused`);
 *
 * @example
 * // Embed and store TypeScript files
 * const result = await embed_and_store_directory('/path/to/src', {
 *   fileExtensions: ['.ts', '.tsx'],
 *   costLimit: 2.0,
 *   delimiter: /\n{3,}/g,
 *   deleteExisting: true
 * });
 */
export async function embed_and_store_directory(
    filePath: string,
    options: DirectoryStructureOptions &
             { delimiter?: RegExp } &
             ChunkStatsOptions &
             EmbedOptions &
             { costLimit?: number, deleteExisting?: boolean } = {}
): Promise<EmbedAndStoreResult> {
    const { deleteExisting = true, ...embedOptions } = options;

    log(`=== embed_and_store_directory started ===`)
    log(`Directory: ${filePath}`)

    // Step 1: Embed the directory
    log(`Step 1: Embedding directory`)
    const embedResult = await embed_directory(filePath, embedOptions);

    // Step 2: Store in SurrealDB
    log(`Step 2: Storing in SurrealDB`)
    const { store_embedded_directory } = await import('./database');

    const storageStats = await store_embedded_directory(
        embedResult.embeddedDirectory,
        filePath,
        {
            model: options.model,
            dimensions: options.dimensions,
            deleteExisting
        }
    );

    log(`=== embed_and_store_directory complete ===`)
    log(`Project ID: ${storageStats.projectId}`)
    log(`Storage: ${storageStats.directoriesCreated} dirs, ${storageStats.filesCreated} files, ${storageStats.chunksCreated} chunks`)
    log(`Embeddings: ${storageStats.embeddingsCreated} new, ${storageStats.embeddingsReused} reused`)

    return {
        embeddedDirectory: embedResult.embeddedDirectory,
        chunkStats: embedResult.chunkStats,
        embedStats: embedResult.embedStats,
        storageStats
    };
}

/**
 * Query a stored project by directory path and return results as Markdown
 *
 * This is a convenience function that:
 * 1. Computes the project ID from the root directory path
 * 2. Performs vector similarity search against that project
 * 3. Returns formatted Markdown results
 *
 * The project must have been previously embedded and stored using embed_and_store_directory().
 *
 * @param query - Natural language query to search for
 * @param rootDir - Root directory path of the project (used to compute project ID)
 * @param options - Search options
 * @param options.limit - Maximum number of results to return (default: 10)
 * @param options.threshold - Minimum similarity score 0-1 (default: 0.3)
 * @param options.fileExtensions - Filter results by file extensions (e.g., ['.ts', '.js'])
 * @param options.model - Embedding model to use (default: 'text-embedding-3-small')
 * @param options.dimensions - Embedding dimensions (default: 1536)
 * @returns Markdown-formatted search results with relevance scores
 *
 * @example
 * // Query a previously embedded project
 * const markdown = await query_project(
 *   "How does authentication work?",
 *   "/path/to/project",
 *   { limit: 5, threshold: 0.6 }
 * );
 * console.log(markdown);
 *
 * @example
 * // Filter by file type
 * const results = await query_project(
 *   "database connection logic",
 *   "/home/user/my-app",
 *   {
 *     limit: 3,
 *     threshold: 0.5,
 *     fileExtensions: ['.ts', '.js']
 *   }
 * );
 *
 * @example
 * // Full workflow: embed, store, then query
 * await embed_and_store_directory('/path/to/project', {
 *   fileExtensions: ['.ts'],
 *   costLimit: 1.0
 * });
 *
 * const results = await query_project(
 *   "error handling patterns",
 *   "/path/to/project",
 *   { limit: 10 }
 * );
 * console.log(results);
 */
export async function query_project(
    query: string,
    rootDir: string,
    options: {
        limit?: number,
        threshold?: number,
        fileExtensions?: string[],
        model?: string,
        dimensions?: number
    } = {}
): Promise<string> {
    const { limit = 10, threshold, fileExtensions, model, dimensions } = options;


    log(`=== query_project started ===`);
    log(`Query: "${query}"`);
    log(`Root directory: ${rootDir}`);
    log(`Limit: ${limit}`);

    // Import dependencies
    const { computeProjectId } = await import('./database');
    const { queryForMarkdown } = await import('./query');

    // Step 1: Compute project ID from root directory
    log(`Step 1: Computing project ID from root directory`);
    const projectId = await computeProjectId(rootDir);
    log(`Project ID: ${projectId}`);

    // Step 2: Query for markdown results
    log(`Step 2: Executing similarity search`);
    const markdown = await queryForMarkdown(query, {
        projectId,
        limit,
        threshold,
        fileExtensions,
        model,
        dimensions
    });

    log(`=== query_project complete ===`);

    return markdown;
}


