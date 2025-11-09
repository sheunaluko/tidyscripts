# Import Edge Refactoring Plan

## Goal

Refactor the introspection system to have a clear semantic distinction between edge types:

- **IMPORTS**: Module→Module relationships (based on actual import statements)
- **CONTAINS**: All other hierarchical relationships (Module→Function, Module→Class, Class→Method, etc.)

## Current State (Problem)

Currently, the system can create CONTAINS edges for module→module relationships when TypeDoc shows modules as children of other modules (e.g., namespace modules, index modules that re-export). This creates semantic confusion:

```
module A CONTAINS module B  ← Unclear: is this a file structure or import?
module A IMPORTS module B   ← Clear: A imports from B
```

## Target State (Solution)

After refactoring:

```
# Hierarchical structure (what owns what)
module → function:  CONTAINS ✓
module → class:     CONTAINS ✓
module → interface: CONTAINS ✓
class → method:     CONTAINS ✓
class → property:   CONTAINS ✓

# Dependencies (what uses what)
module → module:    IMPORTS only ✓
```

## Implementation Plan

### Phase 1: Investigate Current Behavior

**Goal**: Understand if/when module→module CONTAINS edges are currently created

**Tasks**:
1. Query database to check for existing module→module CONTAINS edges:
   ```sql
   SELECT * FROM CONTAINS
   WHERE in.id LIKE 'module_node:%'
   AND out.id LIKE 'module_node:%';
   ```

2. Examine TypeDoc output (jdoc.json) to see when modules are children of modules:
   - Look for nested namespace declarations
   - Check index files that re-export other modules
   - Identify any module hierarchy patterns

3. Review `parser.ts` to understand how parent-child relationships are built:
   - Check `traverseNodes()` function
   - See how children arrays are populated
   - Determine if modules ever have module children

**Estimated Time**: 30 minutes

**Deliverables**:
- Count of existing module→module CONTAINS edges (if any)
- List of cases where modules have module children
- Understanding of impact scope

---

### Phase 2: Update Edge Creation Logic

**Goal**: Modify edge creation to skip module→module CONTAINS edges

**File**: `database.ts`

**Tasks**:

1. **Update `collectContainsEdges()` function** (line ~725):
   ```typescript
   // BEFORE:
   function collectContainsEdges(parentNode, edges = []) {
     const parentTable = getTableNameForKind(parentNode.kind);
     for (const child of parentNode.children) {
       const childTable = getTableNameForKind(child.kind);
       edges.push({ parentTable, parentId, childTable, childId });
     }
   }

   // AFTER:
   function collectContainsEdges(parentNode, edges = []) {
     const parentTable = getTableNameForKind(parentNode.kind);

     for (const child of parentNode.children) {
       const childTable = getTableNameForKind(child.kind);

       // Skip module→module relationships - use IMPORTS instead
       const isModuleToModule =
         parentTable === 'module_node' && childTable === 'module_node';

       if (!isModuleToModule) {
         edges.push({ parentTable, parentId, childTable, childId });
       }
     }
   }
   ```

2. **Add logging** to track skipped module→module edges:
   ```typescript
   if (isModuleToModule) {
     logger.debug('Skipping module→module CONTAINS edge (use IMPORTS instead)', {
       parentId: parentNode.id,
       childId: child.id,
     });
   }
   ```

3. **Update JSDoc comments** on edge functions to clarify:
   ```typescript
   /**
    * Collect CONTAINS edges from a node to its IMMEDIATE children.
    *
    * Note: Module→Module edges are NOT created as CONTAINS edges.
    * Module dependencies should use IMPORTS edges instead.
    *
    * @param parentNode - Parent node with children array
    * @returns Array of edge definitions (excludes module→module)
    */
   ```

**Estimated Time**: 20 minutes

**Files Modified**: `database.ts`

---

### Phase 3: Update Tests

**Goal**: Ensure tests reflect the new edge semantics

**File**: `tests/database.test.ts`

**Tasks**:

