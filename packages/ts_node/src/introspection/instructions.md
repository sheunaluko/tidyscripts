# Testing & Running Tidyscripts Introspection System

## 🎯 Current Status

**✅ Part 1 Implementation COMPLETE**

All 13 modules have been implemented with the following enhancements:
- ✅ All core modules (types → sync)
- ✅ Structured logging integrated across all modules
- ✅ SurrealDB API updated to new 'surrealdb' package
- ✅ Unit tests created for 6 core modules
- ✅ Validation script ready

**Your Mission**: Test the modules, run a full sync, debug any issues, and validate the database.

---

## 📋 Implementation Review

### Core Modules (All Implemented)

```
✅ types.ts         - TypeScript interfaces and type definitions
✅ constants.ts     - NodeKind enums and constants
✅ config.ts        - Environment variable configuration
✅ logger.ts        - Structured logging with timestamps & context
✅ parser.ts        - JSON parsing and traversal (with logger)
✅ hasher.ts        - Two-hash strategy implementation
✅ embeddings.ts    - OpenAI integration (on-demand init, with logger)
✅ schema.ts        - SurrealDB schema definition
✅ database.ts      - Connection & CRUD (new API, with logger)
✅ reconciler.ts    - Batch reconciliation (with logger)
✅ sync.ts          - Main synchronization (with logger)
✅ validate.ts      - Database validation (with logger)
✅ index.ts         - Public API exports
```

### Test Files Created

```
✅ tests/test-runner.ts     - Simple test framework
✅ tests/constants.test.ts  - NodeKind values & helpers
✅ tests/config.test.ts     - Config loading & validation
✅ tests/hasher.test.ts     - Hashing functions
✅ tests/parser.test.ts     - Docstring & type parsing
✅ tests/embeddings.test.ts - Embedding text generation
✅ tests/reconciler.test.ts - Reconciliation logic
✅ tests/run-all.ts         - Master test runner
```

### Documentation Files

```
✅ README.md                              - Complete usage documentation
✅ LOGGING.md                             - Logging guide
✅ introspection_implementation_roadmap.md - Part 1 implementation details
✅ introspection_querying_roadmap.md      - Part 2 (future)
```

---

## 🧪 Step 1: Run Unit Tests

Start by testing individual modules to ensure they work in isolation.

### Run All Tests

```bash
cd /home/oluwa/dev/tidyscripts/packages/ts_node/src/introspection

# Run all unit tests
ts-node tests/run-all.ts
```

### Run Individual Tests

If you want to test modules one by one:

```bash
# Test constants
ts-node tests/constants.test.ts

# Test configuration
ts-node tests/config.test.ts

# Test hashing
ts-node tests/hasher.test.ts

# Test parser
ts-node tests/parser.test.ts

# Test embeddings (text generation only, no API calls)
ts-node tests/embeddings.test.ts

# Test reconciler
ts-node tests/reconciler.test.ts
```

### Expected Output

Each test should show:
```
Running tests for <module>...
  ✅ Test name 1
  ✅ Test name 2
  ...
All tests passed!
```

### If Tests Fail

1. **Read the error carefully** - It will tell you which assertion failed
2. **Check the module** - Look at the implementation
3. **Fix the issue** - Update the code
4. **Re-run the test**

---

## ⚙️ Step 2: Set Up Prerequisites

Before running a full sync, ensure all dependencies are ready.

### 2.1 Verify SurrealDB Connection

**Note**: This setup uses a **remote SurrealDB instance** - no local start needed!

Your environment variables are already configured. Verify they're set:

```bash
# Check SurrealDB connection settings
echo $TS_INTROSPECTION_SURREAL_URL
echo $TS_INTROSPECTION_SURREAL_NAMESPACE
echo $TS_INTROSPECTION_SURREAL_DATABASE

# Check OpenAI API key is set
echo $OPENAI_API_KEY | head -c 10  # Show first 10 chars only
```

