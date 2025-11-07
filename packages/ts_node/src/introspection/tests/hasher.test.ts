/**
 * Tests for hasher.ts
 */

import { TestRunner, assert, assertEqual } from './test-runner';
import {
  hashString,
  hashData,
  hashNode,
  hashEmbeddingText,
  isValidHash,
  shortHash,
  hashesEqual,
} from '../hasher';
import type { ParsedNode } from '../types';

const runner = new TestRunner();

runner.run(async () => {
  runner.suite('Hasher - Basic Hashing');

  runner.test('hashString produces consistent hash', () => {
    const text = 'test string';
    const hash1 = hashString(text);
    const hash2 = hashString(text);
    assertEqual(hash1, hash2, 'Same input should produce same hash');
  });

  runner.test('hashString produces different hashes for different inputs', () => {
    const hash1 = hashString('test1');
    const hash2 = hashString('test2');
    assert(hash1 !== hash2, 'Different inputs should produce different hashes');
  });

  runner.test('hashString produces SHA-256 length hash', () => {
    const hash = hashString('test');
    assertEqual(hash.length, 64, 'SHA-256 hash should be 64 characters');
  });

  runner.test('hashData handles objects consistently', () => {
    const obj = { name: 'test', value: 123 };
    const hash1 = hashData(obj);
    const hash2 = hashData(obj);
    assertEqual(hash1, hash2, 'Same object should produce same hash');
  });

  runner.suite('Hasher - Node Hashing');

  runner.test('hashNode produces consistent hash for same node', () => {
    const node: ParsedNode = {
      id: 1,
      name: 'testFunction',
      kind: 64,
      filePath: 'test.ts',
      docstring: 'Test function',
      sources: [],
      children: [],
    };
    const hash1 = hashNode(node);
    const hash2 = hashNode(node);
    assertEqual(hash1, hash2, 'Same node should produce same hash');
  });

  runner.test('hashNode produces different hash for changed node', () => {
    const node1: ParsedNode = {
      id: 1,
      name: 'testFunction',
      kind: 64,
      filePath: 'test.ts',
      docstring: 'Test function',
      sources: [],
      children: [],
    };
    const node2: ParsedNode = {
      ...node1,
      docstring: 'Different docstring',
    };
    const hash1 = hashNode(node1);
    const hash2 = hashNode(node2);
    assert(hash1 !== hash2, 'Changed node should produce different hash');
  });

  runner.suite('Hasher - Embedding Hash');

  runner.test('hashEmbeddingText normalizes whitespace', () => {
    const text1 = 'test   function';
    const text2 = 'test function';
    const hash1 = hashEmbeddingText(text1);
    const hash2 = hashEmbeddingText(text2);
    assertEqual(hash1, hash2, 'Whitespace should be normalized');
  });

  runner.suite('Hasher - Utilities');

  runner.test('isValidHash validates correct hash', () => {
    const validHash = hashString('test');
    assert(isValidHash(validHash), 'Should validate correct hash');
  });

  runner.test('isValidHash rejects invalid hash', () => {
    assert(!isValidHash('not a hash'), 'Should reject invalid hash');
    assert(!isValidHash(''), 'Should reject empty string');
    assert(!isValidHash('abc123'), 'Should reject short hash');
  });

  runner.test('shortHash returns truncated hash', () => {
    const hash = hashString('test');
    const short = shortHash(hash, 8);
    assertEqual(short.length, 8, 'Short hash should be 8 characters');
    assertEqual(short, hash.slice(0, 8), 'Short hash should match first 8 chars');
  });

  runner.test('hashesEqual compares hashes correctly', () => {
    const hash1 = hashString('test');
    const hash2 = hashString('test');
    const hash3 = hashString('different');
    assert(hashesEqual(hash1, hash2), 'Same hashes should be equal');
    assert(!hashesEqual(hash1, hash3), 'Different hashes should not be equal');
  });
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
