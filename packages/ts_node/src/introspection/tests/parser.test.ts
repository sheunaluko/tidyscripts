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
  traverseNodes,
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

  runner.suite('Parser - Node Traversal');

  runner.test('traverseNodes preserves parent-child relationships correctly', () => {
    // Mock structure similar to apis module with 11 re-exported children
    const mockJDoc: JDocNode = {
      id: 1000,
      name: 'testModule',
      kind: NodeKind.Module,
      variant: 'declaration',
      sources: [{ url: "", fileName: 'test/index.ts', line: 1, character: 0 }],
      children: [
        {
          id: 1001,
          name: 'child1',
          kind: NodeKind.Module,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/child1.ts', line: 1, character: 0 }],
        },
        {
          id: 1002,
          name: 'child2',
          kind: NodeKind.Module,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/child2.ts', line: 1, character: 0 }],
        },
        {
          id: 1003,
          name: 'child3',
          kind: NodeKind.Function,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/child3.ts', line: 1, character: 0 }],
        },
        {
          id: 1004,
          name: 'child4',
          kind: NodeKind.Function,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/child4.ts', line: 1, character: 0 }],
        },
        {
          id: 1005,
          name: 'child5',
          kind: NodeKind.Function,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/child5.ts', line: 1, character: 0 }],
        },
      ],
    };

    const nodes = traverseNodes(mockJDoc);

    // Should have 6 nodes total (1 parent + 5 children)
    assertEqual(nodes.length, 6);

    // Find the parent module
    const parent = nodes.find(n => n.id === 1000);
    assert(parent !== undefined, 'Parent module should be found');
    assertEqual(parent!.name, 'testModule');

    // Parent should have exactly 5 children
    assertEqual(parent!.children.length, 5, 'Parent should have 5 children');

    // Verify all children are present with correct IDs
    const childIds = parent!.children.map(c => c.id).sort();
    const expectedIds = [1001, 1002, 1003, 1004, 1005];
    assertEqual(JSON.stringify(childIds), JSON.stringify(expectedIds));

    // Verify children have correct names
    const childNames = parent!.children.map(c => c.name).sort();
    const expectedNames = ['child1', 'child2', 'child3', 'child4', 'child5'];
    assertEqual(JSON.stringify(childNames), JSON.stringify(expectedNames));
  });

  runner.test('traverseNodes handles nested children correctly', () => {
    // Mock structure with nested children (module -> module -> functions)
    const mockJDoc: JDocNode = {
      id: 2000,
      name: 'parentModule',
      kind: NodeKind.Module,
      variant: 'declaration',
      sources: [{ url: "", fileName: 'test/parent.ts', line: 1, character: 0 }],
      children: [
        {
          id: 2001,
          name: 'childModule',
          kind: NodeKind.Module,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/child.ts', line: 1, character: 0 }],
          children: [
            {
              id: 2002,
              name: 'nestedFunc',
              kind: NodeKind.Function,
              variant: 'declaration',
              sources: [{ url: "", fileName: 'test/child.ts', line: 5, character: 0 }],
            },
          ],
        },
      ],
    };

    const nodes = traverseNodes(mockJDoc);

    // Should have 3 nodes total
    assertEqual(nodes.length, 3);

    // Find parent
    const parent = nodes.find(n => n.id === 2000);
    assert(parent !== undefined, 'Parent should be found');
    assertEqual(parent!.children.length, 1, 'Parent should have 1 child');

    // Find child module
    const childModule = parent!.children[0];
    assertEqual(childModule.id, 2001);
    assertEqual(childModule.name, 'childModule');
    assertEqual(childModule.children.length, 1, 'Child module should have 1 nested function');

    // Verify nested function
    const nestedFunc = childModule.children[0];
    assertEqual(nestedFunc.id, 2002);
    assertEqual(nestedFunc.name, 'nestedFunc');
  });

  runner.test('traverseNodes should NOT duplicate Class methods', () => {
    // Mock structure: Class with Methods (tests for duplicate processing bug)
    const mockJDoc: JDocNode = {
      id: 3000,
      name: 'MyClass',
      kind: NodeKind.Class,
      variant: 'declaration',
      sources: [{ url: "", fileName: 'test/class.ts', line: 1, character: 0 }],
      children: [
        {
          id: 3001,
          name: 'method1',
          kind: NodeKind.Method,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/class.ts', line: 5, character: 0 }],
        },
        {
          id: 3002,
          name: 'method2',
          kind: NodeKind.Method,
          variant: 'declaration',
          sources: [{ url: "", fileName: 'test/class.ts', line: 10, character: 0 }],
        },
      ],
    };

    const nodes = traverseNodes(mockJDoc);

    // Count how many times each method appears in results
    const method1Count = nodes.filter(n => n.id === 3001).length;
    const method2Count = nodes.filter(n => n.id === 3002).length;

    console.log(`\n🔍 Debug: Total nodes found: ${nodes.length}`);
    console.log(`🔍 Debug: method1 appears ${method1Count} times (should be 1)`);
    console.log(`🔍 Debug: method2 appears ${method2Count} times (should be 1)`);

    // Find the class
    const classNode = nodes.find(n => n.id === 3000);
    assert(classNode !== undefined, 'Class should be found');

    console.log(`🔍 Debug: Class has ${classNode!.children.length} children (should be 2)`);
    console.log(`🔍 Debug: Child IDs: ${classNode!.children.map(c => c.id).join(', ')}`);

    // BUG CHECK: Each method should appear ONCE in results, not twice
    assertEqual(method1Count, 1, 'method1 should appear exactly once in results (BUG: appears twice)');
    assertEqual(method2Count, 1, 'method2 should appear exactly once in results (BUG: appears twice)');

    // BUG CHECK: Class should have 2 children, not 4
    assertEqual(classNode!.children.length, 2, 'Class should have exactly 2 children (BUG: has 4)');

    // Verify no duplicate children IDs
    const childIds = classNode!.children.map(c => c.id);
    const uniqueIds = [...new Set(childIds)];
    assertEqual(childIds.length, uniqueIds.length, 'Children should not have duplicate IDs');
  });
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
