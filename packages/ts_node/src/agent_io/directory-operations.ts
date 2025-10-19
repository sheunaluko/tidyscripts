/**
 * Directory operations for the agent_io package
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  OperationResult,
  ListDirectoryOptions,
  FileMetadata,
} from './types';
import {
  createResult,
  createSuccessResult,
  createErrorResult,
  validatePath,
  pathExists,
  hasExtension,
  measureTime,
} from './utils';

/**
 * Lists contents of a directory with filtering options
 * @param dirPath Path to the directory to list
 * @param options Listing options including recursion and filtering
 * @returns OperationResult containing array of file paths
 * @example
 * ```typescript
 * const result = await listDirectory('/path/to/dir', { 
 *   recursive: true, 
 *   extensions: ['.ts', '.js'],
 *   includeHidden: false 
 * });
 * if (result.success) {
 *   console.log('Found files:', result.data);
 * }
 * ```
 */
export async function listDirectory(
  dirPath: string,
  options: ListDirectoryOptions = {}
): Promise<OperationResult<string[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('listDirectory', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    const stats = await fs.stat(normalizedPath);
    if (!stats.isDirectory()) {
      return createErrorResult('listDirectory', `Path is not a directory: ${normalizedPath}`, startTime);
    }
    
    const { result: files } = await measureTime(() => 
      listDirectoryRecursive(normalizedPath, options, 0)
    );
    
    return createSuccessResult('listDirectory', files, startTime, [normalizedPath], files.length);
  } catch (error) {
    return createErrorResult(
      'listDirectory',
      `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Internal recursive directory listing function
 */
async function listDirectoryRecursive(
  dirPath: string,
  options: ListDirectoryOptions,
  currentDepth: number
): Promise<string[]> {
  const results: string[] = [];
  
  if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
    return results;
  }
  
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    // Skip hidden files unless explicitly requested
    if (!options.includeHidden && entry.name.startsWith('.')) {
      continue;
    }
    
    if (entry.isDirectory()) {
      if (options.recursive) {
        const subResults = await listDirectoryRecursive(fullPath, options, currentDepth + 1);
        results.push(...subResults);
      }
    } else if (entry.isFile()) {
      // Filter by extensions if specified
      if (hasExtension(fullPath, options.extensions || [])) {
        results.push(fullPath);
      }
    }
  }
  
  return results;
}

/**
 * Gets detailed metadata for all items in a directory
 * @param dirPath Path to the directory
 * @param options Listing options
 * @returns OperationResult containing array of FileMetadata objects
 * @example
 * ```typescript
 * const result = await getDirectoryMetadata('/path/to/dir', { recursive: false });
 * if (result.success) {
 *   result.data.forEach(item => {
 *     console.log(`${item.path}: ${item.size} bytes, modified ${item.modifiedAt}`);
 *   });
 * }
 * ```
 */
export async function getDirectoryMetadata(
  dirPath: string,
  options: ListDirectoryOptions = {}
): Promise<OperationResult<FileMetadata[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('getDirectoryMetadata', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    const { result: filePaths } = await measureTime(() => 
      listDirectoryRecursive(normalizedPath, { ...options, recursive: options.recursive || false }, 0)
    );
    
    const metadata: FileMetadata[] = [];
    
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        metadata.push({
          path: filePath,
          size: stats.size,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          accessedAt: stats.atime,
          permissions: `0${(stats.mode & parseInt('777', 8)).toString(8)}`,
        });
      } catch (error) {
        // Skip files that can't be accessed
        continue;
      }
    }
    
    return createSuccessResult('getDirectoryMetadata', metadata, startTime, [normalizedPath], metadata.length);
  } catch (error) {
    return createErrorResult(
      'getDirectoryMetadata',
      `Failed to get directory metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Searches for files matching a pattern in a directory
 * @param dirPath Directory to search in
 * @param pattern Glob-like pattern to match (supports * and ? wildcards)
 * @param options Search options
 * @returns OperationResult containing array of matching file paths
 * @example
 * ```typescript
 * const result = await searchFiles('/path/to/dir', '*.ts', { recursive: true });
 * if (result.success) {
 *   console.log('TypeScript files:', result.data);
 * }
 * ```
 */
export async function searchFiles(
  dirPath: string,
  pattern: string,
  options: ListDirectoryOptions = {}
): Promise<OperationResult<string[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('searchFiles', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    const { result: allFiles } = await measureTime(() => 
      listDirectoryRecursive(normalizedPath, { ...options, extensions: undefined }, 0)
    );
    
    const regex = globToRegex(pattern);
    const matchingFiles = allFiles.filter(filePath => {
      const fileName = path.basename(filePath);
      return regex.test(fileName);
    });
    
    // Apply extension filter if specified
    const filteredFiles = options.extensions 
      ? matchingFiles.filter(filePath => hasExtension(filePath, options.extensions!))
      : matchingFiles;
    
    return createSuccessResult('searchFiles', filteredFiles, startTime, [normalizedPath], filteredFiles.length);
  } catch (error) {
    return createErrorResult(
      'searchFiles',
      `Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Creates a new directory
 * @param dirPath Path of the directory to create
 * @param recursive Whether to create parent directories if they don't exist
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const result = await createDirectory('/path/to/new/dir', true);
 * if (result.success) {
 *   console.log('Directory created successfully');
 * }
 * ```
 */
export async function createDirectory(
  dirPath: string,
  recursive = false
): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (await pathExists(normalizedPath)) {
      const stats = await fs.stat(normalizedPath);
      if (stats.isDirectory()) {
        return createSuccessResult('createDirectory', undefined, startTime, [normalizedPath]);
      } else {
        return createErrorResult('createDirectory', `Path exists but is not a directory: ${normalizedPath}`, startTime);
      }
    }
    
    await measureTime(() => fs.mkdir(normalizedPath, { recursive }));
    
    return createSuccessResult('createDirectory', undefined, startTime, [normalizedPath]);
  } catch (error) {
    return createErrorResult(
      'createDirectory',
      `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Removes a directory
 * @param dirPath Path of the directory to remove
 * @param recursive Whether to remove directory contents recursively
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const result = await removeDirectory('/path/to/dir', true);
 * if (result.success) {
 *   console.log('Directory removed successfully');
 * }
 * ```
 */
export async function removeDirectory(
  dirPath: string,
  recursive = false
): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('removeDirectory', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    const stats = await fs.stat(normalizedPath);
    if (!stats.isDirectory()) {
      return createErrorResult('removeDirectory', `Path is not a directory: ${normalizedPath}`, startTime);
    }
    
    await measureTime(() => fs.rmdir(normalizedPath, { recursive }));
    
    return createSuccessResult('removeDirectory', undefined, startTime, [normalizedPath]);
  } catch (error) {
    return createErrorResult(
      'removeDirectory',
      `Failed to remove directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Checks if a directory is empty
 * @param dirPath Path to the directory to check
 * @returns OperationResult containing boolean indicating if directory is empty
 * @example
 * ```typescript
 * const result = await isDirectoryEmpty('/path/to/dir');
 * if (result.success) {
 *   console.log('Directory is empty:', result.data);
 * }
 * ```
 */
export async function isDirectoryEmpty(dirPath: string): Promise<OperationResult<boolean>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('isDirectoryEmpty', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    const stats = await fs.stat(normalizedPath);
    if (!stats.isDirectory()) {
      return createErrorResult('isDirectoryEmpty', `Path is not a directory: ${normalizedPath}`, startTime);
    }
    
    const { result: entries } = await measureTime(() => fs.readdir(normalizedPath));
    const isEmpty = entries.length === 0;
    
    return createSuccessResult('isDirectoryEmpty', isEmpty, startTime, [normalizedPath]);
  } catch (error) {
    return createErrorResult(
      'isDirectoryEmpty',
      `Failed to check if directory is empty: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Converts a glob pattern to a regular expression
 * @param pattern Glob pattern with * and ? wildcards
 * @returns Regular expression that matches the pattern
 */
function globToRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
    .replace(/\*/g, '.*')                  // Convert * to .*
    .replace(/\?/g, '.');                  // Convert ? to .
  
  return new RegExp(`^${regexPattern}$`, 'i');
}