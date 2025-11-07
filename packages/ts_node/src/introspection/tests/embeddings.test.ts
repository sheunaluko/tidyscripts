/**
 * Tests for embeddings.ts (embedding text generation only, no OpenAI calls)
 */

import { TestRunner, assert } from './test-runner';
import {
  buildEmbeddingText,
  buildFunctionEmbeddingText,
  buildClassEmbeddingText,
  buildModuleEmbeddingText,
} from '../embeddings';
import { NodeKind } from '../constants';
import type { ParsedNode } from '../types';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Embeddings - Function Text Generation');

  runner.test('buildFunctionEmbeddingText includes name and docstring', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'testFunction',
      kind: NodeKind.Function,
      filePath: 'test.ts',
      docstring: 'This is a test function',
      sources: [],
      children: [],
      signature: {
        id: 2,
        name: 'testFunction',
        kind: 4096,
        variant: 'signature',
        parameters: [],
      },
    };

    const text = buildFunctionEmbeddingText(node);
    assert(text.includes('testFunction'), 'Should include function name');
    assert(text.includes('This is a test function'), 'Should include docstring');
  });

  runner.test('buildFunctionEmbeddingText includes parameters', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'testFunction',
      kind: NodeKind.Function,
      filePath: 'test.ts',
      docstring: 'Test',
      sources: [],
      children: [],
      signature: {
        id: 2,
        name: 'testFunction',
        kind: 4096,
        variant: 'signature',
        parameters: [
          {
            id: 3,
            name: 'param1',
            kind: 32768,
            variant: 'param',
            type: { type: 'intrinsic', name: 'string' },
          },
        ],
      },
    };

    const text = buildFunctionEmbeddingText(node);
    assert(text.includes('param1'), 'Should include parameter name');
    assert(text.includes('string'), 'Should include parameter type');
  });

  runner.test('buildFunctionEmbeddingText handles missing docstring', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'testFunction',
      kind: NodeKind.Function,
      filePath: 'test.ts',
      docstring: '',
      sources: [],
      children: [],
    };

    const text = buildFunctionEmbeddingText(node);
    assert(text.includes('No documentation'), 'Should handle missing docstring');
  });

  runner.suite('Embeddings - Class Text Generation');

  runner.test('buildClassEmbeddingText includes class name and docstring', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'TestClass',
      kind: NodeKind.Class,
      filePath: 'test.ts',
      docstring: 'This is a test class',
      sources: [],
      children: [],
    };

    const text = buildClassEmbeddingText(node);
    assert(text.includes('TestClass'), 'Should include class name');
    assert(text.includes('This is a test class'), 'Should include docstring');
  });

  runner.test('buildClassEmbeddingText includes methods', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'TestClass',
      kind: NodeKind.Class,
      filePath: 'test.ts',
      docstring: 'Test class',
      sources: [],
      children: [
        {
          id: 2,
          name: 'method1',
          kind: NodeKind.Method,
          filePath: 'test.ts',
          docstring: 'Test method',
          sources: [],
          children: [],
        },
      ],
    };

    const text = buildClassEmbeddingText(node);
    assert(text.includes('method1'), 'Should include method name');
    assert(text.includes('Methods:'), 'Should include methods section');
  });

  runner.suite('Embeddings - Module Text Generation');

  runner.test('buildModuleEmbeddingText includes module name and path', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'testModule',
      kind: NodeKind.Module,
      filePath: 'src/test.ts',
      docstring: 'Test module',
      sources: [],
      children: [],
    };

    const text = buildModuleEmbeddingText(node);
    assert(text.includes('testModule'), 'Should include module name');
    assert(text.includes('src/test.ts'), 'Should include file path');
  });

  runner.test('buildModuleEmbeddingText includes exports', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'testModule',
      kind: NodeKind.Module,
      filePath: 'test.ts',
      docstring: 'Test module',
      sources: [],
      children: [
        {
          id: 2,
          name: 'exportedFunction',
          kind: NodeKind.Function,
          filePath: 'test.ts',
          docstring: 'Exported function',
          sources: [],
          children: [],
        },
      ],
    };

    const text = buildModuleEmbeddingText(node);
    assert(text.includes('exportedFunction'), 'Should include exported function');
    assert(text.includes('Exports:'), 'Should include exports section');
  });

  runner.suite('Embeddings - Dispatcher');

  runner.test('buildEmbeddingText dispatches to correct builder', () => {
    const funcNode: ParsedNode = {
      id: 1,
      name: 'test',
      kind: NodeKind.Function,
      filePath: 'test.ts',
      docstring: 'Test',
      sources: [],
      children: [],
    };

    const text = buildEmbeddingText(funcNode);
    assert(text.includes('Parameters:'), 'Should use function builder');
  });
});
