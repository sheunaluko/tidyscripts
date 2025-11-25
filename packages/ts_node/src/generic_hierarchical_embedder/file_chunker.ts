import * as io from "../io"

/**
 * Represents a chunk of text from a file with its original position
 */
export interface FileChunk {
    filePath: string;   // absolute path to the source file
    content: string;
    startChar: number;  // starting character position in original file
    endChar: number;    // ending character position in original file
    startLine: number;  // starting line number (1-indexed)
    endLine: number;    // ending line number (1-indexed)
}

/**
 * Builds an index of line start positions in the content
 * @param content - The file content
 * @returns Array where each element is the character position where that line starts
 */
function buildLineIndex(content: string): number[] {
    const lineStarts = [0];  // Line 1 starts at character position 0
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n') {
            lineStarts.push(i + 1);  // Next line starts after the newline
        }
    }
    return lineStarts;
}

/**
 * Converts a character position to a line number
 * @param charPos - Character position in the file
 * @param lineStarts - Array of line start positions
 * @returns Line number (1-indexed)
 */
function charPosToLine(charPos: number, lineStarts: number[]): number {
    for (let i = 1; i < lineStarts.length; i++) {
        if (charPos < lineStarts[i]) {
            return i;  // Lines are 1-indexed
        }
    }
    return lineStarts.length;
}

/**
 * Chunks a file based on a delimiter regex pattern.
 * Returns chunks with their original positions in the file.
 *
 * If maxTokensPerChunk is specified, oversized chunks will be automatically
 * split to ensure all chunks can be embedded.
 *
 * @param filePath - Absolute path to the file to chunk
 * @param delimiter - Regex pattern to split on (default: 2+ newlines). Must have 'g' flag.
 * @param maxTokensPerChunk - Optional maximum tokens per chunk (will split if exceeded)
 * @param charsPerToken - Characters per token estimate (default: 2.5 for code)
 * @returns Array of chunks with content and position information
 *
 * @example
 * // Split on double newlines
 * const chunks = chunkFile('/path/to/file.txt');
 *
 * @example
 * // Split on custom pattern with size limit
 * const chunks = chunkFile('/path/to/file.txt', /---+/g, 6000, 2.5);
 */
export function chunkFile(
    filePath: string,
    delimiter: RegExp = /\n{2,}/g,
    maxTokensPerChunk?: number,
    charsPerToken: number = 2.5
): FileChunk[] {
    // Ensure the regex has the global flag
    if (!delimiter.global) {
        throw new Error("Delimiter regex must have the 'g' (global) flag");
    }

    // Read the entire file as text
    const content = io.read_file(filePath);

    // Build line index for character position to line number conversion
    const lineStarts = buildLineIndex(content);

    // Find all delimiter matches with their positions
    const matches = Array.from(content.matchAll(delimiter));

    // Build chunks from the gaps between delimiters
    const chunks: FileChunk[] = [];
    let lastEnd = 0;

    for (const match of matches) {
        const delimiterStart = match.index!;
        const delimiterEnd = delimiterStart + match[0].length;

        // Extract chunk before this delimiter
        if (lastEnd < delimiterStart) {
            chunks.push({
                filePath,
                content: content.slice(lastEnd, delimiterStart),
                startChar: lastEnd,
                endChar: delimiterStart,
                startLine: charPosToLine(lastEnd, lineStarts),
                endLine: charPosToLine(delimiterStart, lineStarts)
            });
        }

        lastEnd = delimiterEnd;
    }

    // Add final chunk after last delimiter (if any content remains)
    if (lastEnd < content.length) {
        chunks.push({
            filePath,
            content: content.slice(lastEnd),
            startChar: lastEnd,
            endChar: content.length,
            startLine: charPosToLine(lastEnd, lineStarts),
            endLine: charPosToLine(content.length, lineStarts)
        });
    }

    // If maxTokensPerChunk is specified, split any oversized chunks
    if (maxTokensPerChunk) {
        const finalChunks: FileChunk[] = [];

        for (const chunk of chunks) {
            const subChunks = split_chunk(chunk, maxTokensPerChunk, charsPerToken);
            finalChunks.push(...subChunks);
        }

        return finalChunks;
    }

    return chunks;
}

/**
 * Splits a chunk that exceeds a token limit into smaller sub-chunks
 *
 * Uses a simple recursive strategy of splitting in half until all
 * pieces are under the token limit. This prevents chunks from being
 * rejected by the embedding API due to size constraints.
 *
 * @param chunk - Chunk to split
 * @param maxTokens - Maximum tokens allowed per chunk
 * @param charsPerToken - Estimated characters per token (default: 2.5 for code)
 * @returns Array of sub-chunks that fit within token limit
 *
 * @example
 * // Split a chunk that's too large
 * const oversized = { content: "very long content...", ... };
 * const subChunks = split_chunk(oversized, 6000, 2.5);
 * // Returns array of smaller chunks, each under 6000 tokens
 */
export function split_chunk(
    chunk: FileChunk,
    maxTokens: number,
    charsPerToken: number = 2.5
): FileChunk[] {
    const estimatedTokens = Math.ceil(chunk.content.length / charsPerToken);

    // Base case: chunk is small enough
    if (estimatedTokens <= maxTokens) {
        return [chunk];
    }

    // Recursive case: split in half
    const midpoint = Math.floor(chunk.content.length / 2);
    const midChar = chunk.startChar + midpoint;

    // Calculate which line the midpoint falls on
    const contentBeforeMid = chunk.content.slice(0, midpoint);
    const newlinesBeforeMid = (contentBeforeMid.match(/\n/g) || []).length;
    const midLine = chunk.startLine + newlinesBeforeMid;

    // Create two sub-chunks
    const firstHalf: FileChunk = {
        filePath: chunk.filePath,
        content: chunk.content.slice(0, midpoint),
        startChar: chunk.startChar,
        endChar: midChar,
        startLine: chunk.startLine,
        endLine: midLine
    };

    const secondHalf: FileChunk = {
        filePath: chunk.filePath,
        content: chunk.content.slice(midpoint),
        startChar: midChar,
        endChar: chunk.endChar,
        startLine: midLine,
        endLine: chunk.endLine
    };

    // Recursively split each half if needed
    const firstHalfChunks = split_chunk(firstHalf, maxTokens, charsPerToken);
    const secondHalfChunks = split_chunk(secondHalf, maxTokens, charsPerToken);

    return [...firstHalfChunks, ...secondHalfChunks];
}
