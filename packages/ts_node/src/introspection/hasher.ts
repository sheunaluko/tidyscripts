/**
 * Hashing Utilities for Tidyscripts Introspection System
 *
 * Implements the two-hash strategy:
 * 1. nodeHash - Hash of ENTIRE node (for change detection)
 * 2. embeddingHash - Hash of embedding text only (for API cost savings)
 *
 * This allows us to detect when a node has changed but its embedding text
 * hasn't, so we can update metadata without regenerating embeddings.
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { HASH_ALGORITHM, HASH_ENCODING } from './constants';
import type { ParsedNode } from './types';

// ============================================================================
// Core Hashing Functions
// ============================================================================

/**
 * Hash a string using SHA-256
 *
 * @param text - Text to hash
 * @returns Hex-encoded hash
 */
export function hashString(text: string): string {
  return crypto
    .createHash(HASH_ALGORITHM)
    .update(text)
    .digest(HASH_ENCODING as crypto.BinaryToTextEncoding);
}

/**
 * Hash arbitrary data (objects, arrays, etc.)
 *
 * Serializes to JSON before hashing to ensure consistent ordering.
 *
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export function hashData(data: any): string {
  const serialized = JSON.stringify(data, Object.keys(data).sort());
  return hashString(serialized);
}

// ============================================================================
// File Hashing
// ============================================================================

/**
 * Hash a file's contents
 *
 * Used for file-level change detection. If the file hash hasn't changed,
 * we can skip processing entirely.
 *
 * @param filePath - Path to file
 * @returns Hex-encoded hash of file contents
 * @throws Error if file cannot be read
 */
export async function hashFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return hashString(content);
  } catch (error) {
    throw new Error(`Failed to hash file ${filePath}: ${error}`);
  }
}

/**
 * Hash multiple files and return a combined hash
 *
 * Useful for detecting changes across a set of files.
 *
 * @param filePaths - Array of file paths
 * @returns Combined hash of all files
 */
export async function hashFiles(filePaths: string[]): Promise<string> {
  const hashes = await Promise.all(filePaths.map(hashFile));
  return hashString(hashes.join(''));
}

// ============================================================================
// Node Hashing (Two-Hash Strategy)
// ============================================================================

/**
 * Generate nodeHash for a parsed node
 *
 * The nodeHash represents the ENTIRE node including:
 * - Name, kind, file path
 * - Complete signature (parameters, return type)
 * - Source locations (line numbers, URLs)
 * - Docstring
 * - Any other metadata
 *
 * This hash changes whenever ANY aspect of the node changes.
 *
 * @param node - Parsed node
 * @returns Hex-encoded node hash
 */
export function hashNode(node: ParsedNode): string {
  // Create a deterministic representation of the node
  const nodeData = {
    id: node.id,
    name: node.name,
    kind: node.kind,
    filePath: node.filePath,
    docstring: node.docstring,
    signature: node.signature,
    sources: node.sources,
    type: node.type,
    // Sort children by ID for consistency
    children: node.children
      .map(child => child.id)
      .sort((a, b) => a - b),
  };

  return hashData(nodeData);
}

/**
 * Generate embeddingHash for embedding text
 *
 * The embeddingHash represents ONLY the text that will be embedded.
 * This allows us to detect when embedding content changes independently
 * of other node metadata.
 *
 * Example scenario:
 * - Function implementation changes (line numbers shift)
 * - nodeHash changes (sources changed)
 * - But signature and docstring unchanged
 * - embeddingHash unchanged
 * - Result: Update metadata, reuse embedding!
 *
 * @param embeddingText - Text that will be embedded
 * @returns Hex-encoded embedding hash
 */
export function hashEmbeddingText(embeddingText: string): string {
  // Normalize the text before hashing
  const normalized = normalizeEmbeddingText(embeddingText);
  return hashString(normalized);
}

/**
 * Normalize embedding text for consistent hashing
 *
 * Removes insignificant whitespace variations that don't affect meaning.
 *
 * @param text - Raw embedding text
 * @returns Normalized text
 */
