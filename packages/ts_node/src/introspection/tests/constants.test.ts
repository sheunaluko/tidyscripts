/**
 * Tests for constants.ts
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import {
  NodeKind,
  getKindName,
  shouldGenerateEmbedding,
  isContainerKind,
  ENV_VARS,
  DEFAULT_JDOC_PATH,
} from '../constants';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Constants - NodeKind');

  runner.test('NodeKind values are defined', () => {
    assert(NodeKind.Function === 64, 'Function should be 64');
    assert(NodeKind.Class === 128, 'Class should be 128');
    assert(NodeKind.Interface === 256, 'Interface should be 256');
    assert(NodeKind.Module === 4, 'Module should be 4');
    assert(NodeKind.Method === 2048, 'Method should be 2048');
  });

  runner.suite('Constants - Helper Functions');

  runner.test('getKindName returns correct names', () => {
    assertEqual(getKindName(64), 'Function');
    assertEqual(getKindName(128), 'Class');
    assertEqual(getKindName(256), 'Interface');
    assertEqual(getKindName(4), 'Module');
  });

  runner.test('getKindName handles unknown kinds', () => {
    const result = getKindName(99999);
    assert(result.includes('Unknown'), 'Should handle unknown kinds');
  });

  runner.test('shouldGenerateEmbedding identifies correct kinds', () => {
    assert(shouldGenerateEmbedding(NodeKind.Function), 'Function should generate embedding');
    assert(shouldGenerateEmbedding(NodeKind.Class), 'Class should generate embedding');
    assert(shouldGenerateEmbedding(NodeKind.Interface), 'Interface should generate embedding');
    assert(shouldGenerateEmbedding(NodeKind.Module), 'Module should generate embedding');
    assert(shouldGenerateEmbedding(NodeKind.Method), 'Method should generate embedding');
    assert(!shouldGenerateEmbedding(NodeKind.Parameter), 'Parameter should not generate embedding');
  });

  runner.test('isContainerKind identifies container kinds', () => {
    assert(isContainerKind(NodeKind.Module), 'Module is container');
    assert(isContainerKind(NodeKind.Class), 'Class is container');
    assert(isContainerKind(NodeKind.Interface), 'Interface is container');
    assert(!isContainerKind(NodeKind.Function), 'Function is not container');
  });

  runner.suite('Constants - Environment Variables');

  runner.test('ENV_VARS are defined with correct prefix', () => {
    assert(ENV_VARS.SURREAL_URL.startsWith('TS_INTROSPECTION_SURREAL_'), 'URL has correct prefix');
    assert(ENV_VARS.SURREAL_NAMESPACE.startsWith('TS_INTROSPECTION_SURREAL_'), 'Namespace has correct prefix');
    assert(ENV_VARS.SURREAL_DATABASE.startsWith('TS_INTROSPECTION_SURREAL_'), 'Database has correct prefix');
  });

  runner.test('Default values are defined', () => {
    assert(DEFAULT_JDOC_PATH.length > 0, 'Default jdoc path should be defined');
    assert(DEFAULT_JDOC_PATH.includes('jdoc.json'), 'Default path should reference jdoc.json');
  });
});
