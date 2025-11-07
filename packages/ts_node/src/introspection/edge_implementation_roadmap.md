# Edge/Relationship Implementation Roadmap

## Executive Summary

**Status**: Edge tables (CONTAINS, USES, IMPORTS) are defined in schema but **not populated**.

**Goal**: Implement graph relationship creation to enable:
- Module → Function/Class containment queries
- Function → Function usage/dependency queries
- Module → Module import queries

**Scope**: Phase 1A - Implement CONTAINS edges only (simplest, highest value)

---

## Current State Analysis

### ✅ What's Working
1. **Schema defines edge tables** (schema.ts:257-275)
   - `CONTAINS`: Module → Function/Class/Interface
   - `USES`: Function → Function (dependencies)
   - `IMPORTS`: Module → Module (import graph)

2. **Parent-child data is already captured** (parser.ts:172-229)
   - `ParsedNode.children` array populated during traversal
   - `traverseNodes()` recursively builds parent-child relationships
   - Each node knows its parent context via filePath

3. **Node insertion works** (database.ts)
   - Functions, classes, modules stored correctly
   - NodeIds are unique and stable

### ❌ What's Missing
1. **No edge creation during sync**
   - `createRelationships()` is a stub (database.ts:625-632)
   - Never called during sync process
   - No edges exist in database (verified via query)

2. **No relationship testing**
   - database.test.ts doesn't test edge creation
   - No validation that edges are correct

---

## Why Edges Matter

### Without Edges (Current State)
```typescript
// ❌ Can't answer: "What functions does module X contain?"
// Must filter all functions by filePath string matching

// ❌ Can't answer: "What modules use function Y?"
// No way to know without full codebase text search

// ❌ Can't leverage graph database capabilities
// SurrealDB graph queries unavailable
```

### With CONTAINS Edges
```typescript
// ✅ Query: "What functions does web.apis contain?"
SELECT ->CONTAINS->function_node.* FROM module_node WHERE name = 'apis'

// ✅ Query: "What module contains authenticate()?"
SELECT <-CONTAINS<-module_node.* FROM function_node WHERE name = 'authenticate'

// ✅ Traversal: Find all nested functions in a module tree
SELECT ->CONTAINS->() FROM module_node WHERE path = 'packages/ts_web'
```

---

## Phase 1A: CONTAINS Edges Implementation

### Scope
**Only implement CONTAINS edges** (Module ↔ Function/Class/Interface)

**Why start here:**
1. Simplest - parent-child already tracked in `ParsedNode.children`
2. Highest value - most common query pattern
3. No complex analysis needed - just use existing data structure

**Deferred to Phase 1B:**
- USES edges (requires dependency analysis)
- IMPORTS edges (requires import statement parsing)

### Data Source

**Parent-child relationships already exist in ParsedNode:**

```typescript
interface ParsedNode {
  id: number;
  name: string;
  kind: number;
  filePath: string;
  children: ParsedNode[];  // ← Already populated!
  // ...
}
```

**Example from parser.ts:205-206:**
```typescript
// If we processed the parent, attach children to it
if (results.length > 0 && shouldGenerateEmbedding(node.kind)) {
  const parent = results[results.length - 1 - childNodes.length];
  if (parent && parent.id === node.id) {
    parent.children.push(...childNodes);  // ← Children tracked here!
  }
}
```

---

## Implementation Plan

### Step 1: Create Edge Insertion Function

**File**: `database.ts`

Add new function to create CONTAINS edge:

```typescript
/**
 * Create CONTAINS edge between parent and child nodes
 *
 * Links a container (module/class) to its contained nodes (functions/methods)
 *
 * @param db - SurrealDB instance
 * @param parentTable - Table name of parent ('module_node', 'class_node')
 * @param parentId - nodeId of parent
 * @param childTable - Table name of child ('function_node', 'class_node', etc)
 * @param childId - nodeId of child
 */
export async function createContainsEdge(
  db: Surreal,
  parentTable: string,
  parentId: number,
  childTable: string,
  childId: number
): Promise<void> {
  await db.query(`
    RELATE ${parentTable}:${parentId}->CONTAINS->${childTable}:${childId}
  `);
}
```

### Step 2: Create Batch Edge Function

**File**: `database.ts`

Add function to create all edges for a node's children:

