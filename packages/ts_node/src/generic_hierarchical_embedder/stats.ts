import { ChunkedDirectoryNode, ChunkedHierarchicalNode } from "./chunk_directory_structure"

/**
 * Statistics about a chunked directory structure
 */
export interface ChunkStats {
    numFiles: number;
    numDirectories: number;
    numChunks: number;
    totalCharacters: number;
    estimatedTokens: number;
    estimatedCost: number;
}

/**
 * Options for calculating chunk statistics
 */
export interface ChunkStatsOptions {
    /**
     * Average number of characters per token (default: 4)
     * This is a rough estimate - actual tokenization varies by content
     */
    charsPerToken?: number;

    /**
     * Cost per token in dollars (default: 0.00000002)
     * Default is based on OpenAI text-embedding-3-small pricing ($0.02 per 1M tokens)
     * Adjust based on your embedding provider's pricing
     */
    costPerToken?: number;
}

/**
 * Calculates statistics for a chunked directory structure.
 *
 * Recursively traverses the chunked directory tree and computes:
 * - Number of files and directories
 * - Total number of chunks across all files
 * - Total characters in all chunks
 * - Estimated token count (based on chars/token ratio)
 * - Estimated embedding cost (based on cost per token)
 *
 * @param chunkedDirectory - The chunked directory structure from chunkDirectoryStructure() or recursively_chunk_directory()
 * @param options - Options for token and cost estimation
 * @param options.charsPerToken - Average characters per token (default: 4)
 * @param options.costPerToken - Cost per token in dollars (default: 0.00000002, OpenAI text-embedding-3-small)
 * @returns Statistics object with counts and cost estimates
 *
 * @example
 * const chunked = recursively_chunk_directory('/path/to/project');
 * const stats = getChunkStats(chunked);
 * console.log(`Files: ${stats.numFiles}, Chunks: ${stats.numChunks}`);
 * console.log(`Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
 *
 * @example
 * // Custom pricing for OpenAI text-embedding-3-small ($0.00002 per 1K tokens)
 * const stats = getChunkStats(chunked, {
 *   charsPerToken: 4,
 *   costPerToken: 0.00002 / 1000
 * });
 */
export function getChunkStats(
    chunkedDirectory: ChunkedDirectoryNode,
    options: ChunkStatsOptions = {}
): ChunkStats {
    const {
        charsPerToken = 4,
        costPerToken = 0.00000002  // OpenAI text-embedding-3-small: $0.02 per 1M tokens
    } = options;

    // Initialize counters
    const stats: ChunkStats = {
        numFiles: 0,
        numDirectories: 0,
        numChunks: 0,
        totalCharacters: 0,
        estimatedTokens: 0,
        estimatedCost: 0
    };

    // Recursively traverse and accumulate stats
    traverseAndCount(chunkedDirectory, stats);

    // Calculate token and cost estimates
    stats.estimatedTokens = Math.ceil(stats.totalCharacters / charsPerToken);
    stats.estimatedCost = stats.estimatedTokens * costPerToken;

    return stats;
}

/**
 * Helper function to recursively traverse the tree and accumulate statistics
 */
function traverseAndCount(
    node: ChunkedHierarchicalNode,
    stats: ChunkStats
): void {
    if (node.type === "file") {
        // Count the file
        stats.numFiles++;

        // Count chunks and characters
        stats.numChunks += node.chunks.length;

        for (const chunk of node.chunks) {
            stats.totalCharacters += chunk.content.length;
        }
    } else {
        // Count the directory
        stats.numDirectories++;

        // Recursively process all children
        for (const child of node.children) {
            traverseAndCount(child, stats);
        }
    }
}
