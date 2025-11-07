"use strict";
/**
 * Simple test runner for introspection system tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
exports.assert = assert;
exports.assertEqual = assertEqual;
exports.assertThrows = assertThrows;
class TestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.currentSuite = '';
    }
    suite(name) {
        this.currentSuite = name;
        console.log(`\n📦 ${name}`);
    }
    test(name, fn) {
        try {
            const result = fn();
            if (result instanceof Promise) {
                return result
                    .then(() => {
                    this.passed++;
                    console.log(`  ✓ ${name}`);
                })
                    .catch((error) => {
                    this.failed++;
                    console.log(`  ✗ ${name}`);
                    console.log(`    ${error.message}`);
                });
            }
            else {
                this.passed++;
                console.log(`  ✓ ${name}`);
            }
        }
        catch (error) {
            this.failed++;
            console.log(`  ✗ ${name}`);
            console.log(`    ${error.message}`);
        }
    }
    async run(tests) {
        console.log('🧪 Running Tests...\n');
        await tests();
        this.summary();
    }
    summary() {
        const total = this.passed + this.failed;
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Tests: ${total} total, ${this.passed} passed, ${this.failed} failed`);
        if (this.failed === 0) {
            console.log('✅ All tests passed!');
        }
        else {
            console.log(`❌ ${this.failed} test(s) failed`);
            process.exit(1);
        }
    }
}
exports.TestRunner = TestRunner;
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, but got ${actual}`);
    }
}
function assertThrows(fn, message) {
    try {
        fn();
        throw new Error(message || 'Expected function to throw');
    }
    catch (error) {
        // Expected
    }
}
