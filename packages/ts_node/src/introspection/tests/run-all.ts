/**
 * Run all tests
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const testFiles = [
  'constants.test.ts',
  'config.test.ts',
  'hasher.test.ts',
  'parser.test.ts',
  'embeddings.test.ts',
  'reconciler.test.ts',
];

async function runTest(file: string): Promise<boolean> {
  return new Promise((resolve) => {
    const testPath = `./tests/${file}`;
    const proc = spawn('ts-node', [testPath], {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Running all introspection tests...\n');

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running ${file}`);
    console.log('='.repeat(60));

    const success = await runTest(file);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total test files: ${testFiles.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n✅ All test files passed!');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} test file(s) failed`);
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('Error running tests:', error);
  process.exit(1);
});
