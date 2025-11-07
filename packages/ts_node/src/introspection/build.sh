#!/bin/bash
# Build introspection source files

cd "$(dirname "$0")"

echo "🔨 Compiling Introspection Source Files"
echo "========================================"
echo ""

# Create dist directory if it doesn't exist
mkdir -p dist

# Compile all source files with same flags as tests
echo "Compiling all source files..."
tsc --skipLibCheck --target ES2020 --module commonjs --outDir dist \
  constants.ts \
  types.ts \
  logger.ts \
  config.ts \
  hasher.ts \
  parser.ts \
  embeddings.ts \
  schema.ts \
  database.ts \
  reconciler.ts \
  sync.ts \
  index.ts \
  run_filtered_sync.ts

echo ""
echo "✅ All source files compiled to dist/"
echo ""
echo "Run sync with: node dist/run_filtered_sync.js <path>"
