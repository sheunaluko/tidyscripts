/**
 * Tests for sync.ts - Path Filtering Logic
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import { NodeKind } from '../constants';
import type { ParsedNode } from '../types';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Sync - Path Filtering Logic');

  runner.test('path filter includes matching files', () => {
    // Simulate the filtering logic from syncAllFiles
    const nodesByFile = new Map<string, ParsedNode[]>([
      ['packages/ts_web/src/apis/index.ts', []],
      ['packages/ts_web/src/apis/firebase/index.ts', []],
      ['packages/ts_web/src/components/index.ts', []],
      ['packages/ts_common/src/apis/index.ts', []],
      ['packages/ts_node/src/index.ts', []],
    ]);

    const pathFilter = 'packages/ts_web/src/apis';

    // Apply filter (same logic as in syncAllFiles)
    const filtered = new Map<string, ParsedNode[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }

    assertEqual(filtered.size, 2, 'Should match 2 files in ts_web/src/apis');
    assert(filtered.has('packages/ts_web/src/apis/index.ts'), 'Should include apis/index.ts');
    assert(
      filtered.has('packages/ts_web/src/apis/firebase/index.ts'),
      'Should include apis/firebase/index.ts'
    );
    assert(
      !filtered.has('packages/ts_web/src/components/index.ts'),
      'Should exclude components'
    );
    assert(!filtered.has('packages/ts_common/src/apis/index.ts'), 'Should exclude ts_common');
  });

  runner.test('no filter includes all files', () => {
    const nodesByFile = new Map<string, ParsedNode[]>([
      ['packages/ts_web/src/apis/index.ts', []],
      ['packages/ts_web/src/components/index.ts', []],
      ['packages/ts_common/src/apis/index.ts', []],
    ]);

    const pathFilter = undefined;

    // When no filter, use original map
    const filtered = pathFilter ? new Map<string, ParsedNode[]>() : nodesByFile;

    assertEqual(filtered.size, 3, 'Should include all files when no filter');
  });

  runner.test('path filter with no matches returns empty', () => {
    const nodesByFile = new Map<string, ParsedNode[]>([
      ['packages/ts_web/src/apis/index.ts', []],
      ['packages/ts_web/src/components/index.ts', []],
      ['packages/ts_common/src/apis/index.ts', []],
    ]);

    const pathFilter = 'packages/non_existent';

    const filtered = new Map<string, ParsedNode[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }

    assertEqual(filtered.size, 0, 'Should match no files');
  });

  runner.test('path filter is case-sensitive', () => {
    const nodesByFile = new Map<string, ParsedNode[]>([
      ['packages/ts_web/src/apis/index.ts', []],
      ['packages/ts_web/src/APIS/other.ts', []],
    ]);

    const pathFilter = 'packages/ts_web/src/apis';

    const filtered = new Map<string, ParsedNode[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }

    assertEqual(filtered.size, 1, 'Should only match lowercase apis');
    assert(filtered.has('packages/ts_web/src/apis/index.ts'), 'Should match lowercase');
    assert(!filtered.has('packages/ts_web/src/APIS/other.ts'), 'Should not match uppercase');
  });

  runner.test('path filter matches subdirectories', () => {
    const nodesByFile = new Map<string, ParsedNode[]>([
      ['packages/ts_web/src/apis/index.ts', []],
      ['packages/ts_web/src/apis/firebase/index.ts', []],
      ['packages/ts_web/src/apis/firebase/auth/index.ts', []],
      ['packages/ts_web/src/components/index.ts', []],
    ]);

    const pathFilter = 'packages/ts_web/src/apis';

    const filtered = new Map<string, ParsedNode[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }

    assertEqual(filtered.size, 3, 'Should match all subdirectories');
    assert(filtered.has('packages/ts_web/src/apis/index.ts'), 'Should have apis/index.ts');
    assert(filtered.has('packages/ts_web/src/apis/firebase/index.ts'), 'Should have firebase/index.ts');
    assert(filtered.has('packages/ts_web/src/apis/firebase/auth/index.ts'), 'Should have auth/index.ts');
  });

  runner.test('path filter handles partial module names', () => {
    const nodesByFile = new Map<string, ParsedNode[]>([
      ['packages/ts_web/src/apis/index.ts', []],
      ['packages/ts_web/src/apis_v2/index.ts', []],
      ['packages/ts_common/src/apis/index.ts', []],
    ]);

    // More specific filter
    const pathFilter = 'ts_web/src/apis/';

    const filtered = new Map<string, ParsedNode[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }

    assertEqual(filtered.size, 1, 'Should only match exact directory with trailing slash');
    assert(filtered.has('packages/ts_web/src/apis/index.ts'), 'Should match apis/index.ts');
    assert(!filtered.has('packages/ts_web/src/apis_v2/index.ts'), 'Should not match apis_v2');
  });

  runner.suite('Sync - Node Grouping');

  runner.test('nodes grouped by file path correctly', () => {
    const nodes: ParsedNode[] = [
      {
        id: 1,
        name: 'func1',
        kind: NodeKind.Function,
        filePath: 'packages/ts_web/src/apis/index.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 2,
        name: 'func2',
        kind: NodeKind.Function,
        filePath: 'packages/ts_web/src/apis/index.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 3,
        name: 'func3',
        kind: NodeKind.Function,
        filePath: 'packages/ts_web/src/components/index.ts',
        docstring: '',
        sources: [],
        children: [],
      },
    ];

    // Simulate groupNodesByFile
    const grouped = new Map<string, ParsedNode[]>();
    for (const node of nodes) {
      if (!grouped.has(node.filePath)) {
        grouped.set(node.filePath, []);
      }
      grouped.get(node.filePath)!.push(node);
    }

    assertEqual(grouped.size, 2, 'Should group into 2 files');
    assertEqual(
      grouped.get('packages/ts_web/src/apis/index.ts')?.length,
      2,
      'apis/index.ts should have 2 nodes'
    );
    assertEqual(
      grouped.get('packages/ts_web/src/components/index.ts')?.length,
      1,
      'components/index.ts should have 1 node'
    );
  });

  runner.test('path filter integration with grouped nodes', () => {
    // Simulate the full filtering workflow
    const allNodes: ParsedNode[] = [
      {
        id: 1,
        name: 'webApiFunc',
        kind: NodeKind.Function,
        filePath: 'packages/ts_web/src/apis/index.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 2,
        name: 'webComponentFunc',
        kind: NodeKind.Function,
        filePath: 'packages/ts_web/src/components/index.ts',
        docstring: '',
        sources: [],
        children: [],
      },
      {
        id: 3,
        name: 'commonApiFunc',
        kind: NodeKind.Function,
        filePath: 'packages/ts_common/src/apis/index.ts',
        docstring: '',
        sources: [],
        children: [],
      },
    ];

    // Group by file
    const nodesByFile = new Map<string, ParsedNode[]>();
    for (const node of allNodes) {
      if (!nodesByFile.has(node.filePath)) {
        nodesByFile.set(node.filePath, []);
      }
      nodesByFile.get(node.filePath)!.push(node);
    }

    // Apply filter
    const pathFilter = 'packages/ts_web/src/apis';
    const filtered = new Map<string, ParsedNode[]>();
    for (const [filePath, nodes] of nodesByFile) {
      if (filePath.includes(pathFilter)) {
        filtered.set(filePath, nodes);
      }
    }

    // Count total nodes in filtered files
    let totalFilteredNodes = 0;
    for (const nodes of filtered.values()) {
      totalFilteredNodes += nodes.length;
    }

    assertEqual(filtered.size, 1, 'Should filter to 1 file');
    assertEqual(totalFilteredNodes, 1, 'Should have 1 node total');
    assert(
      filtered.get('packages/ts_web/src/apis/index.ts')?.[0]?.name === 'webApiFunc',
      'Should contain webApiFunc'
    );
  });
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