**Environment variables should already be set**:
- `OPENAI_API_KEY` - Your OpenAI API key
- `TS_INTROSPECTION_SURREAL_URL` - Remote SurrealDB URL
- `TS_INTROSPECTION_SURREAL_NAMESPACE` - Database namespace
- `TS_INTROSPECTION_SURREAL_DATABASE` - Database name
- `TS_INTROSPECTION_SURREAL_USER` - Database user (if authenticated)
- `TS_INTROSPECTION_SURREAL_PASSWORD` - Database password (if authenticated)
- `TS_INTROSPECTION_JDOC_PATH` - Path to jdoc.json (optional)
- `TS_INTROSPECTION_LOG_LEVEL` - Logging level (optional, defaults to INFO)

### 2.2 Adjust Logging Level (Optional)

If you want more detailed output for debugging:

```bash
# For detailed debugging (see everything)
export TS_INTROSPECTION_LOG_LEVEL='DEBUG'

# For clean output (default - major operations only)
export TS_INTROSPECTION_LOG_LEVEL='INFO'

# For errors only
export TS_INTROSPECTION_LOG_LEVEL='ERROR'
```

### 2.3 Verify jdoc.json Exists

```bash
ls -lh /home/oluwa/dev/tidyscripts/apps/docs/jdoc.json
# Should show: -rw-r--r-- ... 3.4M ... jdoc.json
```

If missing, generate it with TypeDoc from your project root.

---

## 🚀 Step 3: Run Initial Full Sync

Now attempt your first full synchronization.

### 3.1 Test Database Connection First

Before the full sync, test that you can connect:

```bash
cd /home/oluwa/dev/tidyscripts/packages/ts_node/src/introspection

# Quick connection test
ts-node -e "
import { connect, disconnect } from './database.js';
(async () => {
  try {
    const db = await connect();
    console.log('✅ Connected to SurrealDB!');
    await disconnect(db);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
})();
"
```

**Expected**: `✅ Connected to SurrealDB!`

**If it fails**:
- Check SurrealDB is running
- Verify environment variables
- Check URL/namespace/database settings

### 3.2 Run Full Sync (First Attempt)

```bash
# Set DEBUG logging for detailed output
export TS_INTROSPECTION_LOG_LEVEL=DEBUG

# Run full sync
ts-node -e "import('./index.js').then(m => m.fullSync())"
```

### What to Watch For

The full sync will:
1. **Connect to SurrealDB**
2. **Initialize schema** (creates tables)
3. **Load jdoc.json** (~3.4MB)
4. **Extract nodes** (functions, classes, modules, etc.)
5. **Group nodes by file**
6. **For each file**:
   - Hash the file
   - Reconcile (compare local vs remote)
   - Generate embeddings (OpenAI API calls)
   - Store in database
7. **Display statistics**

### Expected Output (Partial)

```
[2025-11-06T...] [INFO] ╔══════════════════════════════════════╗
[2025-11-06T...] [INFO] ║   Tidyscripts Introspection System   ║
[2025-11-06T...] [INFO] ╚══════════════════════════════════════╝
[2025-11-06T...] [INFO] Step 1: Connecting to SurrealDB...
[2025-11-06T...] [INFO] Connected to SurrealDB {
  url: "http://localhost:8000",
  namespace: "tidyscripts",
  database: "introspection"
}
[2025-11-06T...] [INFO] Step 2: Checking schema...
[2025-11-06T...] [INFO] Schema not found - initializing...
[2025-11-06T...] [INFO] Step 3: Syncing files...
[2025-11-06T...] [INFO] Loading jdoc.json { path: "/home/oluwa/..." }
[2025-11-06T...] [INFO] Loaded jdoc.json { rootNode: "tidyscripts", kind: "Project", children: 50 }
[2025-11-06T...] [INFO] Extracted nodes from jdoc.json { total: 500, functions: 300, classes: 100, ... }
[2025-11-06T...] [INFO] Files to process { count: 50 }
[2025-11-06T...] [INFO] [1/50] (2.0%) Processing: src/index.ts
[2025-11-06T...] [INFO] Syncing file: src/index.ts { filePath: "..." }
[2025-11-06T...] [INFO] Creating 10 new nodes... { count: 10 }
[2025-11-06T...] [DEBUG] Embedding cache MISS - generating new embedding { contentHash: "a1b2c3d4...", textLength: 150 }
[2025-11-06T...] [DEBUG] Embedding generated { textLength: 150, durationMs: 234 }
...
[2025-11-06T...] ⏱️  File sync: src/index.ts: 5432ms (5.43s)
...
[2025-11-06T...] [INFO] All files synced { filesProcessed: 50, nodesCreated: 500, ... }
[2025-11-06T...] [INFO] ╔══════════════════════════════════════╗
[2025-11-06T...] [INFO] ║   Sync Complete - Statistics         ║
[2025-11-06T...] [INFO] ╚══════════════════════════════════════╝
[2025-11-06T...] [INFO] Files: { processed: 50 }
[2025-11-06T...] [INFO] Nodes: { created: 500, updated: 0, deleted: 0, unchanged: 0, total: 500 }
[2025-11-06T...] ⏱️  Full sync: 123456ms (123.46s)
[2025-11-06T...] [SUCCESS] Full sync completed successfully!
```

