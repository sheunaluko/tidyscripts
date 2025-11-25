import * as common from "tidyscripts_common"
import OpenAI from 'openai'
import { ChunkedDirectoryNode, ChunkedHierarchicalNode, ChunkedFileNode } from "./chunk_directory_structure"
import { FileChunk, split_chunk } from "./file_chunker"
import { FileSystemCache } from "../apis/node_cache"
import { path } from "../io"
import { Tiktoken } from "js-tiktoken/lite";
import  cl100k_base  from "js-tiktoken/ranks/cl100k_base";

const { CacheUtils } = common.apis.cache
let log = common.logger.get_logger({id: "embed_directory_structure"})

// ============================================================================
// Tiktoken Token Counting
// ============================================================================

/**
 * Singleton encoder instance to avoid repeated initialization
 */
let _encoder: Tiktoken | null = null;

/**
 * Get or create the tiktoken encoder instance
 */
function getEncoder(): Tiktoken {
    if (!_encoder) {
        _encoder = new Tiktoken(cl100k_base);
    }
    return _encoder;
}

/**
 * Count actual tokens in a text string using tiktoken (cl100k_base encoding)
 * This is the same encoding used by OpenAI's text-embedding-3-* models
 *
 * @param text - Text to count tokens for
 * @returns Actual token count
 */
function countTokens(text: string): number {
    const enc = getEncoder();
    const tokens = enc.encode(text);
    const count = tokens.length;
    return count;
}

// ============================================================================
// Filesystem Cache Setup
// ============================================================================

/**
 * Cached batch embedding function (memoized with filesystem cache)
 */
let cached_batch_embedding_fn: any = null;

/**
 * Initialize or get the cached batch embedding function
 *
 * Uses FileSystemCache to avoid re-generating embeddings for the same batch.
 * Cache directory: ./data/.cache/ghe_embeddings
 */
function get_cached_batch_embedding_fn() {
    if (cached_batch_embedding_fn) {
        return cached_batch_embedding_fn;
    }

    // Don't cache on Vercel
    if (process.env['VERCEL']) {
        log('Vercel environment detected - filesystem caching disabled');
        cached_batch_embedding_fn = generate_batch_embeddings_raw;
        return cached_batch_embedding_fn;
    }

    // Determine cache directory
    let parent_cache_dir = process.cwd();
    if (process.env['TIDYSCRIPTS_DATA_DIR']) {
        parent_cache_dir = process.env['TIDYSCRIPTS_DATA_DIR'];
        log(`Using TIDYSCRIPTS_DATA_DIR for cache: ${parent_cache_dir}`);
    }

    const cacheDir = path.join(parent_cache_dir, 'data', '.cache', 'ghe_embeddings');
    log(`Filesystem cache enabled: ${cacheDir}`);

    const fs_cache = new FileSystemCache<any>({
        cacheDir,
        onlyLogHitsMisses: true,
        logPrefix: "ghe_embed_cache",
        namespace: "batch_embeddings"
    });

    // Memoize the batch embedding function
    cached_batch_embedding_fn = CacheUtils.memoize(generate_batch_embeddings_raw, fs_cache);

    return cached_batch_embedding_fn;
}

/**
 * Generate batch embeddings (non-cached version)
 * This is the base function that gets wrapped by the cache
 *
 * @param texts - Array of texts to embed
 * @param model - OpenAI model to use
 * @param dimensions - Optional output dimensions
 * @returns Array of embedding vectors (same order as input)
 */
async function generate_batch_embeddings_raw(
    texts: string[],
    model: string = 'text-embedding-3-small',
    dimensions?: number
): Promise<number[][]> {
    const openai = new OpenAI();
    const response = await openai.embeddings.create({
        model,
        input: texts,
        encoding_format: 'float',
        ...(dimensions ? { dimensions } : {})
    });
    return response.data.map(d => d.embedding);
}

/**
 * Represents a chunk with its embedding vector
 */
export interface EmbeddedChunk extends FileChunk {
    embedding: number[];
}

/**
 * Represents a file node with embedded chunks
 */
export interface EmbeddedFileNode {
    type: "file";
    path: string;
    name: string;
    chunks: EmbeddedChunk[];
}

