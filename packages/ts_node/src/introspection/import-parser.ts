/**
 * Import Parser for Tidyscripts Introspection System
 *
 * Uses TypeScript Compiler API to extract import statements from source files,
 * resolve module paths, and create import dependency graphs.
 */

import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from './logger';
import type { ImportInfo, FileImports } from './types';

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Resolve a module import path to an absolute file path
 *
 * Handles:
 * - Relative imports: './utils' -> absolute path
 * - Index files: './utils' -> './utils/index.ts' or './utils.ts'
 * - TypeScript extensions: .ts, .tsx
 *
 * @param importPath - The import string from the source code
 * @param sourceFilePath - Absolute path of the file doing the importing
 * @param projectRoot - Root directory of the project
 * @returns Resolved absolute path, or null if external package
 */
export async function resolveImportPath(
  importPath: string,
  sourceFilePath: string,
  projectRoot: string
): Promise<string | null> {
  // Skip external packages (not starting with . or /)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    logger.debug('Skipping external package import', {
      importPath,
      sourceFile: sourceFilePath,
    });
    return null;
  }

  const sourceDir = path.dirname(sourceFilePath);
  const resolvedPath = path.resolve(sourceDir, importPath);

  // Try different file extensions and index files
  const candidates = [
    resolvedPath + '.ts',
    resolvedPath + '.tsx',
    resolvedPath + '.js',
    resolvedPath + '.jsx',
    path.join(resolvedPath, 'index.ts'),
    path.join(resolvedPath, 'index.tsx'),
    path.join(resolvedPath, 'index.js'),
    path.join(resolvedPath, 'index.jsx'),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      logger.debug('Resolved import path', {
        importPath,
        resolvedTo: candidate,
        sourceFile: sourceFilePath,
      });
      return candidate;
    } catch {
      // File doesn't exist, try next candidate
      continue;
    }
  }

  logger.warn('Could not resolve import path', {
    importPath,
    sourceFile: sourceFilePath,
    triedPaths: candidates,
  });

  return null;
}

// ============================================================================
// Import Extraction
// ============================================================================

/**
 * Extract all import statements from a TypeScript source file
 *
 * @param filePath - Absolute path to the TypeScript file
 * @param projectRoot - Root directory of the project
 * @returns FileImports object with all imports and any errors
 */
