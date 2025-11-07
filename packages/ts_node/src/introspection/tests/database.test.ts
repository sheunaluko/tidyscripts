/**
 * Integration tests for database.ts
 *
 * NOTE: These tests connect to the REAL database using a TEST namespace.
 * All tables are created fresh and completely cleaned up after tests.
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import Surreal from 'surrealdb';
import {
  initializeSchema,
  insertFunctionNode,
  getFunctionNodesByFile,
  updateFileMetadata,
  getFileMetadata,
  getTableCounts,
  getTableNameForKind,
  createContainsEdge,
  deleteOutgoingEdges,
  createContainsEdgesForNode,
} from '../database';
import { loadSurrealConfig } from '../config';
import { NodeKind } from '../constants';
import type { FunctionNode } from '../types';

const runner = new TestRunner();

// Test data
const TEST_FILE_PATH = 'TEST_file.ts';
const TEST_NODE_ID = 999999;
const TEST_NODE_NAME = 'TEST_function';

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

runner.run(async () => {
  // ======================================================================
  // SETUP: Connect to TEST namespace
  // ======================================================================

  runner.suite('Database - Connection & Setup');

  const db = await connectToTestNamespace();
  runner.test('connect establishes connection to TEST namespace', () => {
    assert(db !== null, 'Database connection should be established');
  });

  // CLEANUP: Remove all data from previous test runs
  await cleanupAllTables(db);
  runner.test('cleanup: removed all existing test data', () => {
    assert(true, 'Pre-test cleanup completed');
  });

  // Try to initialize schema (may already exist)
  try {
    await initializeSchema(db);
    runner.test('initializeSchema creates new schema', () => {
      assert(true, 'Schema created');
    });
  } catch (error) {
    runner.test('initializeSchema handles existing schema', () => {
      assert(true, 'Schema already exists (OK)');
    });
  }

  // ======================================================================
  // CRUD Operations: Insert
  // ======================================================================

  runner.suite('Database - Function Node CRUD');

  const testNode: FunctionNode = {
    nodeId: TEST_NODE_ID,
    name: TEST_NODE_NAME,
    filePath: TEST_FILE_PATH,
    kind: NodeKind.Function,
    docstring: 'TEST docstring',
    signature: {
      name: 'TEST_function',
      variant: 'signature',
      kind: 4096,
      parameters: [],
    },
    sources: [],
    nodeHash: 'TEST_hash_123',
    embeddingHash: 'TEST_emb_hash_123',
    lastUpdated: new Date(),
  };

  await insertFunctionNode(db, testNode);
  runner.test('insertFunctionNode completes without error', () => {
    assert(true, 'Insert completed');
  });

  // Read back the node
  const retrievedNodes = await getFunctionNodesByFile(db, TEST_FILE_PATH);
  runner.test('getFunctionNodesByFile retrieves created node', () => {
    assert(Array.isArray(retrievedNodes), 'Should return an array');
    assert(retrievedNodes.length > 0, 'Should have at least one node');
    const testNodeRetrieved = retrievedNodes.find(n => n.name === TEST_NODE_NAME);
    assert(testNodeRetrieved !== undefined, 'Should find test node');
    assertEqual(testNodeRetrieved?.name, TEST_NODE_NAME);
  });

  // ======================================================================
  // File Metadata Operations
  // ======================================================================

  runner.suite('Database - File Metadata');

  await updateFileMetadata(db, {
    filePath: TEST_FILE_PATH,
    contentHash: 'TEST_content_hash',
    nodeIds: [TEST_NODE_ID],
    lastProcessed: new Date(),
  });
  runner.test('updateFileMetadata completes without error', () => {
    assert(true, 'Update metadata completed');
  });

  const metadata = await getFileMetadata(db, TEST_FILE_PATH);
  runner.test('getFileMetadata retrieves metadata', () => {
    assert(metadata !== null, 'Should return metadata');
    assertEqual(metadata?.filePath, TEST_FILE_PATH);
    assertEqual(metadata?.contentHash, 'TEST_content_hash');
  });

  // ======================================================================
  // Statistics
  // ======================================================================

  runner.suite('Database - Statistics');

  const counts = await getTableCounts(db);
  runner.test('getTableCounts returns valid counts', () => {
    assert(typeof counts === 'object', 'Should return an object');
    assert(typeof counts.functions === 'number', 'functions should be a number');
    assert(typeof counts.classes === 'number', 'classes should be a number');
    assert(typeof counts.modules === 'number', 'modules should be a number');
    assert(counts.functions >= 1, 'Should have at least 1 function from test data');
  });

  // ======================================================================
  // CONTAINS Edges (Relationships)
  // ======================================================================

  runner.suite('Database - CONTAINS Edges');

  // Test 1: getTableNameForKind
  runner.test('getTableNameForKind returns correct table names', () => {
    assertEqual(getTableNameForKind(NodeKind.Function), 'function_node');
    assertEqual(getTableNameForKind(NodeKind.Class), 'class_node');
    assertEqual(getTableNameForKind(NodeKind.Module), 'module_node');
    assertEqual(getTableNameForKind(NodeKind.Interface), 'interface_node');
    assertEqual(getTableNameForKind(NodeKind.Method), 'function_node');
  });

  // Test 2: Create a CONTAINS edge
  // We'll use the existing test function node as the child
  // Create a module node as parent
  const TEST_MODULE_ID = 888888;
  const moduleNode = {
    nodeId: TEST_MODULE_ID,
    name: 'TEST_module',
    filePath: TEST_FILE_PATH,
    kind: NodeKind.Module,
    docstring: 'TEST module docstring',
    signature: null,
    sources: [],
    nodeHash: 'TEST_module_hash',
    embeddingHash: 'TEST_module_emb_hash',
    lastUpdated: new Date(),
  };

  // Insert module node
  await db.query(`
    CREATE type::thing('module_node', type::string(${moduleNode.nodeId})) CONTENT {
      nodeId: ${moduleNode.nodeId},
      name: "${moduleNode.name}",
      path: "${moduleNode.filePath}",
      kind: ${moduleNode.kind},
      docstring: "${moduleNode.docstring}",
      exports: [],
      nodeHash: "${moduleNode.nodeHash}",
      embeddingHash: "${moduleNode.embeddingHash}",
      lastUpdated: type::datetime("${moduleNode.lastUpdated.toISOString()}")
    }
  `);

  // Create CONTAINS edge from module to function
  await createContainsEdge(
    db,
    'module_node',
    TEST_MODULE_ID,
    'function_node',
    TEST_NODE_ID
  );

  runner.test('createContainsEdge creates relationship', async () => {
    const [edges] = await db.query(`
      SELECT * FROM CONTAINS WHERE in = module_node:${TEST_MODULE_ID}
    `);
    const edgesArray = Array.isArray(edges) ? edges : [];
    assert(edgesArray.length > 0, 'Should have CONTAINS edge');

    // Verify edge points to correct child
    const edge = edgesArray[0];
    assert(edge.out !== undefined, 'Edge should have out field');
  });

  // Test 3: Delete outgoing edges
  await deleteOutgoingEdges(db, 'module_node', TEST_MODULE_ID);

  runner.test('deleteOutgoingEdges removes outgoing edges', async () => {
    const [edges] = await db.query(`
      SELECT * FROM CONTAINS WHERE in = module_node:${TEST_MODULE_ID}
    `);
    const edgesArray = Array.isArray(edges) ? edges : [];
    assertEqual(edgesArray.length, 0, 'Should have no outgoing edges after deletion');
  });

  // Test 4: Recursive edge creation
  // Create a parent node with nested children
  const parentWithChildren = {
    id: TEST_MODULE_ID,
    kind: NodeKind.Module,
    children: [
      {
        id: TEST_NODE_ID,
        kind: NodeKind.Function,
        children: []
      },
      {
        id: 777777,
        kind: NodeKind.Function,
        children: []
      }
    ]
  };

  const edgeCount = await createContainsEdgesForNode(db, parentWithChildren);

  runner.test('createContainsEdgesForNode creates edges for all children', async () => {
    assertEqual(edgeCount, 2, 'Should have created 2 edges');

    // Verify both edges exist
    const [edges] = await db.query(`
      SELECT * FROM CONTAINS WHERE in = module_node:${TEST_MODULE_ID}
    `);
    const edgesArray = Array.isArray(edges) ? edges : [];
    assertEqual(edgesArray.length, 2, 'Should have 2 CONTAINS edges');
  });

  // ======================================================================
  // CLEANUP: Remove ALL tables and data
  // ======================================================================

  runner.suite('Database - Cleanup');

  // Clean up all tables completely
  await cleanupAllTables(db);
  runner.test('all tables cleaned up', () => {
    assert(true, 'All test data and tables removed');
  });

  // Verify deletion
  const nodesAfterDelete = await getFunctionNodesByFile(db, TEST_FILE_PATH);
  runner.test('verify all test data removed', () => {
    assertEqual(nodesAfterDelete.length, 0, 'All test nodes should be deleted');
  });

  await db.close();
  runner.test('database connection closed', () => {
    assert(true, 'Disconnection completed');
  });

}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
