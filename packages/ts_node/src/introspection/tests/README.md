# Introspection System Tests

Unit tests for the tidyscripts introspection system modules.

## ✅ Status: All 8 Test Suites Passing (70 Tests Total)

## Test Coverage

### Core Modules Tested

1. **constants.test.ts** - Constants and enums
   - NodeKind values
   - Helper functions (getKindName, shouldGenerateEmbedding, isContainerKind)
   - Environment variable names
   - Default values

2. **config.test.ts** - Configuration management
   - SurrealDB configuration loading
   - Path resolution
   - OpenAI key detection
   - Configuration validation
   - Summary generation

3. **hasher.test.ts** - Hashing utilities
   - Basic string hashing
   - Data hashing
   - Node hashing (two-hash strategy)
   - Embedding text hashing
   - Hash validation
   - Hash comparison utilities

4. **parser.test.ts** - JSON parsing and traversal
   - Docstring extraction
   - Type name extraction
   - Signature string generation
   - Node grouping
   - Node filtering

5. **embeddings.test.ts** - Embedding text generation
   - Function embedding text
   - Class embedding text
   - Module embedding text
   - Dispatcher logic
   - NOTE: OpenAI API calls are NOT tested (would require mocks or API key)

6. **reconciler.test.ts** - Batch reconciliation
   - New node identification
   - Changed node detection
   - Deleted node identification
   - Mixed change handling
   - Statistics calculation

7. **sync.test.ts** - Synchronization path filtering
   - Path filter matching logic
   - File inclusion/exclusion
   - Subdirectory handling
   - Case sensitivity
   - Integration with node grouping
   - NOTE: Database operations in sync.ts are tested via integration tests

8. **database.test.ts** - Database integration tests
   - Connection to isolated TEST namespace (tidyscripts_test)
   - Schema initialization
   - Function node CRUD operations (insert, retrieve)
   - File metadata operations
   - Complete table cleanup (including edge tables)
   - NOTE: Uses REAL database with isolated namespace for safety

## Running Tests

### Quick Start (Recommended)

```bash
# Clean, build, and run all tests
./run_test_suite.sh
```

### Individual Steps

```bash
# Build only (compiles to dist/)
./build_tests.sh

# Run only (requires build first)
./run_tests.sh
```

### From Project Root

```bash
cd packages/ts_node/src/introspection/tests
./run_test_suite.sh
```

## Build System

All tests are compiled with consistent flags:
```bash
tsc --skipLibCheck --target ES2020 --module commonjs --outDir dist
```

- **Input**: TypeScript `.ts` files in this directory
- **Output**: JavaScript `.js` files in `dist/tests/`
- **Dependencies**: Compiled source modules in `dist/`

## Test Framework

Tests use a simple custom test runner (`test-runner.ts`) that provides:
- `TestRunner` class for organizing tests
- `assert()` for boolean assertions
- `assertEqual()` for equality checks
- `assertThrows()` for exception testing

Example:
```typescript
import { TestRunner, assert, assertEqual } from './test-runner';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('My Suite');

  runner.test('my test', () => {
    assertEqual(1 + 1, 2);
  });
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
```

## What's NOT Tested (Unit Tests)

These components are validated through **integration testing** during actual sync runs:

### Database Operations (database.ts)
- **Integration tests**: Now tested via `database.test.ts` with isolated TEST namespace
- **Also tested during**: Step 3 of instructions.md (full sync on web.apis module)
- **Note**: database.test.ts validates CRUD operations in a safe TEST namespace

### Sync Database Integration (sync.ts)
- **Why not unit tested**: Depends on database operations (tested separately in sync.test.ts for logic)
- **How tested**: Integration tests via `fullSync()` with real database
- **Note**: Path filtering logic IS tested in sync.test.ts
- **Tested during**: Step 3 of instructions.md

### Schema Initialization (schema.ts)
- **Why not unit tested**: Static SQL definitions
- **How tested**: Validated when `initializeSchema()` runs during sync
- **Tested during**: Step 3 of instructions.md (schema creation happens automatically)

### OpenAI API Calls (embeddings.ts)
- **Why not unit tested**: Would require API key or extensive mocking
- **How tested**: Real API calls during sync
- **Note**: Embedding text generation IS tested in embeddings.test.ts
- **Tested during**: Step 3 of instructions.md (generates real embeddings)

## Adding New Tests

1. Create new test file: `tests/yourmodule.test.ts`
2. Import test runner: `import { TestRunner, assert } from './test-runner';`
3. Create test suites and tests
4. Add to `testFiles` array in `run-all.ts`

Example template:
```typescript
import { TestRunner, assert, assertEqual } from './test-runner';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Your Module');

  runner.test('your test', () => {
    // Test code here
    assertEqual(actual, expected);
  });
});
```

## Test Output

Successful run:
```
🧪 Running Tests...

📦 Constants - NodeKind
  ✓ NodeKind values are defined
  ✓ getKindName returns correct names

==================================================
Tests: 25 total, 25 passed, 0 failed
✅ All tests passed!
```

Failed run:
```
📦 Constants - NodeKind
  ✓ NodeKind values are defined
  ✗ getKindName returns correct names
    Expected Function, but got Unknown

==================================================
Tests: 2 total, 1 passed, 1 failed
❌ 1 test(s) failed
```

## Integration Testing

### Database Integration (database.test.ts)
- Connects to isolated TEST namespace (`tidyscripts_test`)
- Tests real database CRUD operations
- Complete cleanup (removes all tables and edge tables)
- Runs as part of normal test suite

### Full System Testing

For complete end-to-end testing:

1. **Setup**: Start SurrealDB, set env vars
2. **Run**: `ts-node validate.ts` or follow instructions.md
3. **Verify**: Check database contents

See parent README.md for full integration testing details.