export async function parseImportsFromFile(
  filePath: string,
  projectRoot: string
): Promise<FileImports> {
  const result: FileImports = {
    filePath,
    imports: [],
    errors: [],
  };

  try {
    // Read source file
    const sourceCode = await fs.readFile(filePath, 'utf-8');

    // Parse with TypeScript compiler
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    // Collect all import declarations first
    const importDeclarations: ts.ImportDeclaration[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        importDeclarations.push(node);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Process all imports (async operations)
    for (const importDecl of importDeclarations) {
      await extractImportDeclaration(importDecl, filePath, projectRoot, result);
    }

    logger.debug('Parsed imports from file', {
      filePath,
      importCount: result.imports.length,
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    const errorMsg = `Failed to parse file: ${error}`;
    result.errors.push(errorMsg);
    logger.error('Import parsing failed', error as Error, { filePath });
    return result;
  }
}

/**
 * Extract information from a single ImportDeclaration node
 *
 * @param node - TypeScript ImportDeclaration AST node
 * @param sourceFilePath - Path of the file being parsed
 * @param projectRoot - Project root directory
 * @param result - FileImports object to add to
 */
async function extractImportDeclaration(
  node: ts.ImportDeclaration,
  sourceFilePath: string,
  projectRoot: string,
  result: FileImports
): Promise<void> {
  // Get the module specifier (the string in quotes)
  const moduleSpecifier = node.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpecifier)) {
    return; // Dynamic imports not supported
  }

  const rawImportPath = moduleSpecifier.text;
  const isTypeOnly = node.importClause?.isTypeOnly || false;

  // Resolve the import path
  const targetPath = await resolveImportPath(
    rawImportPath,
    sourceFilePath,
    projectRoot
  );

  // Skip external packages
  if (!targetPath) {
    return;
  }

  // Extract imported names
  const importClause = node.importClause;
  if (!importClause) {
    // Side-effect import: import './styles.css'
    result.imports.push({
      sourcePath: sourceFilePath,
      targetPath,
      importedNames: [],
      importType: 'side-effect',
      isTypeOnly,
      rawImportPath,
    });
    return;
  }

  const importedNames: string[] = [];
  let importType: ImportInfo['importType'] = 'named';

  // Default import: import Foo from './foo'
  if (importClause.name) {
    importedNames.push(importClause.name.text);
    importType = 'default';
  }

  // Named bindings
  if (importClause.namedBindings) {
    if (ts.isNamespaceImport(importClause.namedBindings)) {
      // Namespace import: import * as foo from './foo'
      importedNames.push(importClause.namedBindings.name.text);
      importType = 'namespace';
    } else if (ts.isNamedImports(importClause.namedBindings)) {
      // Named imports: import { a, b } from './foo'
      for (const element of importClause.namedBindings.elements) {
        importedNames.push(element.name.text);
      }
      if (importType !== 'default') {
        importType = 'named';
      }
    }
  }

  result.imports.push({
    sourcePath: sourceFilePath,
    targetPath,
    importedNames,
    importType,
    isTypeOnly,
    rawImportPath,
  });
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Parse imports from multiple files
 *
 * @param filePaths - Array of absolute file paths
 * @param projectRoot - Root directory of the project
 * @returns Array of FileImports results
 */
export async function parseImportsFromFiles(
  filePaths: string[],
  projectRoot: string
): Promise<FileImports[]> {
  logger.startTimer('parse-imports-batch');

  const results: FileImports[] = [];

  for (const filePath of filePaths) {
    const fileImports = await parseImportsFromFile(filePath, projectRoot);
    results.push(fileImports);
  }

  const duration = logger.endTimer('parse-imports-batch');

  const totalImports = results.reduce((sum, r) => sum + r.imports.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  logger.info('Batch import parsing completed', {
    filesProcessed: results.length,
    totalImports,
    totalErrors,
  });
  logger.logTiming('Batch import parsing', duration);

  return results;
}

// ============================================================================
// Import Graph Analysis
// ============================================================================

/**
 * Build an import dependency graph from parsed imports
 *
 * @param fileImports - Array of FileImports from multiple files
 * @returns Map of source file -> array of target files
 */
export function buildImportGraph(
  fileImports: FileImports[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const file of fileImports) {
    const targets = file.imports
      .map(imp => imp.targetPath)
      .filter((path): path is string => path !== null);

    graph.set(file.filePath, targets);
  }

  logger.debug('Built import dependency graph', {
    nodeCount: graph.size,
    edgeCount: Array.from(graph.values()).reduce(
      (sum, targets) => sum + targets.length,
      0
    ),
  });

  return graph;
}

/**
 * Find files with no imports (leaf nodes)
 *
 * @param fileImports - Array of FileImports
 * @returns Array of file paths with no imports
 */
export function findFilesWithNoImports(fileImports: FileImports[]): string[] {
  return fileImports
    .filter(file => file.imports.length === 0)
    .map(file => file.filePath);
}

/**
 * Find files that are not imported by any other file (orphans)
 *
 * @param fileImports - Array of FileImports
 * @returns Array of file paths not imported by others
 */
export function findOrphanFiles(fileImports: FileImports[]): string[] {
  const allFiles = new Set(fileImports.map(f => f.filePath));
  const importedFiles = new Set<string>();

  for (const file of fileImports) {
    for (const imp of file.imports) {
      importedFiles.add(imp.targetPath);
    }
  }

  return Array.from(allFiles).filter(file => !importedFiles.has(file));
}

/**
 * Get import statistics
 *
 * @param fileImports - Array of FileImports
 * @returns Statistics object
 */
export function getImportStats(fileImports: FileImports[]): {
  totalFiles: number;
  totalImports: number;
  filesWithNoImports: number;
  orphanFiles: number;
  averageImportsPerFile: number;
  maxImportsInFile: number;
  errors: number;
} {
  const totalFiles = fileImports.length;
  const totalImports = fileImports.reduce(
    (sum, f) => sum + f.imports.length,
    0
  );
  const filesWithNoImports = findFilesWithNoImports(fileImports).length;
  const orphanFiles = findOrphanFiles(fileImports).length;
  const averageImportsPerFile = totalFiles > 0 ? totalImports / totalFiles : 0;
  const maxImportsInFile = Math.max(
    ...fileImports.map(f => f.imports.length),
    0
  );
  const errors = fileImports.reduce((sum, f) => sum + f.errors.length, 0);

  return {
    totalFiles,
    totalImports,
    filesWithNoImports,
    orphanFiles,
    averageImportsPerFile,
    maxImportsInFile,
    errors,
  };
}
