/**
 * Tests for Import Parser
 *
 * Tests TypeScript import extraction, path resolution, and graph building.
 */

import {
  parseImportsFromFile,
  resolveImportPath,
  buildImportGraph,
  findFilesWithNoImports,
  findOrphanFiles,
  getImportStats,
} from '../import-parser';
import type { FileImports } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Test utilities
let testDir: string;
let testFiles: Map<string, string>;

async function setupTestFiles() {
  // Create temporary test directory
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'import-parser-test-'));
  testFiles = new Map();

  // Test file 1: utils.ts (no imports)
  const utilsPath = path.join(testDir, 'utils.ts');
  const utilsContent = `
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
`;
  await fs.writeFile(utilsPath, utilsContent);
  testFiles.set('utils.ts', utilsPath);

  // Test file 2: types.ts (no imports)
  const typesPath = path.join(testDir, 'types.ts');
  const typesContent = `
export interface User {
  id: number;
  name: string;
}

export type UserID = number;
`;
  await fs.writeFile(typesPath, typesContent);
  testFiles.set('types.ts', typesPath);

  // Test file 3: calculator.ts (named imports)
  const calculatorPath = path.join(testDir, 'calculator.ts');
  const calculatorContent = `
import { add, multiply } from './utils';
import { User } from './types';

export function calculate(user: User, a: number, b: number): number {
  return add(multiply(a, b), user.id);
}
`;
  await fs.writeFile(calculatorPath, calculatorContent);
  testFiles.set('calculator.ts', calculatorPath);

  // Test file 4: main.ts (default and namespace imports)
  const mainPath = path.join(testDir, 'main.ts');
  const mainContent = `
import calculator from './calculator';
import * as utils from './utils';
import type { User } from './types';

const user: User = { id: 1, name: 'Test' };
const result = utils.add(1, 2);
`;
  await fs.writeFile(mainPath, mainContent);
  testFiles.set('main.ts', mainPath);

  // Test file 5: index.ts (side-effect import - simulated)
  const indexPath = path.join(testDir, 'index.ts');
  const indexContent = `
export * from './calculator';
export * from './utils';
`;
  await fs.writeFile(indexPath, indexContent);
  testFiles.set('index.ts', indexPath);
}

