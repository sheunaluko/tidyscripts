/**
 * File operations for the agent_io package
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  OperationResult,
  ReadFileOptions,
  WriteFileOptions,
  PatchFileOptions,
  PatchBatch,
  PatchItem,
  FileMetadata,
} from './types';
import {
  createResult,
  createSuccessResult,
  createErrorResult,
  validatePath,
  pathExists,
  createBackup,
  extractLineRange,
  splitLines,
  joinLines,
  measureTime,
} from './utils';

/**
 * Reads a file with optional line range and encoding options
 * @param filePath Path to the file to read
 * @param options Read options including line range and encoding
 * @returns OperationResult containing file content or lines
 * @example
 * ```typescript
 * const result = await readFile('/path/to/file.txt', { startLine: 10, endLine: 20 });
 * if (result.success) {
 *   console.log('Lines 10-20:', result.data);
 * }
 * ```
 */
export async function readFile(
  filePath: string,
  options: ReadFileOptions = {}
): Promise<OperationResult<string | string[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(filePath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('readFile', `File not found: ${normalizedPath}`, startTime);
    }
    
    const { result: content } = await measureTime(() => 
      fs.readFile(normalizedPath, { encoding: options.encoding || 'utf8' })
    );
    
    if (options.startLine || options.endLine) {
      const lines = extractLineRange(content, options.startLine, options.endLine);
      return createSuccessResult(
        'readFile',
        lines,
        startTime,
        [normalizedPath],
        lines.length
      );
    }
    
    const lineCount = splitLines(content).length;
    return createSuccessResult('readFile', content, startTime, [normalizedPath], lineCount);
  } catch (error) {
    return createErrorResult(
      'readFile',
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Writes content to a file with optional backup creation
 * @param filePath Path to the file to write
 * @param content Content to write to the file
 * @param options Write options including encoding and backup settings
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const result = await writeFile('/path/to/file.txt', 'Hello World', { createBackup: true });
 * if (result.success) {
 *   console.log('File written successfully');
 * }
 * ```
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: WriteFileOptions = {}
): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(filePath);
    const filesAffected = [normalizedPath];
    
    // Create backup if requested and file exists
    if (options.createBackup && await pathExists(normalizedPath)) {
      const backupPath = await createBackup(normalizedPath, options.backupSuffix);
      filesAffected.push(backupPath);
    }
    
    await measureTime(() => 
      fs.writeFile(normalizedPath, content, { encoding: options.encoding || 'utf8' })
    );
    
    const lineCount = splitLines(content).length;
    return createSuccessResult('writeFile', undefined, startTime, filesAffected, lineCount);
  } catch (error) {
    return createErrorResult(
      'writeFile',
      `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Applies a batch of patch operations to a file
 * @param patchBatch Batch of patch operations to apply
 * @param options Patch options including backup settings
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const patchBatch = {
 *   filePath: '/path/to/file.txt',
 *   operations: [
 *     { operation: 'insert', lineNumber: 5, content: 'New line' },
 *     { operation: 'replace', lineNumber: 10, content: 'Replaced line' },
 *     { operation: 'delete', lineNumber: 15, deleteCount: 2 }
 *   ]
 * };
 * const result = await patchFile(patchBatch, { createBackup: true });
 * ```
 */
export async function patchFile(
  patchBatch: PatchBatch,
  options: PatchFileOptions = {}
): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(patchBatch.filePath);
    const filesAffected = [normalizedPath];
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('patchFile', `File not found: ${normalizedPath}`, startTime);
    }
    
    // Create backup if requested
    if (options.createBackup) {
      const backupPath = await createBackup(normalizedPath, options.backupSuffix);
      filesAffected.push(backupPath);
    }
    
    // Read the file
    const content = await fs.readFile(normalizedPath, 'utf8');
    let lines = splitLines(content);
    
    // Sort operations by line number in descending order to avoid index shifting issues
    const sortedOps = [...patchBatch.operations].sort((a, b) => b.lineNumber - a.lineNumber);
    
    let linesProcessed = 0;
    
    for (const op of sortedOps) {
      const lineIndex = op.lineNumber - 1; // Convert to 0-based index
      
      switch (op.operation) {
        case 'insert':
          if (op.content !== undefined) {
            lines.splice(lineIndex, 0, op.content);
            linesProcessed++;
          }
          break;
          
        case 'replace':
          if (op.content !== undefined && lineIndex >= 0 && lineIndex < lines.length) {
            lines[lineIndex] = op.content;
            linesProcessed++;
          }
          break;
          
        case 'delete':
          const deleteCount = op.deleteCount || 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            lines.splice(lineIndex, deleteCount);
            linesProcessed += deleteCount;
          }
          break;
      }
    }
    
    // Write the modified content back
    const modifiedContent = joinLines(lines);
    await fs.writeFile(normalizedPath, modifiedContent, 'utf8');
    
    return createSuccessResult('patchFile', undefined, startTime, filesAffected, linesProcessed);
  } catch (error) {
    return createErrorResult(
      'patchFile',
      `Failed to patch file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Copies a file to a new location
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const result = await copyFile('/source/file.txt', '/destination/file.txt');
 * if (result.success) {
 *   console.log('File copied successfully');
 * }
 * ```
 */
export async function copyFile(
  sourcePath: string,
  destinationPath: string
): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedSource = validatePath(sourcePath);
    const normalizedDest = validatePath(destinationPath);
    
    if (!(await pathExists(normalizedSource))) {
      return createErrorResult('copyFile', `Source file not found: ${normalizedSource}`, startTime);
    }
    
    // Ensure destination directory exists
    const destDir = path.dirname(normalizedDest);
    await fs.mkdir(destDir, { recursive: true });
    
    await measureTime(() => fs.copyFile(normalizedSource, normalizedDest));
    
    return createSuccessResult('copyFile', undefined, startTime, [normalizedSource, normalizedDest]);
  } catch (error) {
    return createErrorResult(
      'copyFile',
      `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Moves a file to a new location
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const result = await moveFile('/source/file.txt', '/destination/file.txt');
 * if (result.success) {
 *   console.log('File moved successfully');
 * }
 * ```
 */
export async function moveFile(
  sourcePath: string,
  destinationPath: string
): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedSource = validatePath(sourcePath);
    const normalizedDest = validatePath(destinationPath);
    
    if (!(await pathExists(normalizedSource))) {
      return createErrorResult('moveFile', `Source file not found: ${normalizedSource}`, startTime);
    }
    
    // Ensure destination directory exists
    const destDir = path.dirname(normalizedDest);
    await fs.mkdir(destDir, { recursive: true });
    
    await measureTime(() => fs.rename(normalizedSource, normalizedDest));
    
    return createSuccessResult('moveFile', undefined, startTime, [normalizedSource, normalizedDest]);
  } catch (error) {
    return createErrorResult(
      'moveFile',
      `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Deletes a file
 * @param filePath Path to the file to delete
 * @returns OperationResult indicating success or failure
 * @example
 * ```typescript
 * const result = await deleteFile('/path/to/file.txt');
 * if (result.success) {
 *   console.log('File deleted successfully');
 * }
 * ```
 */
export async function deleteFile(filePath: string): Promise<OperationResult<void>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(filePath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('deleteFile', `File not found: ${normalizedPath}`, startTime);
    }
    
    await measureTime(() => fs.unlink(normalizedPath));
    
    return createSuccessResult('deleteFile', undefined, startTime, [normalizedPath]);
  } catch (error) {
    return createErrorResult(
      'deleteFile',
      `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Gets metadata information about a file
 * @param filePath Path to the file
 * @returns OperationResult containing file metadata
 * @example
 * ```typescript
 * const result = await getFileMetadata('/path/to/file.txt');
 * if (result.success) {
 *   console.log('File size:', result.data.size);
 *   console.log('Modified:', result.data.modifiedAt);
 * }
 * ```
 */
export async function getFileMetadata(filePath: string): Promise<OperationResult<FileMetadata>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(filePath);
    
    const { result: stats } = await measureTime(() => fs.stat(normalizedPath));
    
    const metadata: FileMetadata = {
      path: normalizedPath,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      accessedAt: stats.atime,
      permissions: `0${(stats.mode & parseInt('777', 8)).toString(8)}`,
    };
    
    return createSuccessResult('getFileMetadata', metadata, startTime, [normalizedPath]);
  } catch (error) {
    return createErrorResult(
      'getFileMetadata',
      `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}