```typescript
/**
 * Create CONTAINS edges for all children of a parent node
 *
 * @param db - SurrealDB instance
 * @param parentNode - Parent node with children
 */
export async function createContainsEdgesForNode(
  db: Surreal,
  parentNode: ParsedNode
): Promise<void> {
  if (!parentNode.children || parentNode.children.length === 0) {
    return;
  }

  const parentTable = getTableNameForKind(parentNode.kind);

  for (const child of parentNode.children) {
    const childTable = getTableNameForKind(child.kind);

    await createContainsEdge(
      db,
      parentTable,
      parentNode.id,
      childTable,
      child.id
    );

    // Recursively create edges for child's children
    if (child.children && child.children.length > 0) {
      await createContainsEdgesForNode(db, child);
    }
  }
}

/**
 * Get table name for a node kind
 */
function getTableNameForKind(kind: number): string {
  switch (kind) {
    case NodeKind.Function:
      return 'function_node';
    case NodeKind.Class:
      return 'class_node';
    case NodeKind.Module:
      return 'module_node';
    case NodeKind.Interface:
      return 'interface_node';
    case NodeKind.TypeAlias:
      return 'type_alias_node';
    case NodeKind.Method:
      return 'function_node'; // Methods stored as functions
    default:
      throw new Error(`Unknown kind: ${kind}`);
  }
}
```

### Step 3: Call During Node Insertion

**File**: `sync.ts`

Modify `syncFile()` to create edges after inserting nodes:

```typescript
// In syncFile() after creating/updating nodes:

// Create CONTAINS edges for parent-child relationships
logger.info('Creating CONTAINS edges...', { filePath });
for (const node of localNodes) {
  if (node.children && node.children.length > 0) {
    await createContainsEdgesForNode(db, node);
  }
}
logger.success('✓ CONTAINS edges created', { filePath });
```

### Step 4: Update Existing createRelationships Stub

**File**: `database.ts` (line 625)

Replace the stub with actual implementation:

```typescript
/**
 * Create CONTAINS relationships for all nodes
 *
 * WARNING: This recreates ALL edges - expensive operation!
 * Prefer createContainsEdgesForNode() during incremental sync.
 *
 * Use this only for:
 * - Initial full database population
 * - Repair/rebuild after edge deletion
 *
 * @param db - SurrealDB instance
 */
export async function createRelationships(db: Surreal): Promise<void> {
  logger.info('Creating all CONTAINS relationships...');

  // Get all nodes grouped by file
  const jdoc = await loadJdoc();
  const allNodes = extractAllNodes(jdoc);
  const nodesByFile = groupNodesByFile(allNodes);

  let edgeCount = 0;

  for (const [filePath, nodes] of nodesByFile) {
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        await createContainsEdgesForNode(db, node);
        edgeCount += node.children.length;
      }
    }
  }

  logger.success('✓ Relationships created', { edges: edgeCount });
}
```

---

## Touchpoints & Files to Update

### 1. Core Implementation Files

#### `database.ts`
- ✅ Already exports: `createRelationships` (stub - replace)
- ➕ Add: `createContainsEdge()`
- ➕ Add: `createContainsEdgesForNode()`
- ➕ Add: `getTableNameForKind()` helper
- ➕ Update: exports to include new functions

#### `sync.ts`
- ➕ Import: `createContainsEdgesForNode` from database.ts
- ➕ Modify: `syncFile()` to call edge creation after node insertion
- ➕ Add: logging for edge creation step

#### `index.ts`
- ➕ Export: new edge functions (if public API)

---

### 2. Type Definitions

#### `types.ts`
No changes needed - ParsedNode already has `children: ParsedNode[]`

---

### 3. Testing Files

#### `tests/database.test.ts`
➕ **Add new test suite**: "Database - CONTAINS Edges"

```typescript
runner.suite('Database - CONTAINS Edges');

// Create a module node with child functions
const moduleNode: ModuleNode = {
  nodeId: TEST_MODULE_ID,
  name: 'TEST_module',
  filePath: TEST_FILE_PATH,
  kind: NodeKind.Module,
  // ...
};

const childFunction: FunctionNode = {
  nodeId: TEST_CHILD_ID,
  name: 'TEST_child_function',
  filePath: TEST_FILE_PATH,
  kind: NodeKind.Function,
  // ...
};

// Insert module and function
await insertModuleNode(db, moduleNode);
await insertFunctionNode(db, childFunction);

// Create CONTAINS edge
await createContainsEdge(db, 'module_node', TEST_MODULE_ID, 'function_node', TEST_CHILD_ID);

runner.test('createContainsEdge creates relationship', async () => {
  const [edges] = await db.query('SELECT * FROM CONTAINS WHERE in = module_node:$moduleId', {
    moduleId: TEST_MODULE_ID
  });
  assert(edges.length > 0, 'Should have CONTAINS edge');
  assertEqual(edges[0].out, `function_node:${TEST_CHILD_ID}`);
});
```