/**
 * Represents a directory node with embedded children
 */
export interface EmbeddedDirectoryNode {
    type: "directory";
    path: string;
    name: string;
    children: EmbeddedHierarchicalNode[];
}

/**
 * Union type for embedded nodes
 */
export type EmbeddedHierarchicalNode = EmbeddedFileNode | EmbeddedDirectoryNode;

/**
 * Options for embedding generation
 */
export interface EmbedOptions {
    model?: string;           // OpenAI model (default: 'text-embedding-3-small')
    dimensions?: number;      // Output dimensions (optional, model default)
    charsPerToken?: number;   // Characters per token estimate (default: 4)
    maxTokensPerChunk?: number;    // Max tokens per chunk (default: 8192)
    maxTokensPerBatch?: number;    // Max tokens per batch (default: 300000)
    maxChunksPerBatch?: number;    // Max chunks per batch (default: 2048)
}

/**
 * Statistics about the embedding process
 */
export interface EmbedStats {
    totalChunks: number;
    totalBatches: number;
    splitChunks: number;         // Number of chunks that were split (changed from skippedChunks)
    totalTokens: number;
    successfulEmbeddings: number;
    failedEmbeddings: number;
}

// ============================================================================
// Phase 1: Flatten & Collect All Chunks
// ============================================================================

/**
 * Recursively collects all chunks from a chunked directory structure
 *
 * @param chunkedDir - The chunked directory structure
 * @returns Flat array of all chunks
 */
function collectAllChunks(chunkedDir: ChunkedDirectoryNode): FileChunk[] {
    const chunks: FileChunk[] = [];

    function traverse(node: ChunkedHierarchicalNode): void {
        if (node.type === "file") {
            chunks.push(...node.chunks);
        } else {
            node.children.forEach(traverse);
        }
    }

    traverse(chunkedDir);
    return chunks;
}

// ============================================================================
// Phase 2: Batch Chunks by Token Budget
// ============================================================================

/**
 * Groups chunks into batches respecting OpenAI API limits
 * Uses actual tiktoken counting and automatically splits oversized chunks
 *
 * @param chunks - Array of all chunks
 * @param options - Embedding options with limits
 * @returns Array of batches and number of split chunks
 */
function createBatches(
    chunks: FileChunk[],
    options: Required<EmbedOptions>
): { batches: FileChunk[][], splitCount: number } {
    log(`Creating batches from ${chunks.length} chunks`)

    const batches: FileChunk[][] = [];
    let currentBatch: FileChunk[] = [];
    let currentTokens = 0;
    let splitCount = 0;

    // Process all chunks, splitting any that are too large
    const processedChunks: FileChunk[] = [];
    for (const chunk of chunks) {
        const chunkTokens = countTokens(chunk.content);

        // If chunk exceeds per-input limit, split it
        if (chunkTokens > options.maxTokensPerChunk) {
            log(`Splitting oversized chunk (${chunkTokens} tokens): ${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`)

            // Split using the existing split_chunk function from file_chunker
            // We need to estimate charsPerToken for the splitter
            const estimatedCharsPerToken = chunk.content.length / chunkTokens;
            const subChunks = split_chunk(chunk, options.maxTokensPerChunk, estimatedCharsPerToken);

            log(`Split into ${subChunks.length} sub-chunks`)
            processedChunks.push(...subChunks);
            splitCount++;
        } else {
            processedChunks.push(chunk);
        }
    }

    log(`Processed ${processedChunks.length} chunks (split ${splitCount} oversized chunks)`)

    // Now batch the processed chunks
    for (const chunk of processedChunks) {
        const chunkTokens = countTokens(chunk.content);

        // Check if adding this chunk would exceed limits
        if (currentBatch.length >= options.maxChunksPerBatch ||
            currentTokens + chunkTokens > options.maxTokensPerBatch) {

            if (currentBatch.length > 0) {
                log(`Batch complete: ${currentBatch.length} chunks, ${currentTokens} tokens`)
                batches.push(currentBatch);
                currentBatch = [];
                currentTokens = 0;
            }
        }

        currentBatch.push(chunk);
        currentTokens += chunkTokens;
    }

    // Add final batch
    if (currentBatch.length > 0) {
        log(`Final batch: ${currentBatch.length} chunks, ${currentTokens} tokens`)
        batches.push(currentBatch);
    }

    log(`Created ${batches.length} batches from ${processedChunks.length} chunks`)

    return { batches, splitCount };
}