### Duration Expectations

- **Small codebase** (~50 files): 5-10 minutes
- **Medium codebase** (~100 files): 10-20 minutes
- **Large codebase** (~200+ files): 20-40 minutes

Most time is spent on:
1. **OpenAI API calls** for embeddings (rate-limited)
2. **Database writes** for each node

---

## 🐛 Step 4: Debug Common Issues

If the sync fails, here's how to debug:

### Issue 1: Connection Errors

**Symptom**:
```
[ERROR] Failed to connect to SurrealDB
Connection refused
```

**Solutions**:
1. Check SurrealDB is running: `ps aux | grep surreal`
2. Verify URL: `echo $TS_INTROSPECTION_SURREAL_URL`
3. Test connection manually: `curl http://localhost:8000/health`

### Issue 2: OpenAI API Errors

**Symptom**:
```
[ERROR] Failed to generate embedding
API key not found
```

**Solutions**:
1. Check API key is set: `echo $OPENAI_API_KEY`
2. Verify key is valid (test on OpenAI playground)
3. Check rate limits / billing on OpenAI dashboard

### Issue 3: jdoc.json Not Found

**Symptom**:
```
[ERROR] jdoc.json not found at path: /home/oluwa/...
```

**Solutions**:
1. Verify path: `ls -lh /home/oluwa/dev/tidyscripts/apps/docs/jdoc.json`
2. Generate if missing: Run TypeDoc on your project
3. Set custom path: `export TS_INTROSPECTION_JDOC_PATH=/path/to/jdoc.json`

### Issue 4: Schema Errors

**Symptom**:
```
[ERROR] Table already exists
[ERROR] Invalid schema
```

**Solutions**:
1. **Reset database** (drops all data):
   ```bash
   # Connect to SurrealDB
   surreal sql --conn http://localhost:8000 --ns tidyscripts --db introspection

   # In the SQL prompt:
   REMOVE DATABASE introspection;
   ```
2. **Re-run sync** - schema will be recreated

### Issue 5: Import/Module Errors

**Symptom**:
```
Cannot find module 'surrealdb'
Cannot find module './logger'
```

**Solutions**:
1. **Install dependencies**:
   ```bash
   cd /home/oluwa/dev/tidyscripts/packages/ts_node
   npm install surrealdb openai
   ```
2. **Compile TypeScript** if needed
3. **Check imports** use `.js` extension for local modules

### Issue 6: Memory Errors

**Symptom**:
```
FATAL ERROR: Reached heap limit
JavaScript heap out of memory
```

**Solutions**:
1. **Increase Node memory**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" ts-node -e "import('./index.js').then(m => m.fullSync())"
   ```
2. **Process in batches** - modify sync to handle fewer files at once

### Debugging with Log Levels

**For detailed debugging**:
```bash
export TS_INTROSPECTION_LOG_LEVEL=DEBUG
# Shows: cache hits/misses, hash comparisons, reconciliation decisions
```

**For clean output**:
```bash
export TS_INTROSPECTION_LOG_LEVEL=INFO
# Shows: major operations, progress, statistics
```

**For errors only**:
```bash
export TS_INTROSPECTION_LOG_LEVEL=ERROR
# Shows: only errors and failures
```

---

## ✅ Step 5: Validate Database Contents

After a successful sync, validate that data is correct.

### 5.1 Run Validation Script

```bash
cd /home/oluwa/dev/tidyscripts/packages/ts_node/src/introspection

