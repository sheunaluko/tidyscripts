# Edge Counting Discrepancy - Investigation Summary

**Date:** 2025-11-07
**Status:** CRITICAL BUG FOUND - Parser was broken, database may contain incorrect edges

---

## The Core Problem

**Original symptom:** `analyzeSync()` predicted 17 edges, actual sync created 19 edges.

**Critical realization:** If the parser (`traverseNodes`) was broken when we ran the sync, then the 19 edges in the database are ALSO wrong! We can't trust either number.

---

## Bug Found and Fixed

### Location: `parser.ts` line 203

**Broken code:**
```typescript
// Used index arithmetic to find parent - WRONG!
const parent = results[results.length - 1 - childNodes.length];
if (parent && parent.id === node.id) {
  parent.children.push(...childNodes);
}
```

**Fixed code:**
```typescript
// Find parent by ID and only add immediate child
if (shouldGenerateEmbedding(node.kind) && childNodes.length > 0) {
  const parent = results.find(r => r.id === node.id);
  const immediateChild = childNodes[0];
  if (parent && immediateChild && shouldGenerateEmbedding(child.kind)) {
    parent.children.push(immediateChild);
  }
}
```

### What the bug did:

**Example with `apis` module (id 4461):**

Raw jdoc.json shows:
```
apis (id 4461) has 11 children:
  - key_presses, bind_sounds_to_keys, local_storage, openai,
    webtransport, firebase, midi, sensor, db, bokeh, web_audio
```

Broken parser returned:
```
apis (id 4461) has 4 children:
  - bind_sounds_to_keys (CORRECT - from bind_sounds_to_keys.ts)
  - keys_to_notes_1 (WRONG - internal to bind_sounds_to_keys.ts)
  - load_sound_key_handler (WRONG - internal to bind_sounds_to_keys.ts)
  - sound_key_handler (WRONG - internal to bind_sounds_to_keys.ts)
```

Children were attached to WRONG parents due to buggy index arithmetic!

---

## Evidence of Bug

### Test 1: Check raw jdoc.json
```bash
node -e "
const fs = require('fs');
const jdoc = JSON.parse(fs.readFileSync('jdoc.json'));
// Find apis module id 4461
// Shows: 11 children ✓ CORRECT
"
```

### Test 2: Check parsed output
```bash
node -e "
const { loadJdoc, extractAllNodes } = require('./dist/parser.js');
// Find apis module
// Shows: 4 children ✗ WRONG (with broken parser)
// Shows: 11 children ✓ CORRECT (after fix)
"
```

---

## Current State

### Tests Added
**File:** `tests/parser.test.ts`

Two new tests:
1. ✅ `traverseNodes preserves parent-child relationships correctly` - Tests 5 children
2. ✅ `traverseNodes handles nested children correctly` - Tests nested structure

Both tests PASS with the fixed code.

### Problem: Tests use mock data, not real jdoc structure!

The tests use simplified mock JDocNode objects. We need tests that match the actual complexity of real TypeDoc output.

---

## What We DON'T Know

1. **Are the 19 edges in the database correct?**
   - Sync ran with broken parser → edges might be wrong
   - Need to clear DB and re-sync with fixed parser

2. **What should the correct edge count be?**
   - Can't trust old prediction (17) - used broken parser
   - Can't trust database count (19) - created with broken parser
   - Need to re-run everything with fixed parser

3. **How does edge creation actually work?**
   - Does it create edges for ALL parent-child pairs?
   - Or only for top-level nodes per file?
   - Or only for certain node types?

---

## Next Steps

### 1. Create comprehensive parser tests with real jdoc structure

**File:** `tests/parser.test.ts`

Add tests that mirror actual TypeDoc output structure:

```typescript
// Test case: Module with re-exports (like apis/index.ts)
// - Should have 11 children (all re-exported modules)
// - Children come from different files
// - Should NOT include nested items from children

// Test case: Module with functions (like bind_sounds_to_keys.ts)
// - Module has 4 children (3 functions + 1 variable)
// - All from same file
// - Correct parent-child linkage

// Test case: Nested modules (like midi/index.ts)
// - Module re-exports sub-modules
// - Sub-modules have their own children
// - Verify edge counts at each level
```

### 2. Extract real jdoc snippets for test data

Instead of hand-crafting mock data, extract actual node structures from jdoc.json:

```bash
# Extract apis module structure
node -e "
const jdoc = require('./jdoc.json');
// Find node 4461 (apis)
// Print its structure
// Use as test data
"
```

### 3. Re-sync with fixed parser

```bash
# IMPORTANT: Clear database first!
# Then re-run sync with fixed parser
node dist/run_filtered_sync.js packages/ts_web/src/apis
```

### 4. Compare predictions vs actual

```bash
# Run analyzeSync (prediction)
node -e "analyzeSync('packages/ts_web/src/apis').then(console.log)"

# Run validation (actual from DB)
node dist/validate.js

# Compare the two
```

---

## Key Questions to Answer

1. **How many edges SHOULD be created for index.ts?**
   - 11 (one per re-exported module)?
   - 5 (what the broken sync created)?
   - Something else?

2. **What is the semantic meaning of CONTAINS edges?**
   - ALL parent-child relationships in the code tree?
   - Only direct containment (module contains its own functions)?
   - Should cross-file re-exports create edges?

3. **At what level does edge creation happen?**
   - Per file (once for root node of each file)?
   - Per node (for every node that has children)?
   - Filtered by some criteria?

---

## Files Modified

1. ✅ `parser.ts` - Fixed `traverseNodes()` bug (line 195-210)
2. ✅ `tests/parser.test.ts` - Added 2 basic tests
3. ⚠️ `sync.ts` - Added `analyzeSync()` (may need adjustment)

---

## Commands to Re-test

```bash
# 1. Run parser tests
cd tests && ./build_tests.sh && ./run_tests.sh

# 2. CLEAR DATABASE (important!)
# (manual step - need to drop/recreate tables or namespace)

# 3. Re-sync with fixed parser
tsc --skipLibCheck --target ES2020 --module commonjs --outDir dist run_filtered_sync.ts
node dist/run_filtered_sync.js packages/ts_web/src/apis

# 4. Check results
node dist/validate.js

# 5. Compare with prediction
node -e "const { analyzeSync } = require('./dist/sync.js'); analyzeSync('packages/ts_web/src/apis').then(console.log)"
```

---

## Priority Actions

**IMMEDIATE:**
1. ✅ Parser bug fixed
2. ✅ Basic tests added
3. ⚠️ Need better tests with real jdoc structures
4. ⚠️ Need to clear DB and re-sync
5. ⚠️ Need to validate fix worked

**NEXT SESSION:**
1. Extract real jdoc node structures for test data
2. Create comprehensive parser tests
3. Clear database
4. Re-run sync with fixed parser
5. Verify edge counts match expectations
6. Document edge creation semantics

---

## Success Criteria

- [ ] Parser tests use realistic jdoc structures
- [ ] Parser tests cover all edge cases (re-exports, nesting, cross-file)
- [ ] Database cleared and re-synced with fixed parser
- [ ] `analyzeSync()` prediction matches actual database count
- [ ] Edge creation semantics clearly documented
- [ ] All tests pass

---

## Bottom Line

**The parser was broken. We fixed it. But now we need to:**
1. Test it properly with real data structures
2. Re-sync the database with the fixed parser
3. Verify everything works correctly

**We can't trust any previous edge counts** because they were all created/predicted with the broken parser.
