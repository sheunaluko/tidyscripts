/**
 * Core types and interfaces for the agent_io package
 */

/**
 * Standard result interface for all operations
 * @template T The type of data returned on success
 */
export interface OperationResult<T = any> {
  /** Whether the operation completed successfully */
  success: boolean;
  /** Data returned by the operation (if successful) */
  data?: T;
  /** Error message (if operation failed) */
  error?: string;
  /** Operation metadata for debugging and monitoring */
  metadata: {
    /** Name of the operation performed */
    operation: string;
    /** When the operation was executed */
    timestamp: Date;
    /** Time taken to execute the operation (in milliseconds) */
    executionTime: number;
    /** List of files that were affected by the operation */
    filesAffected?: string[];
    /** Number of lines processed during the operation */
    linesProcessed?: number;
  };
}

/**
 * Success result interface
 */
export interface SuccessResult<T> extends OperationResult<T> {
  success: true;
  data: T;
  error?: undefined;
}

/**
 * Error result interface
 */
export interface ErrorResult extends OperationResult<never> {
  success: false;
  data?: undefined;
  error: string;
}

/**
 * Options for file read operations
 */
export interface ReadFileOptions {
  /** Start reading from this line number (1-based) */
  startLine?: number;
  /** End reading at this line number (1-based, inclusive) */
  endLine?: number;
  /** File encoding (defaults to 'utf8') */
  encoding?: BufferEncoding;
}

/**
 * Options for file write operations
 */
export interface WriteFileOptions {
  /** File encoding (defaults to 'utf8') */
  encoding?: BufferEncoding;
  /** Create backup before writing */
  createBackup?: boolean;
  /** Backup file suffix (defaults to '.bak') */
  backupSuffix?: string;
}

/**
 * Options for file patch operations
 */
export interface PatchFileOptions {
  /** Create backup before patching */
  createBackup?: boolean;
  /** Backup file suffix (defaults to '.bak') */
  backupSuffix?: string;
}

/**
 * Options for directory listing operations
 */
export interface ListDirectoryOptions {
  /** Include subdirectories recursively */
  recursive?: boolean;
  /** Include hidden files (starting with .) */
  includeHidden?: boolean;
  /** Filter by file extensions (e.g., ['.ts', '.js']) */
  extensions?: string[];
  /** Maximum depth for recursive listing */
  maxDepth?: number;
}

/**
 * Options for search operations
 */
export interface SearchOptions {
  /** Use case-insensitive matching */
  ignoreCase?: boolean;
  /** Search in subdirectories recursively */
  recursive?: boolean;
  /** Include line numbers in results */
  includeLineNumbers?: boolean;
  /** Maximum number of matches to return */
  maxResults?: number;
  /** File extensions to search in */
  extensions?: string[];
  /** Number of context lines before and after matches */
  contextLines?: number;
}

/**
 * Result of a search operation
 */
export interface SearchMatch {
  /** File path where match was found */
  filePath: string;
  /** Line number (1-based) */
  lineNumber: number;
  /** The matched line content */
  line: string;
  /** Context lines before the match */
  contextBefore?: string[];
  /** Context lines after the match */
  contextAfter?: string[];
}

/**
 * Options for find and replace operations
 */
export interface FindReplaceOptions extends SearchOptions {
  /** Preview mode - don't actually replace, just show what would be replaced */
  preview?: boolean;
  /** Create backups before replacing */
  createBackups?: boolean;
}

/**
 * Result of a find and replace operation
 */
export interface FindReplaceResult {
  /** File path where replacements were made */
  filePath: string;
  /** Number of replacements made */
  replacements: number;
  /** Matches that were replaced (in preview mode, shows what would be replaced) */
  matches: SearchMatch[];
}

/**
 * File metadata information
 */
export interface FileMetadata {
  /** File path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Whether this is a regular file */
  isFile: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  modifiedAt: Date;
  /** Last access timestamp */
  accessedAt: Date;
  /** File permissions (Unix-style) */
  permissions: string;
}

/**
 * Patch operation type
 */
export type PatchOperation = 'insert' | 'delete' | 'replace';

/**
 * A single patch operation
 */
export interface PatchItem {
  /** Type of operation */
  operation: PatchOperation;
  /** Line number to operate on (1-based) */
  lineNumber: number;
  /** Content for insert/replace operations */
  content?: string;
  /** Number of lines to delete (for delete operations) */
  deleteCount?: number;
}

/**
 * Batch of patch operations
 */
export interface PatchBatch {
  /** Target file path */
  filePath: string;
  /** List of patch operations to perform */
  operations: PatchItem[];
}