/**
 * Tests for parser.ts
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import {
  extractDocstring,
  getTypeName,
  getSignatureString,
  groupNodesByKind,
  filterNodesByKind,
  getNodesWithoutDocstrings,
} from '../parser';
import { NodeKind } from '../constants';
import type { JDocNode, ParsedNode, TypeNode } from '../types';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Parser - Docstring Extraction');

  runner.test('extractDocstring from signatures', () => {
    const node: JDocNode = {
      id: 1,
      name: 'test',
      kind: 64,
      variant: 'declaration',
      signatures: [
        {
          id: 2,
          name: 'test',
          kind: 4096,
          variant: 'signature',
          comment: {
            summary: [
              { kind: 'text', text: 'This is a test function' },
            ],
          },
        },
      ],
    };
    const docstring = extractDocstring(node);
    assertEqual(docstring, 'This is a test function');
  });

  runner.test('extractDocstring handles missing comment', () => {
    const node: JDocNode = {
      id: 1,
      name: 'test',
      kind: 64,
      variant: 'declaration',
    };
    const docstring = extractDocstring(node);
    assertEqual(docstring, '');
  });

  runner.test('extractDocstring filters out non-text blocks', () => {
    const node: JDocNode = {
      id: 1,
      name: 'test',
      kind: 64,
      variant: 'declaration',
      signatures: [
        {
          id: 2,
          name: 'test',
          kind: 4096,
          variant: 'signature',
          comment: {
            summary: [
              { kind: 'text', text: 'First part' },
              { kind: 'code', text: 'const x = 1;' },
              { kind: 'text', text: 'Second part' },
            ],
          },
        },
      ],
    };
    const docstring = extractDocstring(node);
    assertEqual(docstring, 'First part Second part');
  });

  runner.suite('Parser - Type Name Extraction');

  runner.test('getTypeName handles intrinsic types', () => {
    const type: TypeNode = { type: 'intrinsic', name: 'string' };
    assertEqual(getTypeName(type), 'string');
  });

  runner.test('getTypeName handles reference types', () => {
    const type: TypeNode = { type: 'reference', name: 'Promise' };
    assertEqual(getTypeName(type), 'Promise');
  });

  runner.test('getTypeName handles array types', () => {
    const type: TypeNode = {
      type: 'array',
      elementType: { type: 'intrinsic', name: 'string' },
    };
    assertEqual(getTypeName(type), 'string[]');
  });

  runner.test('getTypeName handles union types', () => {
    const type: TypeNode = {
      type: 'union',
      types: [
        { type: 'intrinsic', name: 'string' },
        { type: 'intrinsic', name: 'number' },
      ],
    };
    assertEqual(getTypeName(type), 'string | number');
  });

  runner.test('getTypeName handles undefined', () => {
    assertEqual(getTypeName(undefined), 'any');
  });

  runner.suite('Parser - Node Grouping');

  runner.test('groupNodesByKind groups correctly', () => {
    const nodes: ParsedNode[] = [
      {
        id: 1,
        name: 'func1',
        kind: NodeKind.Function,
        filePath: 'test.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 2,
        name: 'func2',
        kind: NodeKind.Function,
        filePath: 'test.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 3,
        name: 'class1',
        kind: NodeKind.Class,
        filePath: 'test.ts',
        docstring: '',
        sources: [],
        children: [],
      },
    ];

    const grouped = groupNodesByKind(nodes);
    assertEqual(grouped.get(NodeKind.Function)?.length, 2);
    assertEqual(grouped.get(NodeKind.Class)?.length, 1);
  });

  runner.suite('Parser - Node Filtering');

  runner.test('filterNodesByKind filters correctly', () => {
    const nodes: ParsedNode[] = [
      {
        id: 1,
        name: 'func1',
        kind: NodeKind.Function,
        filePath: 'test.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 2,
        name: 'class1',
        kind: NodeKind.Class,
        filePath: 'test.ts',
        docstring: '',
        sources: [],
        children: [],
      },
    ];

    const functions = filterNodesByKind(nodes, [NodeKind.Function]);
    assertEqual(functions.length, 1);
    assertEqual(functions[0].name, 'func1');
  });

  runner.test('getNodesWithoutDocstrings filters correctly', () => {
    const nodes: ParsedNode[] = [
      {
        id: 1,
        name: 'func1',
        kind: NodeKind.Function,
        filePath: 'test.ts',
        docstring: 'Has docstring',
        sources: [],
        children: [],
      },
      {
        id: 2,
        name: 'func2',
        kind: NodeKind.Function,
        filePath: 'test.ts',
        docstring: '',
        sources: [],
        children: [],
      },
    ];

    const withoutDocs = getNodesWithoutDocstrings(nodes);
    assertEqual(withoutDocs.length, 1);
    assertEqual(withoutDocs[0].name, 'func2');
  });
});
