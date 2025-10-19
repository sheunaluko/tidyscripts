/**
 * AI Agent I/O Package
 * 
 * A comprehensive TypeScript library providing file system operation primitives
 * optimized for AI agents to develop code autonomously on local systems.
 * 
 * Features:
 * - File operations (read, write, patch, copy, move, delete)
 * - Directory operations (list, search, create, remove)
 * - Content search operations with regex support
 * - Find and replace across files
 * - Comprehensive error handling and metadata tracking
 * - Token-optimized output with line numbers and ranges
 * - Cross-platform compatibility
 * 
 * @example
 * ```typescript
 * import { files, directories, search } from './agent_io';
 * 
 * // Read a file with line range
 * const content = await files.readFile('/path/to/file.ts', { startLine: 10, endLine: 20 });
 * 
 * // Search for functions in a directory
 * const results = await search.searchCodeConstructs('/src', 'function', 'getUserData');
 * 
 * // List TypeScript files recursively
 * const tsFiles = await directories.listDirectory('/src', { 
 *   recursive: true, 
 *   extensions: ['.ts'] 
 * });
 * ```
 */

// Re-export all types for convenient access
export * from './types';

// Export file operations namespace
export * as files from './file-operations';

// Export directory operations namespace
export * as directories from './directory-operations';

// Export search operations namespace
export * as search from './search-operations';

// Export utilities for advanced usage
export * as utils from './utils';

// Re-export commonly used types for convenience
export type {
  OperationResult,
  ReadFileOptions,
  WriteFileOptions,
  PatchFileOptions,
  ListDirectoryOptions,
  SearchOptions,
  FindReplaceOptions,
  SearchMatch,
  FindReplaceResult,
  FileMetadata,
  PatchBatch,
  PatchItem,
} from './types';