1. **Add test for module→module skip**:
   ```typescript
   // Test: Module→Module CONTAINS edges should not be created
   const parentModule = {
     id: 1000,
     kind: NodeKind.Module,
     children: [
       { id: 2000, kind: NodeKind.Module, children: [] }, // Child module
       { id: 3000, kind: NodeKind.Function, children: [] } // Child function
     ]
   };

   const edgeCount = await createContainsEdgesForNode(db, parentModule);

   runner.test('module→module CONTAINS edges not created', async () => {
     assertEqual(edgeCount, 1, 'Should only create 1 edge (module→function, not module→module)');

     // Verify only function edge exists
     const [edges] = await db.query(`
       SELECT * FROM CONTAINS WHERE in = module_node:1000
     `);
     assertEqual(edges.length, 1, 'Should have 1 CONTAINS edge');
     assertEqual(edges[0].out, 'function_node:3000', 'Edge should point to function, not module');
   });
   ```

2. **Update existing tests** that might assume module→module CONTAINS edges

3. **Add documentation** to test file explaining the edge semantics

**Estimated Time**: 30 minutes

**Files Modified**: `tests/database.test.ts`

---

### Phase 4: Database Migration (if needed)

**Goal**: Clean up any existing module→module CONTAINS edges

**Tasks**:

1. **Create migration script** `migrations/remove_module_contains_edges.ts`:
   ```typescript
   /**
    * Migration: Remove module→module CONTAINS edges
    *
    * These should be IMPORTS edges instead.
    * Removes edges where both in and out are module_node records.
    */

   import { connect, disconnect } from '../database';
   import { logger } from '../logger';

   async function migrate() {
     const db = await connect();

     // Count edges to remove
     const [beforeCount] = await db.query(`
       SELECT count() FROM CONTAINS
       WHERE in.id LIKE 'module_node:%'
       AND out.id LIKE 'module_node:%'
     `);

     logger.info('Module→Module CONTAINS edges found', {
       count: beforeCount[0]?.count || 0
     });

     // Delete module→module CONTAINS edges
     await db.query(`
       DELETE CONTAINS
       WHERE in.id LIKE 'module_node:%'
       AND out.id LIKE 'module_node:%'
     `);

     // Verify deletion
     const [afterCount] = await db.query(`
       SELECT count() FROM CONTAINS
       WHERE in.id LIKE 'module_node:%'
       AND out.id LIKE 'module_node:%'
     `);

     logger.info('Migration complete', {
       removed: beforeCount[0]?.count || 0,
       remaining: afterCount[0]?.count || 0
     });

     await disconnect(db);
   }

   migrate().catch(console.error);
   ```

2. **Run migration** on production database (if module→module edges exist)

3. **Verify** IMPORTS edges exist for those module relationships

**Estimated Time**: 20 minutes (only if migration needed)

**Files Created**: `migrations/remove_module_contains_edges.ts`

---

### Phase 5: Documentation Updates

**Goal**: Document the edge semantics clearly

**Tasks**:

1. **Update README.md** with edge type definitions:
   ```markdown
   ## Graph Edge Types

   The introspection system creates two types of edges:

   ### CONTAINS Edges (Hierarchical Structure)

   Represents "owns" or "defines" relationships:

   - `module → function`: Module defines/exports this function
   - `module → class`: Module defines/exports this class
   - `module → interface`: Module defines this interface
   - `class → method`: Class defines this method
   - `class → property`: Class defines this property

   **Note**: Module→Module relationships do NOT use CONTAINS edges.

   ### IMPORTS Edges (Dependencies)

   Represents "depends on" or "uses" relationships:

   - `module → module`: Module imports from another module

   Based on actual `import` statements in source code.
   ```

2. **Update schema.ts** comments:
   ```typescript
   // CONTAINS relationship: Parent -> Child (hierarchical structure)
   // NOTE: Module→Module relationships use IMPORTS instead
   DEFINE TABLE CONTAINS TYPE RELATION SCHEMAFULL;
   ```

3. **Update edge_implementation_roadmap.md**:
   - Add note about module→module exclusion from CONTAINS
   - Explain semantic distinction between CONTAINS and IMPORTS

4. **Update instructions.md**:
   - Update example queries to reflect edge semantics
   - Add examples of CONTAINS vs IMPORTS usage

**Estimated Time**: 30 minutes

**Files Modified**:
- `README.md`
- `schema.ts`
- `edge_implementation_roadmap.md`
- `instructions.md`