// ============================================================================
// Phase 3: Generate Embeddings in Batches
// ============================================================================

/**
 * Generates embeddings for batches of chunks using OpenAI API with filesystem caching
 *
 * @param batches - Array of chunk batches
 * @param options - Embedding options
 * @returns Map of chunk keys to embedding vectors, plus stats
 */
async function generateEmbeddingsForBatches(
    batches: FileChunk[][],
    options: Required<EmbedOptions>
): Promise<{ embeddingMap: Map<string, number[]>, stats: Pick<EmbedStats, 'successfulEmbeddings' | 'failedEmbeddings'> }> {
    log(`Starting batch embedding generation for ${batches.length} batches`)

    const cached_batch_fn = get_cached_batch_embedding_fn();
    const embeddingMap = new Map<string, number[]>();
    let successfulEmbeddings = 0;
    let failedEmbeddings = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const totalChunksInBatch = batch.length;

        log(`Processing batch ${batchIndex + 1}/${batches.length} with ${totalChunksInBatch} chunks`)

        try {
            const texts = batch.map(c => c.content);

            // Call cached batch embedding function (will hit cache if same batch seen before)
            const embeddings = await cached_batch_fn(texts, options.model, options.dimensions);

            log(`Received ${embeddings.length} embeddings for batch ${batchIndex + 1}`)

            // Map embeddings back to chunks using unique key
            batch.forEach((chunk, i) => {
                const key = `${chunk.filePath}:${chunk.startChar}:${chunk.endChar}`;
                embeddingMap.set(key, embeddings[i]);
                successfulEmbeddings++;
            });

            log(`Batch ${batchIndex + 1}/${batches.length} complete: ${successfulEmbeddings} total embeddings generated`)

        } catch (error) {
            log(`ERROR: Batch ${batchIndex + 1} failed: ${error}`)
            failedEmbeddings += totalChunksInBatch;

            // Continue with next batch rather than failing completely
            log(`Continuing with next batch (${failedEmbeddings} failed embeddings so far)`)
        }
    }

    log(`Embedding generation complete: ${successfulEmbeddings} successful, ${failedEmbeddings} failed`)

    return {
        embeddingMap,
        stats: { successfulEmbeddings, failedEmbeddings }
    };
}

// ============================================================================
// Phase 4: Reconstruct Tree with Embeddings (Immutable)
// ============================================================================

/**
 * Reconstructs the directory tree with embeddings added to chunks
 *
 * @param chunkedDir - Original chunked directory structure
 * @param embeddingMap - Map of chunk keys to embeddings
 * @returns New directory structure with embeddings
 */
function addEmbeddingsToStructure(
    chunkedDir: ChunkedDirectoryNode,
    embeddingMap: Map<string, number[]>
): EmbeddedDirectoryNode {
    log(`Reconstructing directory tree with embeddings`)

    let chunksProcessed = 0;
    let chunksWithEmbeddings = 0;
    let chunksMissingEmbeddings = 0;

    function transformNode(node: ChunkedHierarchicalNode): EmbeddedHierarchicalNode {
        if (node.type === "file") {
            const embeddedChunks = node.chunks.map(chunk => {
                chunksProcessed++;
                const key = `${chunk.filePath}:${chunk.startChar}:${chunk.endChar}`;
                const embedding = embeddingMap.get(key);

                if (embedding) {
                    chunksWithEmbeddings++;
                } else {
                    chunksMissingEmbeddings++;
                    log(`WARNING: No embedding found for chunk: ${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`)
                }

                return {
                    ...chunk,
                    embedding: embedding || []
                };
            });

            return {
                type: "file",
                path: node.path,
                name: node.name,
                chunks: embeddedChunks
            };
        } else {
            return {
                type: "directory",
                path: node.path,
                name: node.name,
                children: node.children.map(transformNode)
            };
        }
    }

    const result = transformNode(chunkedDir) as EmbeddedDirectoryNode;

    log(`Tree reconstruction complete: ${chunksProcessed} chunks processed, ${chunksWithEmbeddings} with embeddings, ${chunksMissingEmbeddings} missing embeddings`)

    return result;
}

