/**
 * Query Operations for Generic Hierarchical Embedder
 *
 * Provides vector similarity search functionality for embedded directory structures.
 * Takes user queries, generates embeddings, and retrieves relevant chunks from the database.
 */

import * as common from "tidyscripts_common"
import Surreal from 'surrealdb'
import OpenAI from 'openai'
import { get_database } from './database'

const log = common.logger.get_logger({ id: "ghe_query" })

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * A chunk result from similarity search
 */
export interface ChunkResult {
    id: string;              // Record ID (e.g., "chunk:abc123")
    projectId: string;       // Project this chunk belongs to
    fileId: string;          // File containing this chunk
    filePath?: string;       // File path (from file_node join)
    fileName?: string;       // File name (from file_node join)
    content: string;         // Chunk content
    contentHash: string;     // Content hash
    startChar: number;       // Start character position
    endChar: number;         // End character position
    startLine: number;       // Start line number
    endLine: number;         // End line number
    embeddingId: string;     // Reference to embedding_store
}

/**
 * Similarity search result with relevance score
 */
export interface SimilarityResult {
    chunk: ChunkResult;
    similarity: number;      // Cosine similarity score (0-1)
    filePath: string;        // Full file path for context
    fileName: string;        // File name for display
}

/**
 * Options for similarity search
 */
export interface SimilaritySearchOptions {
    limit?: number;          // Maximum number of results (default: 10)
    threshold?: number;      // Minimum similarity score (default: 0.5)
    projectId?: string;      // Filter by specific project
    fileExtensions?: string[]; // Filter by file extensions (e.g., ['.ts', '.js'])
    model?: string;          // Embedding model (default: 'text-embedding-3-small')
    dimensions?: number;     // Embedding dimensions (default: 1536)
}

/**
 * Formatted context for agent consumption
 */
export interface AgentContext {
    query: string;
    totalResults: number;
    results: ContextBlock[];
    generatedAt: Date;
}

/**
 * Individual context block for a chunk
 */