function normalizeEmbeddingText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .replace(/\n+/g, '\n'); // Collapse multiple newlines
}

// ============================================================================
// Batch Hashing
// ============================================================================

/**
 * Hash multiple nodes in batch
 *
 * @param nodes - Array of parsed nodes
 * @returns Array of node hashes (same order as input)
 */
export function hashNodes(nodes: ParsedNode[]): string[] {
  return nodes.map(hashNode);
}

/**
 * Hash multiple embedding texts in batch
 *
 * @param texts - Array of embedding texts
 * @returns Array of embedding hashes (same order as input)
 */
export function hashEmbeddingTexts(texts: string[]): string[] {
  return texts.map(hashEmbeddingText);
}

// ============================================================================
// Hash Comparison
// ============================================================================

/**
 * Compare two hashes for equality
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns true if hashes are equal
 */
export function hashesEqual(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Check if a node has changed based on hash comparison
 *
 * @param localNode - Local parsed node
 * @param remoteNodeHash - Hash from remote database
 * @returns true if node has changed
 */
export function hasNodeChanged(localNode: ParsedNode, remoteNodeHash: string): boolean {
  const localHash = hashNode(localNode);
  return !hashesEqual(localHash, remoteNodeHash);
}

/**
 * Check if embedding text has changed based on hash comparison
 *
 * @param embeddingText - Current embedding text
 * @param remoteEmbeddingHash - Hash from remote database
 * @returns true if embedding text has changed
 */
export function hasEmbeddingChanged(
  embeddingText: string,
  remoteEmbeddingHash: string
): boolean {
  const localHash = hashEmbeddingText(embeddingText);
  return !hashesEqual(localHash, remoteEmbeddingHash);
}

// ============================================================================
// Hash Utilities
// ============================================================================

/**
 * Generate a short hash for display purposes
 *
 * @param hash - Full hash
 * @param length - Number of characters to include (default: 8)
 * @returns Shortened hash
 */
export function shortHash(hash: string, length: number = 8): string {
  return hash.slice(0, length);
}

/**
 * Generate a content-addressable ID from a hash
 *
 * Useful for creating unique IDs based on content.
 *
 * @param hash - Full hash
 * @param prefix - Optional prefix (e.g., 'emb_', 'node_')
 * @returns Content-addressable ID
 */
export function contentAddressableId(hash: string, prefix: string = ''): string {
  return `${prefix}${hash}`;
}

// ============================================================================
// Hash Validation
// ============================================================================

/**
 * Validate that a string is a valid hash
 *
 * Checks format (hex string of correct length).
 *
 * @param hash - Hash to validate
 * @returns true if valid hash
 */
export function isValidHash(hash: string): boolean {
  // SHA-256 in hex is 64 characters
  const expectedLength = 64;
  const hexPattern = /^[0-9a-f]+$/i;

  return hash.length === expectedLength && hexPattern.test(hash);
}

/**
 * Validate multiple hashes
 *
 * @param hashes - Array of hashes to validate
 * @returns true if all hashes are valid
 */
export function areValidHashes(hashes: string[]): boolean {
  return hashes.every(isValidHash);
}

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Get hash information for debugging
 *
 * @param node - Parsed node
 * @param embeddingText - Embedding text for the node
 * @returns Debug information
 */
export function getHashDebugInfo(
  node: ParsedNode,
  embeddingText: string
): {
  nodeId: number;
  name: string;
  nodeHash: string;
  nodeHashShort: string;
  embeddingHash: string;
  embeddingHashShort: string;
  embeddingTextLength: number;
} {
  const nodeHash = hashNode(node);
  const embeddingHash = hashEmbeddingText(embeddingText);

  return {
    nodeId: node.id,
    name: node.name,
    nodeHash,
    nodeHashShort: shortHash(nodeHash),
    embeddingHash,
    embeddingHashShort: shortHash(embeddingHash),
    embeddingTextLength: embeddingText.length,
  };
}
