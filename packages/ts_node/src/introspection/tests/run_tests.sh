#!/bin/bash
# Run all compiled test files

cd "$(dirname "$0")"

echo "🧪 Running Introspection Test Suite"
echo "===================================="
echo ""

# All tests
ALL_TESTS="constants.test.js config.test.js hasher.test.js parser.test.js embeddings.test.js reconciler.test.js sync.test.js database.test.js"

passed=0
failed=0

for test in $ALL_TESTS; do
    if [ -f "dist/tests/$test" ]; then
        echo "═══════════════════════════════════════════════════════════"
        echo "Running $test..."
        echo "═══════════════════════════════════════════════════════════"
        if node "dist/tests/$test"; then
            ((passed++))
        else
            ((failed++))
        fi
        echo ""
    else
        echo "⚠️  $test not compiled yet - run ./build_tests.sh"
        echo ""
    fi
done

echo "===================================="
echo "📊 Summary: $passed passed, $failed failed"
echo "===================================="

if [ $failed -eq 0 ]; then
    exit 0
else
    exit 1
fi
