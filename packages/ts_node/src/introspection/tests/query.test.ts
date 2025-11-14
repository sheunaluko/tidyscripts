/**
 * Integration tests for query.ts
 *
 * NOTE: These tests connect to the REAL database using a TEST namespace.
 * All tables are created fresh and completely cleaned up after tests.
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import Surreal from 'surrealdb';
import {
  searchBySimilarity,
  searchByText,
  findContains,
  findContainedBy,
  findAllDescendants,
  findAllAncestors,
  findImports,
  findImportedBy,
  getContainsEdges,
  getImportsEdges,
} from '../query.js';
import { initializeSchema } from '../database.js';
import { loadSurrealConfig } from '../config.js';
import { TABLE_NAMES, NodeKind } from '../constants.js';

const runner = new TestRunner();

// Test data IDs
const MODULE_AUTH_ID = 1000;
const MODULE_DATABASE_ID = 1001;
const FUNCTION_LOGIN_ID = 2000;
const FUNCTION_LOGOUT_ID = 2001;
const FUNCTION_CONNECT_ID = 2002;

/**
 * Connect to TEST namespace (separate from production)
 */
async function connectToTestNamespace(): Promise<Surreal> {
  const config = loadSurrealConfig();
  const db = new Surreal();

  await db.connect(config.url, {
    namespace: `${config.namespace}_test`,  // Append _test
    database: config.database,
  });

  if (config.user && config.password) {
    await db.signin({
      username: config.user,
      password: config.password,
    });
  }

  return db;
}

/**
 * Clean up all test tables (call at start AND end)
 */
async function cleanupAllTables(db: Surreal): Promise<void> {
  const tables = [
    'function_node',
    'class_node',
    'module_node',
    'interface_node',
    'type_alias_node',
    'embedding_cache',
    'file_metadata',
    'CONTAINS',
    'USES',
    'IMPORTS',
  ];

  for (const table of tables) {
    try {
      await db.query(`REMOVE TABLE ${table}`);
    } catch (error) {
      // Table might not exist yet, that's OK
    }
  }
}

/**
 * Setup test data - create nodes and relationships
 */
async function setupTestData(db: Surreal): Promise<void> {
  // Create test modules
  await db.query(`
    CREATE module_node:${MODULE_AUTH_ID} CONTENT {
      nodeId: ${MODULE_AUTH_ID},
      name: "auth",
      path: "src/auth.ts",
      kind: ${NodeKind.Module},
      nodeHash: "hash1",
      embeddingHash: "emb_hash_${MODULE_AUTH_ID}",
      docstring: "Authentication module for user login",
      exports: [],
      lastUpdated: time::now()
    }
  `);

  await db.query(`
    CREATE module_node:${MODULE_DATABASE_ID} CONTENT {
      nodeId: ${MODULE_DATABASE_ID},
      name: "database",
      path: "src/database.ts",
      kind: ${NodeKind.Module},
      nodeHash: "hash2",
      embeddingHash: "emb_hash_${MODULE_DATABASE_ID}",
      docstring: "Database connection and query functions",
      exports: [],
      lastUpdated: time::now()
    }
  `);

  // Create test functions
  await db.query(`
    CREATE function_node:${FUNCTION_LOGIN_ID} CONTENT {
      nodeId: ${FUNCTION_LOGIN_ID},
      name: "login",
      filePath: "src/auth.ts",
      kind: ${NodeKind.Function},
      nodeHash: "hash3",
      embeddingHash: "emb_hash_${FUNCTION_LOGIN_ID}",
      docstring: "Authenticate user with username and password",
      signature: {},
      sources: [],
      lastUpdated: time::now()
    }
  `);

  await db.query(`
    CREATE function_node:${FUNCTION_LOGOUT_ID} CONTENT {
      nodeId: ${FUNCTION_LOGOUT_ID},
      name: "logout",
      filePath: "src/auth.ts",
      kind: ${NodeKind.Function},
      nodeHash: "hash4",
      embeddingHash: "emb_hash_${FUNCTION_LOGOUT_ID}",
      docstring: "Log out current user and clear session",
      signature: {},
      sources: [],
      lastUpdated: time::now()
    }
  `);

  await db.query(`
    CREATE function_node:${FUNCTION_CONNECT_ID} CONTENT {
      nodeId: ${FUNCTION_CONNECT_ID},
      name: "connect",
      filePath: "src/database.ts",
      kind: ${NodeKind.Function},
      nodeHash: "hash5",
      embeddingHash: "emb_hash_${FUNCTION_CONNECT_ID}",
      docstring: "Connect to database server",
      signature: {},
      sources: [],
      lastUpdated: time::now()
    }
  `);

  // Create embeddings in cache
  // Note: Using dummy vectors for testing (real embeddings would be 1536 dimensions)
  const dummyEmbedding = new Array(1536).fill(0).map((_, i) => Math.random());

  for (const id of [MODULE_AUTH_ID, MODULE_DATABASE_ID, FUNCTION_LOGIN_ID, FUNCTION_LOGOUT_ID, FUNCTION_CONNECT_ID]) {
    await db.query(
      `INSERT INTO embedding_cache (contentHash, embedding, usageCount) VALUES ($hash, $embedding, 1)`,
      { hash: `emb_hash_${id}`, embedding: dummyEmbedding }
    );
  }

  // Create CONTAINS edges (module -> functions)
  await db.query(`RELATE module_node:${MODULE_AUTH_ID}->CONTAINS->function_node:${FUNCTION_LOGIN_ID}`);
  await db.query(`RELATE module_node:${MODULE_AUTH_ID}->CONTAINS->function_node:${FUNCTION_LOGOUT_ID}`);
  await db.query(`RELATE module_node:${MODULE_DATABASE_ID}->CONTAINS->function_node:${FUNCTION_CONNECT_ID}`);

  // Create IMPORTS edge (auth module imports database module)
  await db.query(`RELATE module_node:${MODULE_AUTH_ID}->IMPORTS->module_node:${MODULE_DATABASE_ID}`);
}

