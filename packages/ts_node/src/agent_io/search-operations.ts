/**
 * Search operations for the agent_io package
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import {
  OperationResult,
  SearchOptions,
  SearchMatch,
  FindReplaceOptions,
  FindReplaceResult,
} from './types';
import {
  createResult,
  createSuccessResult,
  createErrorResult,
  validatePath,
  pathExists,
  hasExtension,
  splitLines,
  joinLines,
  escapeRegExp,
  createBackup,
  measureTime,
} from './utils';
import { listDirectory } from './directory-operations';

/**
 * Searches for content within a single file
 * @param filePath Path to the file to search
 * @param searchPattern String or regex pattern to search for
 * @param options Search options
 * @returns OperationResult containing array of SearchMatch objects
 * @example
 * ```typescript
 * const result = await searchInFile('/path/to/file.txt', 'function', {
 *   includeLineNumbers: true,
 *   contextLines: 2
 * });
 * if (result.success) {
 *   result.data.forEach(match => {
 *     console.log(`Found at line ${match.lineNumber}: ${match.line}`);
 *   });
 * }
 * ```
 */
export async function searchInFile(
  filePath: string,
  searchPattern: string | RegExp,
  options: SearchOptions = {}
): Promise<OperationResult<SearchMatch[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(filePath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('searchInFile', `File not found: ${normalizedPath}`, startTime);
    }
    
    const { result: content } = await measureTime(() => fs.readFile(normalizedPath, 'utf8'));
    const lines = splitLines(content);
    
    const regex = typeof searchPattern === 'string' 
      ? new RegExp(escapeRegExp(searchPattern), options.ignoreCase ? 'gi' : 'g')
      : searchPattern;
    
    const matches: SearchMatch[] = [];
    let matchCount = 0;
    
    for (let i = 0; i < lines.length && (options.maxResults === undefined || matchCount < options.maxResults); i++) {
      const line = lines[i];
      
      if (regex.test(line)) {
        const match: SearchMatch = {
          filePath: normalizedPath,
          lineNumber: options.includeLineNumbers ? i + 1 : -1,
          line,
        };
        
        // Add context lines if requested
        if (options.contextLines && options.contextLines > 0) {
          const contextStart = Math.max(0, i - options.contextLines);
          const contextEnd = Math.min(lines.length - 1, i + options.contextLines);
          
          match.contextBefore = lines.slice(contextStart, i);
          match.contextAfter = lines.slice(i + 1, contextEnd + 1);
        }
        
        matches.push(match);
        matchCount++;
        
        // Reset regex lastIndex for global regexes
        if (regex.global) {
          regex.lastIndex = 0;
        }
      }
    }
    
    return createSuccessResult('searchInFile', matches, startTime, [normalizedPath], matches.length);
  } catch (error) {
    return createErrorResult(
      'searchInFile',
      `Failed to search in file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Searches for content across multiple files in a directory
 * @param dirPath Directory to search in
 * @param searchPattern String or regex pattern to search for
 * @param options Search options including recursion and file filtering
 * @returns OperationResult containing array of SearchMatch objects from all files
 * @example
 * ```typescript
 * const result = await searchInFiles('/path/to/dir', 'TODO:', {
 *   recursive: true,
 *   extensions: ['.ts', '.js'],
 *   maxResults: 50
 * });
 * if (result.success) {
 *   console.log(`Found ${result.data.length} TODOs across the codebase`);
 * }
 * ```
 */
export async function searchInFiles(
  dirPath: string,
  searchPattern: string | RegExp,
  options: SearchOptions = {}
): Promise<OperationResult<SearchMatch[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('searchInFiles', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    // Get list of files to search
    const listResult = await listDirectory(normalizedPath, {
      recursive: options.recursive,
      extensions: options.extensions,
      includeHidden: false,
    });
    
    if (!listResult.success) {
      return createErrorResult('searchInFiles', listResult.error!, startTime);
    }
    
    const allMatches: SearchMatch[] = [];
    const filesAffected: string[] = [];
    let totalMatches = 0;
    
    for (const filePath of listResult.data!) {
      if (options.maxResults !== undefined && totalMatches >= options.maxResults) {
        break;
      }
      
      try {
        const remaining = options.maxResults ? options.maxResults - totalMatches : undefined;
        const fileSearchResult = await searchInFile(filePath, searchPattern, {
          ...options,
          maxResults: remaining,
        });
        
        if (fileSearchResult.success && fileSearchResult.data!.length > 0) {
          allMatches.push(...fileSearchResult.data!);
          filesAffected.push(filePath);
          totalMatches += fileSearchResult.data!.length;
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
    
    return createSuccessResult('searchInFiles', allMatches, startTime, filesAffected, totalMatches);
  } catch (error) {
    return createErrorResult(
      'searchInFiles',
      `Failed to search in files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Finds and replaces content in a single file
 * @param filePath Path to the file
 * @param searchPattern Pattern to search for
 * @param replacement Replacement string
 * @param options Find and replace options
 * @returns OperationResult containing FindReplaceResult
 * @example
 * ```typescript
 * const result = await findAndReplaceInFile('/path/to/file.txt', 'oldText', 'newText', {
 *   preview: false,
 *   createBackups: true
 * });
 * if (result.success) {
 *   console.log(`Made ${result.data.replacements} replacements`);
 * }
 * ```
 */
export async function findAndReplaceInFile(
  filePath: string,
  searchPattern: string | RegExp,
  replacement: string,
  options: FindReplaceOptions = {}
): Promise<OperationResult<FindReplaceResult>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(filePath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('findAndReplaceInFile', `File not found: ${normalizedPath}`, startTime);
    }
    
    const filesAffected = [normalizedPath];
    
    // Create backup if requested and not in preview mode
    if (options.createBackups && !options.preview) {
      const backupPath = await createBackup(normalizedPath);
      filesAffected.push(backupPath);
    }
    
    const { result: content } = await measureTime(() => fs.readFile(normalizedPath, 'utf8'));
    const lines = splitLines(content);
    
    const regex = typeof searchPattern === 'string' 
      ? new RegExp(escapeRegExp(searchPattern), options.ignoreCase ? 'g' : 'g')
      : new RegExp(searchPattern.source, searchPattern.flags.includes('g') ? searchPattern.flags : searchPattern.flags + 'g');
    
    const matches: SearchMatch[] = [];
    let replacements = 0;
    const modifiedLines = [...lines];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matchResult = line.match(regex);
      
      if (matchResult) {
        const match: SearchMatch = {
          filePath: normalizedPath,
          lineNumber: options.includeLineNumbers ? i + 1 : -1,
          line,
        };
        
        // Add context lines if requested
        if (options.contextLines && options.contextLines > 0) {
          const contextStart = Math.max(0, i - options.contextLines);
          const contextEnd = Math.min(lines.length - 1, i + options.contextLines);
          
          match.contextBefore = lines.slice(contextStart, i);
          match.contextAfter = lines.slice(i + 1, contextEnd + 1);
        }
        
        matches.push(match);
        replacements += matchResult.length;
        
        // Replace content if not in preview mode
        if (!options.preview) {
          modifiedLines[i] = line.replace(regex, replacement);
        }
        
        // Reset regex for next iteration
        regex.lastIndex = 0;
      }
    }
    
    // Write the modified content back to file if not in preview mode
    if (!options.preview && replacements > 0) {
      const modifiedContent = joinLines(modifiedLines);
      await fs.writeFile(normalizedPath, modifiedContent, 'utf8');
    }
    
    const result: FindReplaceResult = {
      filePath: normalizedPath,
      replacements,
      matches,
    };
    
    return createSuccessResult('findAndReplaceInFile', result, startTime, filesAffected, replacements);
  } catch (error) {
    return createErrorResult(
      'findAndReplaceInFile',
      `Failed to find and replace in file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Finds and replaces content across multiple files in a directory
 * @param dirPath Directory to search in
 * @param searchPattern Pattern to search for
 * @param replacement Replacement string
 * @param options Find and replace options
 * @returns OperationResult containing array of FindReplaceResult objects
 * @example
 * ```typescript
 * const result = await findAndReplaceInFiles('/path/to/dir', 'oldAPI', 'newAPI', {
 *   recursive: true,
 *   extensions: ['.ts', '.js'],
 *   preview: true
 * });
 * if (result.success) {
 *   const totalReplacements = result.data.reduce((sum, r) => sum + r.replacements, 0);
 *   console.log(`Would make ${totalReplacements} replacements across ${result.data.length} files`);
 * }
 * ```
 */
export async function findAndReplaceInFiles(
  dirPath: string,
  searchPattern: string | RegExp,
  replacement: string,
  options: FindReplaceOptions = {}
): Promise<OperationResult<FindReplaceResult[]>> {
  const startTime = Date.now();
  
  try {
    const normalizedPath = validatePath(dirPath);
    
    if (!(await pathExists(normalizedPath))) {
      return createErrorResult('findAndReplaceInFiles', `Directory not found: ${normalizedPath}`, startTime);
    }
    
    // Get list of files to process
    const listResult = await listDirectory(normalizedPath, {
      recursive: options.recursive,
      extensions: options.extensions,
      includeHidden: false,
    });
    
    if (!listResult.success) {
      return createErrorResult('findAndReplaceInFiles', listResult.error!, startTime);
    }
    
    const results: FindReplaceResult[] = [];
    const filesAffected: string[] = [];
    let totalReplacements = 0;
    
    for (const filePath of listResult.data!) {
      try {
        const fileResult = await findAndReplaceInFile(filePath, searchPattern, replacement, options);
        
        if (fileResult.success && fileResult.data!.replacements > 0) {
          results.push(fileResult.data!);
          filesAffected.push(...(fileResult.metadata.filesAffected || []));
          totalReplacements += fileResult.data!.replacements;
        }
      } catch (error) {
        // Skip files that can't be processed
        continue;
      }
    }
    
    return createSuccessResult('findAndReplaceInFiles', results, startTime, filesAffected, totalReplacements);
  } catch (error) {
    return createErrorResult(
      'findAndReplaceInFiles',
      `Failed to find and replace in files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}

/**
 * Searches for specific code constructs (functions, classes, etc.)
 * @param dirPath Directory to search in
 * @param constructType Type of construct to search for ('function', 'class', 'interface', etc.)
 * @param constructName Optional name of the specific construct
 * @param options Search options
 * @returns OperationResult containing SearchMatch objects for found constructs
 * @example
 * ```typescript
 * const result = await searchCodeConstructs('/path/to/src', 'function', 'getUserData', {
 *   recursive: true,
 *   extensions: ['.ts', '.js']
 * });
 * if (result.success) {
 *   console.log(`Found function definitions:`, result.data);
 * }
 * ```
 */
export async function searchCodeConstructs(
  dirPath: string,
  constructType: 'function' | 'class' | 'interface' | 'type' | 'const' | 'let' | 'var',
  constructName?: string,
  options: SearchOptions = {}
): Promise<OperationResult<SearchMatch[]>> {
  const startTime = Date.now();
  
  try {
    // Build regex pattern for the construct type
    let pattern: RegExp;
    
    switch (constructType) {
      case 'function':
        pattern = constructName 
          ? new RegExp(`\\b(function\\s+${escapeRegExp(constructName)}|${escapeRegExp(constructName)}\\s*[=:]\\s*function|${escapeRegExp(constructName)}\\s*\\([^)]*\\)\\s*=>)`, options.ignoreCase ? 'i' : '')
          : /\b(function\s+\w+|\w+\s*[=:]\s*function|\w+\s*\([^)]*\)\s*=>)/;
        break;
        
      case 'class':
        pattern = constructName
          ? new RegExp(`\\bclass\\s+${escapeRegExp(constructName)}\\b`, options.ignoreCase ? 'i' : '')
          : /\bclass\s+\w+/;
        break;
        
      case 'interface':
        pattern = constructName
          ? new RegExp(`\\binterface\\s+${escapeRegExp(constructName)}\\b`, options.ignoreCase ? 'i' : '')
          : /\binterface\s+\w+/;
        break;
        
      case 'type':
        pattern = constructName
          ? new RegExp(`\\btype\\s+${escapeRegExp(constructName)}\\s*=`, options.ignoreCase ? 'i' : '')
          : /\btype\s+\w+\s*=/;
        break;
        
      case 'const':
      case 'let':
      case 'var':
        pattern = constructName
          ? new RegExp(`\\b${constructType}\\s+${escapeRegExp(constructName)}\\b`, options.ignoreCase ? 'i' : '')
          : new RegExp(`\\b${constructType}\\s+\\w+`);
        break;
        
      default:
        return createErrorResult('searchCodeConstructs', `Unsupported construct type: ${constructType}`, startTime);
    }
    
    return await searchInFiles(dirPath, pattern, options);
  } catch (error) {
    return createErrorResult(
      'searchCodeConstructs',
      `Failed to search code constructs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
  }
}