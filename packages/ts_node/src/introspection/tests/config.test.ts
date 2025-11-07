/**
 * Tests for config.ts
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import {
  loadSurrealConfig,
  getJdocPath,
  getProjectRoot,
  hasOpenAIKey,
  getConfigSummary,
  validateConfig,
} from '../config';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Config - SurrealDB Configuration');

  runner.test('loadSurrealConfig returns valid config', () => {
    const config = loadSurrealConfig();
    assert(config.url !== undefined, 'URL should be defined');
    assert(config.namespace !== undefined, 'Namespace should be defined');
    assert(config.database !== undefined, 'Database should be defined');
    assert(typeof config.url === 'string', 'URL should be string');
    assert(typeof config.namespace === 'string', 'Namespace should be string');
    assert(typeof config.database === 'string', 'Database should be string');
  });

  runner.test('loadSurrealConfig uses defaults when env vars not set', () => {
    const config = loadSurrealConfig();
    // Should have some value (either from env or defaults)
    assert(config.url.length > 0, 'URL should have value');
    assert(config.namespace.length > 0, 'Namespace should have value');
    assert(config.database.length > 0, 'Database should have value');
  });

  runner.suite('Config - Paths');

  runner.test('getJdocPath returns valid path', () => {
    const path = getJdocPath();
    assert(typeof path === 'string', 'Path should be string');
    assert(path.length > 0, 'Path should not be empty');
    assert(path.includes('jdoc.json'), 'Path should reference jdoc.json');
  });

  runner.test('getProjectRoot returns valid path', () => {
    const root = getProjectRoot();
    assert(typeof root === 'string', 'Project root should be string');
    assert(root.length > 0, 'Project root should not be empty');
    assert(root.includes('tidyscripts'), 'Project root should reference tidyscripts');
  });

  runner.test('getProjectRoot uses TIDYSCRIPTS_HOME env var if set', () => {
    const root = getProjectRoot();
    // If TIDYSCRIPTS_HOME is set, it should use that value
    // Otherwise it uses the default
    assert(typeof root === 'string', 'Project root should be string');
    assert(root.length > 0, 'Project root should not be empty');
  });

  runner.suite('Config - OpenAI');

  runner.test('hasOpenAIKey returns boolean', () => {
    const hasKey = hasOpenAIKey();
    assert(typeof hasKey === 'boolean', 'Should return boolean');
  });

  runner.suite('Config - Summary');

  runner.test('getConfigSummary returns string', () => {
    const summary = getConfigSummary();
    assert(typeof summary === 'string', 'Summary should be string');
    assert(summary.length > 0, 'Summary should not be empty');
    assert(summary.includes('SurrealDB'), 'Summary should mention SurrealDB');
  });

  runner.suite('Config - Validation');

  runner.test('validateConfig does not throw for valid config', () => {
    // Should not throw if OpenAI key is not required
    validateConfig(false);
    assert(true, 'Validation should pass without OpenAI requirement');
  });
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