ts-node validate.ts
```

**Expected output**:
```
[INFO] ╔══════════════════════════════════════╗
[INFO] ║   Tidyscripts Introspection System - Validation ║
[INFO] ╚══════════════════════════════════════╝
[INFO] Connecting to database...
[INFO] Connected to SurrealDB { ... }
[INFO] Schema initialized: { initialized: true }
[INFO] Table Counts: {
  functions: 300,
  classes: 100,
  modules: 50,
  interfaces: 30,
  type_aliases: 20,
  embeddings: 280,
  files: 50,
  totalNodes: 500
}
[INFO] Embedding Cache Statistics: {
  entries: 280,
  totalUsage: 500,
  maxUsage: 5,
  minUsage: 1,
  avgUsage: 1.78,
  hitRate: "44.00%"
}
[SUCCESS] Schema initialized: PASS
[SUCCESS] Nodes exist in database: PASS
[SUCCESS] Embeddings cached: PASS
[SUCCESS] Files tracked: PASS
[SUCCESS] Cache has usage > 1: PASS
[SUCCESS] All checks passed!
```

### 5.2 Manual Validation Queries

Connect to SurrealDB and run queries:

```bash
# Connect to SurrealDB SQL prompt
surreal sql --conn http://localhost:8000 --ns tidyscripts --db introspection
```

**Count nodes by type**:
```sql
SELECT
  (SELECT count() FROM function_node)[0].count AS functions,
  (SELECT count() FROM class_node)[0].count AS classes,
  (SELECT count() FROM module_node)[0].count AS modules,
  (SELECT count() FROM interface_node)[0].count AS interfaces,
  (SELECT count() FROM type_alias_node)[0].count AS type_aliases,
  (SELECT count() FROM embedding_cache)[0].count AS embeddings,
  (SELECT count() FROM file_metadata)[0].count AS files;
```

**Sample function nodes**:
```sql
SELECT name, filePath, docstring
FROM function_node
LIMIT 5;
```

**Check embedding dimensions**:
```sql
SELECT array::len(embedding) AS dimensions
FROM embedding_cache
LIMIT 1;
-- Should return: 1536 (for text-embedding-3-small)
```

**Cache statistics**:
```sql
SELECT
  count() AS total_entries,
  math::sum(usageCount) AS total_usage,
  math::max(usageCount) AS max_usage,
  math::min(usageCount) AS min_usage,
  math::mean(usageCount) AS avg_usage
FROM embedding_cache;
```

**Functions without docstrings**:
```sql
SELECT name, filePath
FROM function_node
WHERE docstring = '' OR docstring IS NULL
LIMIT 10;
```

**Files with most nodes**:
```sql
SELECT filePath, array::len(nodeIds) AS node_count
FROM file_metadata
ORDER BY node_count DESC
LIMIT 10;
```

---

## 🔄 Step 6: Test Incremental Updates

Test that incremental sync only updates changed files.

### 6.1 Modify a File

1. **Pick a source file** from your codebase
2. **Make a small change** (add a comment, update docstring)
3. **Regenerate jdoc.json** with TypeDoc

### 6.2 Run Incremental Sync

```bash
# Run incremental sync (auto-detects changed files)
ts-node -e "import('./index.js').then(m => m.incrementalSync())"
```

**Expected behavior**:
- Only changed files are processed
- Unchanged files skipped
- Cache hits for identical embeddings
- Much faster than full sync

### 6.3 Verify Results

Check logs for:
```
[INFO] Detecting changed files...
[INFO] Changed files detected { count: 1 }
[INFO] File unchanged - skipping { filePath: "...", contentHash: "..." }
[DEBUG] Metadata updated, embedding reused { nodeName: "...", embeddingHash: "..." }
```

---

## 📊 Step 7: Review Performance & Statistics

After a successful sync, review the performance metrics.

### Key Metrics to Check

1. **Cache Hit Rate**
   - Target: 40-60% on incremental updates
   - Location: Validation output or embedding_cache query
   - Formula: `(total_usage - total_entries) / total_usage * 100`

2. **Processing Time**
   - Full sync: Minutes to tens of minutes
   - Incremental sync: Seconds to minutes
   - Check timing logs: `⏱️  Operation: XXXXms`

3. **API Cost Savings**
   - Embeddings generated: From logs or embedding_cache.total_entries
   - Embeddings reused: embedding_cache.total_usage - total_entries
   - API calls saved: Reused embeddings (each costs ~$0.00001)

4. **Database Size**
   - Nodes stored: From table counts
   - Files tracked: From file_metadata count
   - Average nodes per file: total_nodes / file_count

### Sample Performance Report

After sync, create a report:
```
=== Sync Performance Report ===

