import * as io from "../io"

/**
 * Represents a file node in the hierarchy (no content)
 */
export interface FileNode {
    type: "file";
    path: string;
    name: string;
}

/**
 * Represents a directory node in the hierarchy with its children
 */
export interface DirectoryNode {
    type: "directory";
    path: string;
    name: string;
    children: HierarchicalNode[];
}

/**
 * Union type for either a file or directory node
 */
export type HierarchicalNode = FileNode | DirectoryNode;

/**
 * Options for directory structure traversal
 */
export interface DirectoryStructureOptions {
    includeHidden?: boolean;      // include hidden files/dirs (default: false)
    fileExtensions?: string[];    // only include files with these extensions (default: all)
    maxDepth?: number;            // max recursion depth (default: unlimited)
}

/**
 * Recursively builds a hierarchical representation of a directory structure
 *
 * @param rootPath - Absolute path to start directory
 * @param options - Traversal options
 * @returns Hierarchical structure of files and directories (no file content)
 *
 * @example
 * const structure = getDirectoryStructure('/path/to/project', {
 *   includeHidden: false,
 *   fileExtensions: ['.ts', '.js'],
 *   maxDepth: 5
 * });
 */
export function getDirectoryStructure(
    rootPath: string,
    options: DirectoryStructureOptions = {}
): DirectoryNode {
    const {
        includeHidden = false,
        fileExtensions = undefined,
        maxDepth = Infinity
    } = options;

    return getDirectoryStructureHelper(rootPath, includeHidden, fileExtensions, 0, maxDepth);
}

/**
 * Helper function for recursive directory traversal
 */
function getDirectoryStructureHelper(
    currentPath: string,
    includeHidden: boolean,
    fileExtensions: string[] | undefined,
    currentDepth: number,
    maxDepth: number
): DirectoryNode {
    const name = io.path.basename(currentPath);

    // Check if we've reached max depth
    if (currentDepth >= maxDepth) {
        return {
            type: "directory",
            path: currentPath,
            name,
            children: []
        };
    }

    // Read directory contents
    const entries = includeHidden
        ? io.read_sorted_full_paths(currentPath)
        : io.read_nonhidden_subfiles(currentPath);

    const children: HierarchicalNode[] = [];

    for (const entryPath of entries) {
        try {
            const stat = io.fs.statSync(entryPath);

            if (stat.isDirectory()) {
                // Recursively process subdirectory
                children.push(
                    getDirectoryStructureHelper(
                        entryPath,
                        includeHidden,
                        fileExtensions,
                        currentDepth + 1,
                        maxDepth
                    )
                );
            } else if (stat.isFile()) {
                // Check file extension filter
                if (fileExtensions) {
                    const ext = io.path.extname(entryPath);
                    if (!fileExtensions.includes(ext)) {
                        continue;
                    }
                }

                // Add file node (no content)
                children.push({
                    type: "file",
                    path: entryPath,
                    name: io.path.basename(entryPath)
                });
            }
        } catch (error) {
            // Skip files/directories that can't be accessed
            console.warn(`Failed to access: ${entryPath}`, error);
        }
    }

    return {
        type: "directory",
        path: currentPath,
        name,
        children
    };
}

/**
 * Produces a set of all unique file extensions found in a directory structure
 *
 * @param directoryNode - The directory structure to analyze
 * @returns Set of file extensions (including the dot, e.g., '.ts', '.js')
 *          Files without extensions are represented as 'none'
 *
 * @example
 * const structure = getDirectoryStructure('/path/to/project');
 * const fileTypes = produceFileTypeSet(structure);
 * console.log(fileTypes); // Set { '.ts', '.js', '.json', '.md', 'none' }
 */
export function produceFileTypeSet(directoryNode: DirectoryNode): Set<string> {
    const fileTypes = new Set<string>();

    function traverse(node: HierarchicalNode): void {
        if (node.type === "file") {
            const ext = io.path.extname(node.path);
            fileTypes.add(ext || 'none');
        } else {
            // Directory - recursively traverse children
            node.children.forEach(traverse);
        }
    }

    traverse(directoryNode);
    return fileTypes;
}
