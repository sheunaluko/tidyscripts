import { chunkFile, FileChunk } from "./file_chunker"
import { DirectoryNode, HierarchicalNode } from "./directory_structure"

/**
 * Represents a chunked file node with its chunks
 */
export interface ChunkedFileNode {
    type: "file";
    path: string;
    name: string;
    chunks: FileChunk[];
}

/**
 * Represents a chunked directory node with its children
 */
export interface ChunkedDirectoryNode {
    type: "directory";
    path: string;
    name: string;
    children: ChunkedHierarchicalNode[];
}

/**
 * Union type for either a chunked file or directory node
 */
export type ChunkedHierarchicalNode = ChunkedFileNode | ChunkedDirectoryNode;

/**
 * Chunks all files in a directory structure tree.
 * Returns a new tree with chunks added to all file nodes (immutable).
 *
 * @param structure - Directory structure from getDirectoryStructure()
 * @param delimiter - Regex pattern to split files (default: 2+ newlines). Must have 'g' flag.
 * @param maxTokensPerChunk - Optional maximum tokens per chunk (will split if exceeded)
 * @param charsPerToken - Characters per token estimate (default: 2.5 for code)
 * @returns New hierarchical structure with chunks added to file nodes
 *
 * @example
 * const structure = getDirectoryStructure('/path/to/dir');
 * const chunked = chunkDirectoryStructure(structure);
 *
 * @example
 * // With size limits for embedding
 * const chunked = chunkDirectoryStructure(structure, /\n{3,}/g, 6000, 2.5);
 */
export function chunkDirectoryStructure(
    structure: DirectoryNode,
    delimiter: RegExp = /\n{2,}/g,
    maxTokensPerChunk?: number,
    charsPerToken: number = 2.5
): ChunkedDirectoryNode {
    return chunkNode(structure, delimiter, maxTokensPerChunk, charsPerToken) as ChunkedDirectoryNode;
}

/**
 * Helper function to recursively chunk a node (file or directory)
 */
function chunkNode(
    node: HierarchicalNode,
    delimiter: RegExp,
    maxTokensPerChunk?: number,
    charsPerToken: number = 2.5
): ChunkedHierarchicalNode {
    if (node.type === "file") {
        // Chunk the file and return new file node with chunks
        try {
            const chunks = chunkFile(node.path, delimiter, maxTokensPerChunk, charsPerToken);
            return {
                type: "file",
                path: node.path,
                name: node.name,
                chunks
            };
        } catch (error) {
            // If chunking fails, return empty chunks array
            console.warn(`Failed to chunk file: ${node.path}`, error);
            return {
                type: "file",
                path: node.path,
                name: node.name,
                chunks: []
            };
        }
    } else {
        // Directory node - recursively process all children
        return {
            type: "directory",
            path: node.path,
            name: node.name,
            children: node.children.map(child => chunkNode(child, delimiter, maxTokensPerChunk, charsPerToken))
        };
    }
}
