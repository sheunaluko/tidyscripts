#!/bin/bash
# Build all test files

cd "$(dirname "$0")"

echo "🔨 Compiling Introspection Test Suite"
echo "======================================"
echo ""

# Create dist directory if it doesn't exist
mkdir -p dist

# Compile all tests with same flags, output to dist/
echo "Compiling all test files..."
tsc --skipLibCheck --target ES2020 --module commonjs --outDir dist \
  constants.test.ts \
  config.test.ts \
  hasher.test.ts \
  parser.test.ts \
  embeddings.test.ts \
  reconciler.test.ts \
  sync.test.ts \
  database.test.ts \
  query.test.ts

echo ""
echo "✅ All test files compiled to dist/"
echo ""
echo "Run tests with: ./run_tests.sh"