// ============================================================================
// Main Public API
// ============================================================================

/**
 * Generates embeddings for all chunks in a chunked directory structure
 *
 * Uses OpenAI's batch embedding API with intelligent batching to respect:
 * - Per-chunk token limit (8192 tokens)
 * - Per-request token limit (300,000 tokens)
 * - Per-request item limit (2048 chunks)
 *
 * Returns a new immutable structure with embeddings added to all chunks.
 *
 * @param chunkedDir - Chunked directory structure from chunkDirectoryStructure()
 * @param options - Embedding generation options
 * @returns New directory structure with embeddings and statistics
 *
 * @example
 * const chunked = recursively_chunk_directory('/path/to/project');
 * const { embeddedDirectory, stats } = await embedDirectoryStructure(chunked);
 * console.log(`Generated ${stats.successfulEmbeddings} embeddings in ${stats.totalBatches} batches`);
 *
 * @example
 * // With custom options
 * const result = await embedDirectoryStructure(chunked, {
 *   model: 'text-embedding-3-large',
 *   dimensions: 256,
 *   maxTokensPerBatch: 200000
 * });
 */
export async function embedDirectoryStructure(
    chunkedDir: ChunkedDirectoryNode,
    options: EmbedOptions = {}
): Promise<{ embeddedDirectory: EmbeddedDirectoryNode, stats: EmbedStats }> {

    const opts: Required<EmbedOptions> = {
        model: options.model || 'text-embedding-3-small',
        dimensions: options.dimensions || undefined as any,
        charsPerToken: options.charsPerToken || 2.5,  // Conservative for code (was 4)
        maxTokensPerChunk: options.maxTokensPerChunk || 6000,  // Safety buffer below 8192
        maxTokensPerBatch: options.maxTokensPerBatch || 300000,
        maxChunksPerBatch: options.maxChunksPerBatch || 2048
    };

    log(`=== Starting embedDirectoryStructure ===`)
    log(`Model: ${opts.model}, Dimensions: ${opts.dimensions || 'default'}`)
    log(`Limits: ${opts.maxTokensPerChunk} tokens/chunk, ${opts.maxTokensPerBatch} tokens/batch, ${opts.maxChunksPerBatch} chunks/batch`)

    // Phase 1: Collect all chunks
    log(`Phase 1: Collecting chunks from directory structure`)
    const allChunks = collectAllChunks(chunkedDir);

    // Count actual tokens using tiktoken
    log(`Counting tokens using tiktoken...`)
    const totalTokens = allChunks.reduce((sum, chunk) => sum + countTokens(chunk.content), 0);
    log(`Collected ${allChunks.length} chunks, ${totalTokens} actual tokens`)

    // Phase 2: Create batches (now uses tiktoken internally and splits oversized chunks)
    log(`Phase 2: Creating batches with automatic splitting`)
    const { batches, splitCount } = createBatches(allChunks, opts);

    // Phase 3: Generate embeddings
    log(`Phase 3: Generating embeddings`)
    const { embeddingMap, stats: embedStats } = await generateEmbeddingsForBatches(batches, opts);

    // Phase 4: Reconstruct tree
    log(`Phase 4: Reconstructing directory tree with embeddings`)
    const embeddedDirectory = addEmbeddingsToStructure(chunkedDir, embeddingMap);

    const stats: EmbedStats = {
        totalChunks: allChunks.length,
        totalBatches: batches.length,
        splitChunks: splitCount,
        totalTokens,
        successfulEmbeddings: embedStats.successfulEmbeddings,
        failedEmbeddings: embedStats.failedEmbeddings
    };

    log(`=== embedDirectoryStructure complete ===`)
    log(`Stats: ${stats.successfulEmbeddings} embeddings generated from ${stats.totalChunks} original chunks`)
    log(`Split ${stats.splitChunks} oversized chunks, ${stats.failedEmbeddings} failed`)
    log(`Total batches: ${stats.totalBatches}, Total tokens: ${stats.totalTokens}`)

    return { embeddedDirectory, stats };
}
