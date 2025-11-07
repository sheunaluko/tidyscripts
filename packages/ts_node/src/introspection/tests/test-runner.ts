/**
 * Simple test runner for introspection system tests
 */

export class TestRunner {
  private passed = 0;
  private failed = 0;
  private currentSuite = '';

  suite(name: string) {
    this.currentSuite = name;
    console.log(`\n📦 ${name}`);
  }

  test(name: string, fn: () => void | Promise<void>) {
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
      } else {
        this.passed++;
        console.log(`  ✓ ${name}`);
      }
    } catch (error) {
      this.failed++;
      console.log(`  ✗ ${name}`);
      console.log(`    ${(error as Error).message}`);
    }
  }

  async run(tests: () => void | Promise<void>) {
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
    } else {
      console.log(`❌ ${this.failed} test(s) failed`);
      process.exit(1);
    }
  }
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    );
  }
}

export function assertThrows(fn: () => void, message?: string) {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    // Expected
  }
}