---

### Phase 6: Validation & Testing

**Goal**: Ensure refactoring works correctly end-to-end

**Tasks**:

1. **Run all unit tests**:
   ```bash
   cd tests
   ./build_tests.sh
   ./run_tests.sh
   ```
   Expected: All tests pass

2. **Run database integration tests**:
   ```bash
   tsc --skipLibCheck database.test.ts
   node dist/tests/database.test.js
   ```
   Expected: New test for module→module skip passes

3. **Run filtered sync** on test module:
   ```bash
   node -e "import('./dist/sync.js').then(m => m.fullSync('packages/ts_web/src/apis'))"
   ```

4. **Validate edge counts**:
   ```sql
   -- Should be 0 after refactoring
   SELECT count() FROM CONTAINS
   WHERE in.id LIKE 'module_node:%'
   AND out.id LIKE 'module_node:%';

   -- Should have edges (from import parsing)
   SELECT count() FROM IMPORTS;

   -- Should have edges (module→function, class→method, etc.)
   SELECT count() FROM CONTAINS;
   ```

5. **Test queries**:
   ```sql
   -- What does this module contain? (functions, classes)
   SELECT ->CONTAINS->(function_node, class_node).name
   FROM module_node
   WHERE path = 'packages/ts_web/src/apis/index.ts';

   -- What does this module import? (other modules)
   SELECT ->IMPORTS->module_node.path
   FROM module_node
   WHERE path = 'packages/ts_web/src/apis/index.ts';
   ```

**Estimated Time**: 45 minutes

---

## Summary

### Total Estimated Time
- Phase 1 (Investigation): 30 min
- Phase 2 (Code changes): 20 min
- Phase 3 (Tests): 30 min
- Phase 4 (Migration): 20 min (if needed)
- Phase 5 (Documentation): 30 min
- Phase 6 (Validation): 45 min

**Total: ~2.5 hours** (without migration) or **~3 hours** (with migration)

### Risk Assessment

**Low Risk** - This is a surgical change:
- ✅ Only affects one function (`collectContainsEdges`)
- ✅ Existing IMPORTS functionality unchanged
- ✅ All other CONTAINS edges (module→function, etc.) unchanged
- ✅ Backward compatible (old edges can be cleaned up via migration)
- ✅ Easy to test and validate

### Success Criteria

After refactoring:
- [ ] Zero module→module CONTAINS edges in database
- [ ] IMPORTS edges exist for module→module dependencies
- [ ] All other CONTAINS edges still created correctly
- [ ] All tests passing
- [ ] Documentation clearly explains edge semantics
- [ ] Example queries work as expected

---

## Future Enhancements (Post-Refactoring)

Once the basic refactoring is complete, consider:

1. **Add edge metadata**:
   ```typescript
   DEFINE FIELD import_type ON IMPORTS TYPE string;  // 'named', 'default', 'namespace'
   DEFINE FIELD visibility ON CONTAINS TYPE string;  // 'public', 'private', 'protected'
   ```

2. **Circular dependency detection**:
   ```sql
   -- Find modules that import each other
   SELECT * FROM IMPORTS WHERE out IN (SELECT <-IMPORTS<-.in FROM $parent.in);
   ```

3. **Export tracking**:
   - Track which functions/classes are actually exported from module index
   - Add `is_exported` field to CONTAINS edges
   - Query only public API vs internal code

4. **Dependency graph visualization**:
   - Use IMPORTS edges to build module dependency graph
   - Identify heavily-depended-on modules
   - Find isolated modules (no imports/importers)

---

## Questions to Consider

Before starting implementation, decide:

1. **Do we ever see module→module in jdoc.json children?**
   - If no: Refactoring is preventative (good practice)
   - If yes: Refactoring is necessary (fixes actual issue)

2. **Should we preserve any module→module CONTAINS edges?**
   - Namespace modules that "contain" other modules?
   - Index modules that re-export child modules?
   - Or strictly use IMPORTS for all module→module?

3. **Migration strategy**:
   - Delete all module→module CONTAINS edges?
   - Or keep some and add metadata to distinguish?

**Recommendation**: Start simple - exclude all module→module from CONTAINS, rely on IMPORTS for module dependencies.