export interface ContextBlock {
    relevanceScore: number;  // 0-1 similarity
    filePath: string;
    fileName: string;
    lineRange: string;       // e.g., "lines 42-58"
    content: string;
    metadata: {
        chunkId: string;
        projectId: string;
        contentHash: string;
    };
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate an embedding for a query string
 * Uses OpenAI's text-embedding-3-small model
 */
export async function generateQueryEmbedding(
    query: string,
    model: string = 'text-embedding-3-small'
): Promise<number[]> {
    log(`Generating embedding for query: "${query.substring(0, 100)}..."`);

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    try {
        const response = await openai.embeddings.create({
            model: model,
            input: query,
            encoding_format: 'float',
        });

        const embedding = response.data[0].embedding;
        log(`Generated embedding with ${embedding.length} dimensions`);
        return embedding;

    } catch (error) {
        log(`ERROR: Failed to generate embedding: ${error}`);
        throw new Error(`Failed to generate embedding: ${error}`);
    }
}

// ============================================================================
// Vector Similarity Search
// ============================================================================

/**
 * Search for chunks similar to a query using vector similarity
 *
 * Uses SurrealDB's built-in vector search with KNN operator for efficiency.
 *
 * Process:
 * 1. Generate embedding for the query
 * 2. Use SurrealDB's <|limit,COSINE|> operator to find nearest neighbors
 * 3. Join with chunk table to get chunk content and metadata
 * 4. Filter by threshold and optional filters (project, file extension)
 * 5. Enrich with file metadata
 *
 * @param query - Natural language query string
 * @param options - Search options (limit, threshold, filters)
 * @returns Array of similarity results sorted by relevance
 *
 * @example
 * const results = await searchBySimilarity(
 *   "function that validates user input",
 *   { limit: 5, threshold: 0.3, projectId: "project:abc123" }
 * );
 */
export async function searchBySimilarity(
    query: string,
    options: SimilaritySearchOptions = {}
): Promise<SimilarityResult[]> {
    const {
        limit = 10,
        threshold = 0.3,
        projectId = null,
        fileExtensions = null,
        model = 'text-embedding-3-small',
        dimensions = 1536
    } = options;

    log(`=== Starting similarity search ===`);
    log(`Query: "${query}"`);
    log(`Limit: ${limit}, Threshold: ${threshold}`);

    const db = await get_database();
    const startTime = Date.now();

    // STEP 1: Generate embedding for query
    const embeddingStart = Date.now();
    const queryEmbedding = await generateQueryEmbedding(query, model);
    log(`⏱️ Embedding generation: ${Date.now() - embeddingStart}ms`);

    // STEP 2: Use SurrealDB's vector search operator to find similar embeddings
    // The <|limit,COSINE|> operator uses the HNSW index for fast KNN search
    const vectorSearchQuery = `
        SELECT
            id as embeddingId,
            contentHash,
            vector::distance::knn() as dist
        FROM embedding_store
        WHERE vector <|${limit * 3},COSINE|> $queryEmbedding
        ORDER BY dist ASC
    `;

    log(`Searching for similar embeddings using KNN...`);
    const vectorSearchStart = Date.now();
    const embeddingResults = await db.query<[Array<{ embeddingId: string; contentHash: string; dist: number }>]>(
        vectorSearchQuery,
        { queryEmbedding }
    );

    const embeddings = embeddingResults?.[0] || [];
    log(`⏱️ Vector search: ${Date.now() - vectorSearchStart}ms`);
    log(`Found ${embeddings.length} similar embeddings`);

    if (embeddings.length === 0) {
        log('No similar embeddings found');
        return [];
    }

    // STEP 3: Get chunks that use these embeddings, with file metadata joined
    const contentHashes = embeddings.map(e => e.contentHash);

    let chunkQuery = `
        SELECT
            id,
            projectId,
            fileId,
            content,
            contentHash,
            startChar,
            endChar,
            startLine,
            endLine,
            fileId.path AS filePath,
            fileId.name AS fileName
        FROM chunk
        WHERE contentHash IN $contentHashes
    `;

    const queryParams: any = { contentHashes };

    // Add project filter if specified
    if (projectId) {
        chunkQuery += ` AND projectId = $projectId`;
        queryParams.projectId = projectId;
    }

    log(`Fetching matching chunks with file metadata...`);
    const chunkQueryStart = Date.now();
    const chunksResult = await db.query<[ChunkResult[]]>(chunkQuery, queryParams);
    const chunks = chunksResult?.[0] || [];
    log(`⏱️ Chunk query: ${Date.now() - chunkQueryStart}ms`);
    log(`Retrieved ${chunks.length} chunks (from ${embeddings.length} unique embeddings)`);

    // STEP 4: Match chunks with their distances and convert to similarity
    const processingStart = Date.now();
    const results: SimilarityResult[] = [];

    for (const chunk of chunks) {
        // Find the embedding distance for this chunk
        const embedding = embeddings.find(e => e.contentHash === chunk.contentHash);
        if (!embedding) continue;

        // Convert distance to similarity (distance is 0-2 for cosine, similarity is 0-1)
        // For cosine: distance = 1 - similarity, so similarity = 1 - distance
        const similarity = 1 - embedding.dist;

        // Filter by threshold
        if (similarity < threshold) {
            continue;
        }

        // File metadata already joined in query (fileId.path, fileId.name)
        const filePath = chunk.filePath || 'unknown';
        const fileName = chunk.fileName || 'unknown';

        // Apply file extension filter if specified
        if (fileExtensions && fileExtensions.length > 0) {
            const matchesExtension = fileExtensions.some(ext => filePath.endsWith(ext));
            if (!matchesExtension) {
                continue;
            }
        }

        results.push({
            chunk,
            similarity,
            filePath,
            fileName
        });
    }

    log(`⏱️ Processing/filtering: ${Date.now() - processingStart}ms`);

    // STEP 5: Sort by similarity (highest first) and limit
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);

    log(`=== Search complete ===`);
    log(`⏱️ Total time: ${Date.now() - startTime}ms`);
    log(`Found ${results.length} results above threshold`);
    log(`Returning top ${limitedResults.length} results`);

    return limitedResults;
}

// ============================================================================
// Context Formatting
// ============================================================================

/**
 * Convert similarity results to formatted text context for agent consumption
 *
 * @param query - Original user query
 * @param results - Similarity search results
 * @returns Formatted context object with text blocks
 *
 * @example
 * const results = await searchBySimilarity("validate email address", { limit: 3 });
 * const context = formatAsAgentContext("validate email address", results);
 * console.log(context.results[0].content);
 */
