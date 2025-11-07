#!/bin/bash
# Clean, build, and run all tests

cd "$(dirname "$0")"

echo "🧹 Cleaning previous build..."
rm -rf dist
echo ""

echo "🔨 Building tests..."
./build_tests.sh
echo ""

echo "🧪 Running tests..."
./run_tests.sh