#### `tests/check_edges.ts` (existing helper)
✅ Already exists - use to validate edges after sync

---

### 4. Build & Deployment

#### `build.sh`
✅ Already compiles all source files - no changes needed

#### `tests/build_tests.sh`
✅ Already compiles database.test.ts - no changes needed

---

### 5. Documentation

#### `README.md`
➕ Update: Note that CONTAINS edges are implemented

#### `instructions.md`
➕ Update: Step 4 validation to include edge verification

#### `introspection_implementation_roadmap.md`
➕ Update: Mark relationship creation as complete

---

## Validation & Testing

### Unit Tests

**File**: `tests/database.test.ts`

```typescript
runner.suite('Database - CONTAINS Edges');

// Test 1: Create single edge
runner.test('createContainsEdge creates relationship', async () => {
  // Setup: Insert parent and child nodes
  // Action: Create edge
  // Assert: Edge exists and points correctly
});

// Test 2: Create edges for node with children
runner.test('createContainsEdgesForNode creates all child edges', async () => {
  // Setup: Create node with 3 children
  // Action: Call createContainsEdgesForNode
  // Assert: 3 edges created
});

// Test 3: Recursive edge creation
runner.test('createContainsEdgesForNode handles nested children', async () => {
  // Setup: Module -> Class -> Methods (2 levels)
  // Action: Call createContainsEdgesForNode on module
  // Assert: Edges for both levels created
});

// Test 4: Edge cleanup
runner.test('cleanupAllTables removes CONTAINS edges', async () => {
  // Already implemented - verifies cleanup works
});
```

### Integration Testing

**Manual test sequence:**

```bash
# 1. Clean database
cd tests
source ~/.bashrc
node dist/check_edges.js
# Expected: 0 CONTAINS edges

# 2. Run filtered sync
cd ..
source ~/.bashrc
node dist/run_filtered_sync.js packages/ts_web/src/apis

# 3. Verify edges created
cd tests
node dist/check_edges.js
# Expected: ~68 CONTAINS edges (modules -> functions)

# 4. Query specific edges
node -e "
import { connect, disconnect } from '../database';
const db = await connect();
const [edges] = await db.query(\"SELECT * FROM CONTAINS LIMIT 10\");
console.log('Sample edges:', edges);
await disconnect(db);
"
```

### Validation Queries

**After implementation, these should return data:**

```typescript
// 1. Count CONTAINS edges
const [count] = await db.query('SELECT COUNT() as count FROM CONTAINS GROUP ALL');
// Expected: ~68 for web.apis module

// 2. Find what a module contains
const [functions] = await db.query(`
  SELECT ->CONTAINS->function_node.*
  FROM module_node
  WHERE name = 'apis'
`);
// Expected: Array of function nodes

// 3. Find which module contains a function
const [module] = await db.query(`
  SELECT <-CONTAINS<-module_node.*
  FROM function_node
  WHERE name = 'initialize_microphone'
`);
// Expected: web_audio module

// 4. Traverse nested containment
const [nested] = await db.query(`
  SELECT ->CONTAINS->()->CONTAINS->()
  FROM module_node
  WHERE path CONTAINS 'apis'
`);
// Expected: Nested structure of modules -> classes -> methods
```

---

## Edge Cases & Considerations

### 1. Orphaned Nodes
**Issue**: What if a node has no parent?
**Solution**: Top-level functions in a file should be linked to their module node

### 2. Duplicate Edges
**Issue**: Re-running sync might create duplicate edges
**Solution**:
- Option A: Delete existing edges before creating new ones
- Option B: Use SurrealDB UNIQUE constraint on edge
- **Recommendation**: Option A - delete file's edges before recreating

### 3. Edge Deletion During Incremental Updates
**Issue**: If a node is deleted, its edges should be deleted
**Solution**: Add CASCADE delete to schema, or manually delete edges

### 4. Performance
**Issue**: Creating edges one-by-one might be slow
**Solution**: Batch edge creation with single query

