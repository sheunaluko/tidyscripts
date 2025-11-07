# Introspection System Tests

Unit tests for the tidyscripts introspection system modules.

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

## Running Tests

### Run All Tests

```bash
# From introspection directory
ts-node tests/run-all.ts
```

### Run Individual Test

```bash
# From introspection directory
ts-node tests/constants.test.ts
ts-node tests/config.test.ts
ts-node tests/hasher.test.ts
# ... etc
```

### Run from project root

```bash
cd packages/ts_node/src/introspection
ts-node tests/run-all.ts
```

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
});
```

## What's NOT Tested

### Database Operations (database.ts)
- Requires running SurrealDB instance
- Would need integration tests, not unit tests
- Could be tested with mocked DB client

### Sync Operations (sync.ts)
- Depends on database operations
- Requires full system setup
- Better suited for integration tests

### Schema (schema.ts)
- Static SQL definitions
- Could validate syntax but minimal value
- Better tested through actual database initialization

### OpenAI API Calls (embeddings.ts)
- Would require API key or extensive mocking
- Actual API calls tested through integration tests
- Text generation is tested

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

For full system testing:

1. **Setup**: Start SurrealDB, set env vars
2. **Run**: `ts-node validate.ts`
3. **Verify**: Check database contents

See parent README.md for integration testing details.