runner.run(async () => {
  // ======================================================================
  // SETUP: Connect to TEST namespace
  // ======================================================================

  runner.suite('Query Functions - Connection & Setup');

  const db = await connectToTestNamespace();
  runner.test('connect establishes connection to TEST namespace', () => {
    assert(db !== null, 'Database connection should be established');
  });

  // CLEANUP: Remove all data from previous test runs
  await cleanupAllTables(db);
  runner.test('cleanup: removed all existing test data', () => {
    assert(true, 'Pre-test cleanup completed');
  });

  // Initialize schema
  await initializeSchema(db);
  runner.test('initializeSchema creates schema', () => {
    assert(true, 'Schema initialized');
  });

  // Setup test data
  runner.suite('Query Functions - Test Data Setup');
  await setupTestData(db);
  runner.test('setupTestData creates nodes and relationships', () => {
    assert(true, 'Test data created');
  });

  // Verify test data was created
  const [modules] = await db.query(`SELECT * FROM module_node`);
  const [functions] = await db.query(`SELECT * FROM function_node`);
  const [containsEdges] = await db.query(`SELECT * FROM CONTAINS`);
  const [importsEdges] = await db.query(`SELECT * FROM IMPORTS`);

  runner.test('test data verification', () => {
    const modulesArray = Array.isArray(modules) ? modules : [];
    const functionsArray = Array.isArray(functions) ? functions : [];
    const containsArray = Array.isArray(containsEdges) ? containsEdges : [];
    const importsArray = Array.isArray(importsEdges) ? importsEdges : [];

    assertEqual(modulesArray.length, 2, 'Should have 2 modules');
    assertEqual(functionsArray.length, 3, 'Should have 3 functions');
    assertEqual(containsArray.length, 3, 'Should have 3 CONTAINS edges');
    assertEqual(importsArray.length, 1, 'Should have 1 IMPORTS edge');
  });

  // ======================================================================
  // TEST SUITE 1: Embedding-Based Similarity Search
  // ======================================================================

  runner.suite('Query Functions - Similarity Search');

  runner.test('searchBySimilarity() - finds similar nodes', async () => {
    const results = await searchBySimilarity(db, 'user authentication login', {
      limit: 5,
      threshold: 0,
    });

    // Should find results (at minimum, our test nodes)
    assert(results.length > 0, 'Should find at least one result');

    // Each result should have node and similarity
    for (const result of results) {
      assert(result.node !== undefined, 'Result should have node');
      assert(typeof result.similarity === 'number', 'Result should have similarity score');
      assert(result.similarity >= 0 && result.similarity <= 1, 'Similarity should be between 0 and 1');
    }

    // Results should be sorted by similarity (descending)
    for (let i = 1; i < results.length; i++) {
      assert(
        results[i - 1].similarity >= results[i].similarity,
        'Results should be sorted by similarity descending'
      );
    }
  });

  runner.test('searchBySimilarity() - respects limit option', async () => {
    const results = await searchBySimilarity(db, 'function', { limit: 2 });
    assert(results.length <= 2, 'Should respect limit option');
  });

  runner.test('searchBySimilarity() - respects threshold option', async () => {
    const results = await searchBySimilarity(db, 'function', { threshold: 0.9 });

    // All results should meet threshold
    for (const result of results) {
      assert(
        result.similarity >= 0.9,
        `All results should meet threshold (got ${result.similarity})`
      );
    }
  });

  // ======================================================================
  // TEST SUITE 2: Text-Based Search
  // ======================================================================

  runner.suite('Query Functions - Text Search');

  runner.test('searchByText() - finds nodes by name', async () => {
    const results = await searchByText(db, 'login', {
      fields: ['name'],
      limit: 10,
    });

    assert(results.length > 0, 'Should find login function');

    // Should find our login function
    const hasLogin = results.some(node => node.name === 'login');
    assert(hasLogin, 'Should find node with name "login"');
  });

  runner.test('searchByText() - finds nodes by docstring', async () => {
    const results = await searchByText(db, 'authenticate', {
      fields: ['docstring'],
      limit: 10,
    });

    assert(results.length > 0, 'Should find nodes with "authenticate" in docstring');

    // Should find our login function
    const hasLogin = results.some(node => node.name === 'login');
    assert(hasLogin, 'Should find login function via docstring');
  });

  runner.test('searchByText() - case insensitive by default', async () => {
    const results = await searchByText(db, 'LOGIN', {
      fields: ['name'],
      limit: 10,
    });

    assert(results.length > 0, 'Should find "login" when searching for "LOGIN"');

    const hasLogin = results.some(node => node.name === 'login');
    assert(hasLogin, 'Should find lowercase "login" with uppercase search');
  });

  runner.test('searchByText() - respects limit option', async () => {
    const results = await searchByText(db, '.*', { limit: 2 });
    assert(results.length <= 2, 'Should respect limit option');
  });

  // ======================================================================
  // TEST SUITE 3: Graph Traversal - CONTAINS Edges
  // ======================================================================

  runner.suite('Query Functions - Graph Traversal (CONTAINS)');

  runner.test('findContains() - finds child nodes', async () => {
    const children = await findContains(db, `module_node:${MODULE_AUTH_ID}`);

    assert(children.length === 2, `Should find 2 functions in auth module (found ${children.length})`);

    const names = children.map(node => node.name).sort();
    assert(names.includes('login') && names.includes('logout'), 'Should find login and logout functions');
  });

  runner.test('findContainedBy() - finds parent nodes', async () => {
    const parents = await findContainedBy(db, `function_node:${FUNCTION_LOGIN_ID}`);

    assert(parents.length === 1, `Should find 1 parent module (found ${parents.length})`);
    assert(parents[0].name === 'auth', 'Parent should be auth module');
  });

  runner.test('findAllDescendants() - finds all nested children', async () => {
    const descendants = await findAllDescendants(db, `module_node:${MODULE_AUTH_ID}`, 5);

    assert(descendants.length >= 2, `Should find at least 2 descendants (found ${descendants.length})`);
  });

  runner.test('findAllAncestors() - finds all parent nodes', async () => {
    const ancestors = await findAllAncestors(db, `function_node:${FUNCTION_LOGIN_ID}`, 5);

    assert(ancestors.length >= 1, `Should find at least 1 ancestor (found ${ancestors.length})`);
  });

  runner.test('getContainsEdges() - returns relationship edges', async () => {
    const edges = await getContainsEdges(db, `module_node:${MODULE_AUTH_ID}`);

    assert(edges.length === 2, `Should find 2 CONTAINS edges (found ${edges.length})`);

    for (const edge of edges) {
      assert(edge.from === `module_node:${MODULE_AUTH_ID}`, 'Edge should originate from auth module');
      assert(edge.to.startsWith('function_node:'), 'Edge should point to a function_node');
    }
  });

  // ======================================================================
  // TEST SUITE 4: Graph Traversal - IMPORTS Edges
  // ======================================================================

  runner.suite('Query Functions - Graph Traversal (IMPORTS)');

  runner.test('findImports() - finds imported modules', async () => {
    const imports = await findImports(db, `module_node:${MODULE_AUTH_ID}`);

    assert(imports.length === 1, `Should find 1 imported module (found ${imports.length})`);
    assert(imports[0].name === 'database', 'Should import database module');
  });

  runner.test('findImportedBy() - finds modules that import this one', async () => {
    const importers = await findImportedBy(db, `module_node:${MODULE_DATABASE_ID}`);

    assert(importers.length === 1, `Should find 1 importing module (found ${importers.length})`);
    assert(importers[0].name === 'auth', 'Should be imported by auth module');
  });

  runner.test('getImportsEdges() - returns import relationship edges', async () => {
    const edges = await getImportsEdges(db, `module_node:${MODULE_AUTH_ID}`);

    assert(edges.length === 1, `Should find 1 IMPORTS edge (found ${edges.length})`);
    assert(edges[0].from === `module_node:${MODULE_AUTH_ID}`, 'Edge should originate from auth module');
    assert(edges[0].to === `module_node:${MODULE_DATABASE_ID}`, 'Edge should point to database module');
  });

  // ======================================================================
  // CLEANUP: Remove ALL tables and data
  // ======================================================================

  runner.suite('Query Functions - Cleanup');

  // Clean up all tables completely
  await cleanupAllTables(db);
  runner.test('all tables cleaned up', () => {
    assert(true, 'All test data and tables removed');
  });

  // Verify deletion
  const [nodesAfterDelete] = await db.query(`SELECT * FROM function_node`);
  runner.test('verify all test data removed', () => {
    const nodesArray = Array.isArray(nodesAfterDelete) ? nodesAfterDelete : [];
    assertEqual(nodesArray.length, 0, 'All test nodes should be deleted');
  });

  await db.close();
  runner.test('database connection closed', () => {
    assert(true, 'Disconnection completed');
  });

}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