**Optimized batch approach:**
```typescript
export async function createContainsEdgesBatch(
  db: Surreal,
  edges: Array<{
    parentTable: string;
    parentId: number;
    childTable: string;
    childId: number;
  }>
): Promise<void> {
  if (edges.length === 0) return;

  // Build batch RELATE query
  const queries = edges.map(edge =>
    `RELATE ${edge.parentTable}:${edge.parentId}->CONTAINS->${edge.childTable}:${edge.childId}`
  ).join('; ');

  await db.query(queries);
}
```

---

## Implementation Checklist

### Phase 1A: CONTAINS Edges

- [ ] **1. Core Functions** (database.ts)
  - [ ] Implement `createContainsEdge()`
  - [ ] Implement `createContainsEdgesForNode()`
  - [ ] Implement `getTableNameForKind()`
  - [ ] Replace `createRelationships()` stub
  - [ ] Add batch optimization (optional)
  - [ ] Export new functions

- [ ] **2. Sync Integration** (sync.ts)
  - [ ] Import edge functions
  - [ ] Call `createContainsEdgesForNode()` in `syncFile()`
  - [ ] Add edge creation logging
  - [ ] Handle edge deletion before recreation

- [ ] **3. Testing** (tests/database.test.ts)
  - [ ] Add CONTAINS edge test suite
  - [ ] Test single edge creation
  - [ ] Test batch edge creation
  - [ ] Test recursive edge creation
  - [ ] Test edge cleanup
  - [ ] Update test count in README

- [ ] **4. Build & Compile**
  - [ ] Compile source: `./build.sh`
  - [ ] Compile tests: `cd tests && ./build_tests.sh`
  - [ ] Run unit tests: `./run_tests.sh`
  - [ ] Verify all tests pass

- [ ] **5. Integration Testing**
  - [ ] Run filtered sync on web.apis
  - [ ] Verify edges created: `node dist/check_edges.js`
  - [ ] Run validation queries
  - [ ] Verify edge counts match node counts

- [ ] **6. Documentation**
  - [ ] Update README.md test count
  - [ ] Update instructions.md validation steps
  - [ ] Mark roadmap as complete

---

## Success Criteria

### Definition of Done

✅ **Unit tests pass**
- database.test.ts has CONTAINS edge tests
- All 8 test suites pass (now testing edges)

✅ **Integration tests pass**
- Filtered sync creates edges
- check_edges.js shows non-zero edge counts
- Validation queries return expected results

✅ **Query functionality works**
- Can query "what does module X contain?"
- Can query "what module contains function Y?"
- Can traverse nested containment

✅ **Incremental updates work**
- Re-running sync doesn't duplicate edges
- Deleted nodes remove their edges
- Changed nodes update their edges

---

## Future Phases (Out of Scope for Now)

### Phase 1B: USES Edges
- Analyze function calls within function bodies
- Extract dependencies from AST or type references
- Create USES edges between functions

### Phase 1C: IMPORTS Edges
- Parse import statements from source files
- Create IMPORTS edges between modules
- Build module dependency graph

### Phase 2: Query API
- Create high-level query functions
- Expose graph traversal helpers
- Build RAG query interface

---

## Questions Before Implementation

1. **Edge deletion strategy**: Delete all edges for a file before recreating, or update incrementally?
   - **Recommendation**: Delete and recreate (simpler, safer)

2. **Batch optimization**: Create edges one-by-one or batch?
   - **Recommendation**: Start one-by-one, optimize if slow

3. **Module nodes**: Do we need to create module nodes explicitly, or infer from file paths?
   - **Current**: Modules are extracted as nodes (kind: 4)
   - **Action**: Verify modules are being inserted

4. **Testing scope**: Test edges in unit tests, integration tests, or both?
   - **Recommendation**: Both - unit tests for edge creation, integration for full sync

5. **Error handling**: What if edge creation fails? Rollback node insertion?
   - **Recommendation**: Log error, continue (edges can be recreated later)

---

## Estimated Effort

**Implementation**: 2-3 hours
- Core functions: 1 hour
- Sync integration: 30 min
- Testing: 1-1.5 hours

**Validation**: 30 min
- Run tests
- Verify queries
- Check edge counts

**Total**: 2.5-3.5 hours

---

## Dependencies

**Required before starting:**
- ✅ Schema defines CONTAINS table
- ✅ ParsedNode has children array
- ✅ Node insertion works
- ✅ Test infrastructure exists

**No blockers** - ready to implement!