async function cleanupTestFiles() {
  if (testDir) {
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests
// ============================================================================

async function testResolveImportPath() {
  console.log('Testing resolveImportPath...');

  const sourceFile = testFiles.get('calculator.ts')!;

  // Test relative import with .ts extension resolution
  const resolved1 = await resolveImportPath('./utils', sourceFile, testDir);
  const expected1 = testFiles.get('utils.ts')!;

  if (resolved1 !== expected1) {
    throw new Error(
      `Expected ${expected1}, got ${resolved1}`
    );
  }

  // Test another relative import
  const resolved2 = await resolveImportPath('./types', sourceFile, testDir);
  const expected2 = testFiles.get('types.ts')!;

  if (resolved2 !== expected2) {
    throw new Error(
      `Expected ${expected2}, got ${resolved2}`
    );
  }

  // Test external package (should return null)
  const resolved3 = await resolveImportPath('lodash', sourceFile, testDir);

  if (resolved3 !== null) {
    throw new Error(`Expected null for external package, got ${resolved3}`);
  }

  console.log('  ✅ Relative imports resolve correctly');
  console.log('  ✅ External packages return null');
}

async function testParseNamedImports() {
  console.log('Testing parseImportsFromFile with named imports...');

  const calculatorFile = testFiles.get('calculator.ts')!;
  const result = await parseImportsFromFile(calculatorFile, testDir);

  // Should have 2 imports
  if (result.imports.length !== 2) {
    throw new Error(
      `Expected 2 imports, got ${result.imports.length}`
    );
  }

  // First import: { add, multiply } from './utils'
  const utilsImport = result.imports.find(
    imp => imp.rawImportPath === './utils'
  );

  if (!utilsImport) {
    throw new Error('Could not find utils import');
  }

  if (utilsImport.importType !== 'named') {
    throw new Error(
      `Expected 'named' import type, got ${utilsImport.importType}`
    );
  }

  if (utilsImport.importedNames.length !== 2) {
    throw new Error(
      `Expected 2 imported names, got ${utilsImport.importedNames.length}`
    );
  }

  if (
    !utilsImport.importedNames.includes('add') ||
    !utilsImport.importedNames.includes('multiply')
  ) {
    throw new Error(
      `Expected ['add', 'multiply'], got ${JSON.stringify(
        utilsImport.importedNames
      )}`
    );
  }

  console.log('  ✅ Named imports parsed correctly');
  console.log('  ✅ Import type detected as "named"');
  console.log('  ✅ Imported names extracted');
}

async function testParseTypeOnlyImports() {
  console.log('Testing type-only imports...');

  const mainFile = testFiles.get('main.ts')!;
  const result = await parseImportsFromFile(mainFile, testDir);

  // Find the type-only import
  const typeImport = result.imports.find(
    imp => imp.rawImportPath === './types'
  );

  if (!typeImport) {
    throw new Error('Could not find types import');
  }

  if (!typeImport.isTypeOnly) {
    throw new Error('Expected isTypeOnly to be true');
  }

  console.log('  ✅ Type-only imports detected');
}

async function testParseNamespaceImports() {
  console.log('Testing namespace imports...');

  const mainFile = testFiles.get('main.ts')!;
  const result = await parseImportsFromFile(mainFile, testDir);

  // Find the namespace import: import * as utils
  const namespaceImport = result.imports.find(
    imp => imp.importType === 'namespace'
  );

  if (!namespaceImport) {
    throw new Error('Could not find namespace import');
  }

  if (namespaceImport.importedNames[0] !== 'utils') {
    throw new Error(
      `Expected namespace name 'utils', got ${namespaceImport.importedNames[0]}`
    );
  }

  console.log('  ✅ Namespace imports parsed correctly');
}

async function testBuildImportGraph() {
  console.log('Testing buildImportGraph...');

  // Parse all test files
  const fileImports: FileImports[] = [];
  for (const [name, filePath] of testFiles) {
    const result = await parseImportsFromFile(filePath, testDir);
    fileImports.push(result);
  }

  const graph = buildImportGraph(fileImports);

  // Check graph size
  if (graph.size !== testFiles.size) {
    throw new Error(
      `Expected graph size ${testFiles.size}, got ${graph.size}`
    );
  }

  // Check utils.ts has no dependencies
  const utilsPath = testFiles.get('utils.ts')!;
  const utilsDeps = graph.get(utilsPath);

  if (!utilsDeps || utilsDeps.length !== 0) {
    throw new Error('Expected utils.ts to have no dependencies');
  }

  // Check calculator.ts has dependencies
  const calculatorPath = testFiles.get('calculator.ts')!;
  const calculatorDeps = graph.get(calculatorPath);

  if (!calculatorDeps || calculatorDeps.length === 0) {
    throw new Error('Expected calculator.ts to have dependencies');
  }

  console.log('  ✅ Import graph built correctly');
  console.log('  ✅ Leaf nodes have no dependencies');
  console.log('  ✅ Dependent nodes have edges');
}

async function testFindFilesWithNoImports() {
  console.log('Testing findFilesWithNoImports...');

  const fileImports: FileImports[] = [];
  for (const [name, filePath] of testFiles) {
    const result = await parseImportsFromFile(filePath, testDir);
    fileImports.push(result);
  }

  const noImports = findFilesWithNoImports(fileImports);

  // utils.ts and types.ts should have no imports
  const utilsPath = testFiles.get('utils.ts')!;
  const typesPath = testFiles.get('types.ts')!;

  if (!noImports.includes(utilsPath)) {
    throw new Error('Expected utils.ts in no-imports list');
  }

  if (!noImports.includes(typesPath)) {
    throw new Error('Expected types.ts in no-imports list');
  }

  console.log('  ✅ Files with no imports identified correctly');
}

async function testGetImportStats() {
  console.log('Testing getImportStats...');

  const fileImports: FileImports[] = [];
  for (const [name, filePath] of testFiles) {
    const result = await parseImportsFromFile(filePath, testDir);
    fileImports.push(result);
  }

  const stats = getImportStats(fileImports);

  if (stats.totalFiles !== testFiles.size) {
    throw new Error(
      `Expected ${testFiles.size} files, got ${stats.totalFiles}`
    );
  }

  if (stats.totalImports === 0) {
    throw new Error('Expected some imports to be parsed');
  }

  if (stats.filesWithNoImports === 0) {
    throw new Error('Expected some files with no imports');
  }

  console.log('  ✅ Import statistics calculated correctly');
  console.log(`  📊 Total files: ${stats.totalFiles}`);
  console.log(`  📊 Total imports: ${stats.totalImports}`);
  console.log(`  📊 Files with no imports: ${stats.filesWithNoImports}`);
  console.log(`  📊 Average imports per file: ${stats.averageImportsPerFile.toFixed(2)}`);
}

// ============================================================================
// Test Runner
// ============================================================================

async function runAllTests() {
  console.log('Running import-parser tests...\n');

  try {
    await setupTestFiles();

    await testResolveImportPath();
    await testParseNamedImports();
    await testParseTypeOnlyImports();
    await testParseNamespaceImports();
    await testBuildImportGraph();
    await testFindFilesWithNoImports();
    await testGetImportStats();

    await cleanupTestFiles();

    console.log('\n✅ All import-parser tests passed!');
  } catch (error) {
    await cleanupTestFiles();
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
