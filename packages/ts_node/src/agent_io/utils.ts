/**
 * Utility functions for the agent_io package
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { OperationResult } from './types';

/**
 * Creates a standardized operation result for successful operations
 * @param operation Name of the operation
 * @param data Data to return
 * @param startTime Start time for calculating execution time
 * @param filesAffected List of files affected by the operation
 * @param linesProcessed Number of lines processed
 * @returns Standardized SuccessResult
 */
export function createSuccessResult<T>(
  operation: string,
  data: T,
  startTime?: number,
  filesAffected?: string[],
  linesProcessed?: number
): OperationResult<T> {
  const executionTime = startTime ? Date.now() - startTime : 0;
  
  return {
    success: true,
    data,
    metadata: {
      operation,
      timestamp: new Date(),
      executionTime,
      filesAffected,
      linesProcessed,
    },
  };
}

/**
 * Creates a standardized operation result for failed operations
 * @param operation Name of the operation
 * @param error Error message
 * @param startTime Start time for calculating execution time
 * @param filesAffected List of files affected by the operation
 * @param linesProcessed Number of lines processed
 * @returns Standardized ErrorResult
 */
export function createErrorResult<T = any>(
  operation: string,
  error: string,
  startTime?: number,
  filesAffected?: string[],
  linesProcessed?: number
): OperationResult<T> {
  const executionTime = startTime ? Date.now() - startTime : 0;
  
  return {
    success: false,
    error,
    metadata: {
      operation,
      timestamp: new Date(),
      executionTime,
      filesAffected,
      linesProcessed,
    },
  };
}

/**
 * Creates a standardized operation result (legacy function for backward compatibility)
 * @param operation Name of the operation
 * @param success Whether the operation was successful
 * @param data Data to return (if successful)
 * @param error Error message (if failed)
 * @param startTime Start time for calculating execution time
 * @param filesAffected List of files affected by the operation
 * @param linesProcessed Number of lines processed
 * @returns Standardized OperationResult
 */
export function createResult<T>(
  operation: string,
  success: boolean,
  data?: T,
  error?: string,
  startTime?: number,
  filesAffected?: string[],
  linesProcessed?: number
): OperationResult<T> {
  if (success) {
    return createSuccessResult(operation, data!, startTime, filesAffected, linesProcessed);
  } else {
    return createErrorResult(operation, error!, startTime, filesAffected, linesProcessed);
  }
}

/**
 * Validates and normalizes a file path
 * @param filePath Path to validate
 * @returns Normalized absolute path
 * @throws Error if path is invalid
 */
export function validatePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('File path must be a non-empty string');
  }
  
  const normalizedPath = path.resolve(filePath);
  
  // Basic security check - prevent directory traversal attacks
  if (normalizedPath.includes('..')) {
    throw new Error('Path contains invalid directory traversal');
  }
  
  return normalizedPath;
}

/**
 * Checks if a file or directory exists
 * @param filePath Path to check
 * @returns True if path exists, false otherwise
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a backup of a file
 * @param filePath Original file path
 * @param suffix Backup file suffix (defaults to '.bak')
 * @returns Path to the backup file
 * @throws Error if backup creation fails
 */
export async function createBackup(filePath: string, suffix = '.bak'): Promise<string> {
  const normalizedPath = validatePath(filePath);
  const backupPath = `${normalizedPath}${suffix}`;
  
  try {
    await fs.copyFile(normalizedPath, backupPath);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath Directory path to ensure
 * @throws Error if directory cannot be created
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  const normalizedPath = validatePath(dirPath);
  
  try {
    await fs.mkdir(normalizedPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to ensure directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets the file extension from a path
 * @param filePath File path
 * @returns File extension (including the dot), or empty string if no extension
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Checks if a file has one of the specified extensions
 * @param filePath File path to check
 * @param extensions Array of extensions to match (e.g., ['.ts', '.js'])
 * @returns True if file has one of the extensions
 */
export function hasExtension(filePath: string, extensions: string[]): boolean {
  if (!extensions || extensions.length === 0) {
    return true;
  }
  
  const fileExt = getFileExtension(filePath).toLowerCase();
  return extensions.some(ext => ext.toLowerCase() === fileExt);
}

/**
 * Splits file content into lines, handling different line endings
 * @param content File content
 * @returns Array of lines
 */
export function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

/**
 * Joins lines with the appropriate line ending for the platform
 * @param lines Array of lines
 * @returns Joined content with line endings
 */
export function joinLines(lines: string[]): string {
  return lines.join('\n');
}

/**
 * Extracts a range of lines from content
 * @param content File content
 * @param startLine Start line number (1-based)
 * @param endLine End line number (1-based, inclusive)
 * @returns Array of lines in the specified range
 */
export function extractLineRange(content: string, startLine?: number, endLine?: number): string[] {
  const lines = splitLines(content);
  
  if (!startLine && !endLine) {
    return lines;
  }
  
  const start = Math.max(0, (startLine ?? 1) - 1);
  const end = endLine ? Math.min(lines.length, endLine) : lines.length;
  
  return lines.slice(start, end);
}

/**
 * Measures execution time of an async operation
 * @param operation Async function to measure
 * @returns Object containing the result and execution time
 */
export async function measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  const result = await operation();
  const executionTime = Date.now() - startTime;
  
  return { result, executionTime };
}

/**
 * Safely parses a JSON string
 * @param jsonString JSON string to parse
 * @returns Parsed object or null if parsing fails
 */
export function safeJsonParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Formats file size in human-readable format
 * @param bytes File size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Escapes a string for use in regular expressions
 * @param str String to escape
 * @returns Escaped string
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a path is within a specified directory
 * @param childPath Path to check
 * @param parentDir Parent directory
 * @returns True if childPath is within parentDir
 */
export function isPathWithin(childPath: string, parentDir: string): boolean {
  const normalizedChild = path.resolve(childPath);
  const normalizedParent = path.resolve(parentDir);
  
  return normalizedChild.startsWith(normalizedParent + path.sep) || normalizedChild === normalizedParent;
}