export function formatAsAgentContext(
    query: string,
    results: SimilarityResult[]
): AgentContext {
    const contextBlocks: ContextBlock[] = results.map(result => ({
        relevanceScore: result.similarity,
        filePath: result.filePath,
        fileName: result.fileName,
        lineRange: `lines ${result.chunk.startLine}-${result.chunk.endLine}`,
        content: result.chunk.content,
        metadata: {
            chunkId: result.chunk.id,
            projectId: result.chunk.projectId,
            contentHash: result.chunk.contentHash
        }
    }));

    return {
        query,
        totalResults: results.length,
        results: contextBlocks,
        generatedAt: new Date()
    };
}

/**
 * Convert agent context to human-readable Markdown string
 *
 * @param context - Formatted agent context
 * @returns Markdown-formatted string
 *
 * @example
 * const context = formatAsAgentContext("query", results);
 * const markdown = contextToMarkdown(context);
 * console.log(markdown);
 */
export function contextToMarkdown(context: AgentContext): string {
    const lines: string[] = [];

    lines.push(`# Code Context`);
    lines.push(``);
    lines.push(`**Query:** "${context.query}"`);
    lines.push(`**Results:** ${context.totalResults}`);
    lines.push(`**Generated:** ${context.generatedAt.toISOString()}`);
    lines.push(``);

    for (let i = 0; i < context.results.length; i++) {
        const block = context.results[i];
        const relevance = (block.relevanceScore * 100).toFixed(1);

        lines.push(`---`);
        lines.push(``);
        lines.push(`## Result ${i + 1} - ${block.fileName} (${relevance}% relevant)`);
        lines.push(``);
        lines.push(`**File:** \`${block.filePath}\``);
        lines.push(`**Location:** ${block.lineRange}`);
        lines.push(``);
        lines.push(`\`\`\``);
        lines.push(block.content);
        lines.push(`\`\`\``);
        lines.push(``);
    }

    return lines.join('\n');
}

/**
 * Convert agent context to plain text (no markdown)
 *
 * @param context - Formatted agent context
 * @returns Plain text string
 */
export function contextToPlainText(context: AgentContext): string {
    const lines: string[] = [];

    lines.push(`CODE CONTEXT`);
    lines.push(`Query: "${context.query}"`);
    lines.push(`Results: ${context.totalResults}`);
    lines.push(``);

    for (let i = 0; i < context.results.length; i++) {
        const block = context.results[i];
        const relevance = (block.relevanceScore * 100).toFixed(1);

        lines.push(`--- Result ${i + 1} (${relevance}% relevant) ---`);
        lines.push(`File: ${block.filePath}`);
        lines.push(`Location: ${block.lineRange}`);
        lines.push(``);
        lines.push(block.content);
        lines.push(``);
    }

    return lines.join('\n');
}

// ============================================================================
// High-Level Query API
// ============================================================================

/**
 * Complete query pipeline: search + format
 *
 * Takes a user query, searches for similar chunks, and returns formatted context.
 * This is the main entry point for most use cases.
 *
 * @param query - Natural language query
 * @param options - Search options
 * @returns Formatted agent context
 *
 * @example
 * const context = await queryForContext(
 *   "How do I connect to the database?",
 *   { limit: 5, threshold: 0.6 }
 * );
 * console.log(contextToMarkdown(context));
 */
export async function queryForContext(
    query: string,
    options: SimilaritySearchOptions = {}
): Promise<AgentContext> {
    log(`=== Query for context: "${query}" ===`);

    const results = await searchBySimilarity(query, options);
    const context = formatAsAgentContext(query, results);

    log(`Generated context with ${context.totalResults} results`);

    return context;
}

/**
 * Query and return as markdown string
 * Convenience function for direct markdown output
 *
 * @param query - Natural language query
 * @param options - Search options
 * @returns Markdown-formatted context string
 *
 * @example
 * const markdown = await queryForMarkdown("authentication logic", { limit: 3 });
 * console.log(markdown);
 */
export async function queryForMarkdown(
    query: string,
    options: SimilaritySearchOptions = {}
): Promise<string> {
    const context = await queryForContext(query, options);
    return contextToMarkdown(context);
}

/**
 * Query and return as plain text
 * Convenience function for plain text output
 *
 * @param query - Natural language query
 * @param options - Search options
 * @returns Plain text context string
 *
 * @example
 * const text = await queryForPlainText("error handling", { limit: 5 });
 * console.log(text);
 */
export async function queryForPlainText(
    query: string,
    options: SimilaritySearchOptions = {}
): Promise<string> {
    const context = await queryForContext(query, options);
    return contextToPlainText(context);
}