Files Processed: 50
Nodes Created: 500
  - Functions: 300
  - Classes: 100
  - Modules: 50
  - Interfaces: 30
  - Type Aliases: 20

Embeddings:
  - Generated: 280
  - Cached entries: 280
  - Total usage: 500
  - Cache hit rate: 44%
  - API calls saved: 220

Performance:
  - Total duration: 15 minutes
  - Avg time per file: 18 seconds
  - Avg time per node: 1.8 seconds

Database:
  - Total nodes: 500
  - Avg nodes per file: 10
  - Files tracked: 50
```

---

## 🎯 Success Criteria

✅ **Part 1 is VALIDATED when**:

1. ✅ All unit tests pass
2. ✅ Database connection works
3. ✅ Full sync completes without errors
4. ✅ Validation script shows all checks PASS
5. ✅ Table counts match expected values
6. ✅ Embeddings have correct dimensionality (1536)
7. ✅ Cache shows reuse (usageCount > 1 for some entries)
8. ✅ Incremental sync only updates changed files
9. ✅ No critical errors in logs
10. ✅ Performance is acceptable

---

## 🚦 Next Steps After Validation

Once all success criteria are met:

### Option 1: Optimize & Tune
- Adjust batch sizes
- Optimize embedding text generation
- Add more specific validation checks
- Improve error handling

### Option 2: Move to Part 2
See `introspection_querying_roadmap.md` for:
- Semantic search by embedding similarity
- Graph traversal queries
- Hybrid query interface
- Context assembly for agents
- Agent integration

### Option 3: Production Readiness
- Add comprehensive error recovery
- Implement retry logic for transient failures
- Add monitoring and alerting
- Set up automated sync workflows
- Document operational runbooks

---

## 📝 Quick Reference Commands

```bash
# Run all unit tests
ts-node tests/run-all.ts

# Verify environment variables are set
echo $OPENAI_API_KEY | head -c 10
echo $TS_INTROSPECTION_SURREAL_URL
echo $TS_INTROSPECTION_LOG_LEVEL

# Adjust logging level (optional)
export TS_INTROSPECTION_LOG_LEVEL='DEBUG'  # Or INFO, WARN, ERROR, SILENT

# Test database connection
ts-node -e "import { connect, disconnect } from './database.js'; (async () => { const db = await connect(); console.log('✅ Connected!'); await disconnect(db); })();"

# Run full sync
ts-node -e "import('./index.js').then(m => m.fullSync())"

# Run incremental sync
ts-node -e "import('./index.js').then(m => m.incrementalSync())"

# Validate database
ts-node validate.ts

# Connect to SurrealDB SQL
surreal sql --conn http://localhost:8000 --ns tidyscripts --db introspection

# Reset database (if needed)
# In SurrealDB SQL prompt:
REMOVE DATABASE introspection;
```

---

## 🆘 Troubleshooting Checklist

Before asking for help, verify:

- [ ] SurrealDB is running
- [ ] Environment variables are set
- [ ] jdoc.json exists and is readable
- [ ] OpenAI API key is valid
- [ ] Dependencies are installed (npm install)
- [ ] Log level is set to DEBUG for detailed output
- [ ] Checked logs for specific error messages
- [ ] Tried resetting database if schema issues
- [ ] Verified Node.js version compatibility

---

## 📚 Additional Resources

- **README.md** - Complete usage documentation
- **LOGGING.md** - Detailed logging guide
- **introspection_implementation_roadmap.md** - Implementation details
- **Database schema** - See schema.ts for table definitions
- **SurrealDB docs** - .surreal_docs/ directory

---

**Good luck with testing! Take it step by step, and debug systematically.** 🚀

If you encounter issues, the structured logging will give you a complete trace of what happened before the error. Use DEBUG level for maximum visibility.
