/**
 * JSON Parsing and Traversal for Tidyscripts Introspection System
 *
 * Loads and parses TypeDoc-generated jdoc.json, extracts relevant nodes,
 * and prepares them for embedding generation and database storage.
 */

import * as fs from 'fs/promises';
import { NodeKind, shouldGenerateEmbedding, getKindName } from './constants';
import { logger } from './logger';
import type { JDocNode, ParsedNode, TypeNode, SignatureNode } from './types';

// ============================================================================
// JSON Loading
// ============================================================================

/**
 * Load and parse jdoc.json file
 *
 * @param path - Path to jdoc.json file
 * @returns Parsed jdoc.json root node
 * @throws Error if file cannot be read or parsed
 */
export async function loadJdoc(path: string): Promise<JDocNode> {
  logger.startTimer('jdoc-load');
  try {
    const content = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(content);

    const duration = logger.endTimer('jdoc-load');
    logger.info('Loaded jdoc.json', {
      path,
      rootNode: parsed.name,
      kind: getKindName(parsed.kind),
      children: parsed.children?.length || 0,
    });
    logger.logTiming('jdoc.json load', duration);

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.error('jdoc.json not found', error as Error, { path });
      throw new Error(`jdoc.json not found at path: ${path}`);
    }
    logger.error('Failed to load jdoc.json', error as Error, { path });
    throw new Error(`Failed to load jdoc.json: ${error}`);
  }
}

// ============================================================================
// Docstring Extraction
// ============================================================================

/**
 * Extract docstring from a node's comment structure
 *
 * TypeDoc stores comments in signatures[].comment.summary[] as an array of
 * text and code blocks. We extract text blocks and join them.
 *
 * @param node - JDoc node
 * @returns Extracted docstring (empty string if none)
 */
export function extractDocstring(node: JDocNode): string {
  // Try signatures first (for functions/methods)
  if (node.signatures && node.signatures.length > 0) {
    const signature = node.signatures[0];
    if (signature.comment?.summary) {
      return extractCommentText(signature.comment.summary);
    }
  }

  // Try direct comment (for classes/interfaces/modules)
  if (node.comment?.summary) {
    return extractCommentText(node.comment.summary);
  }

  return '';
}

/**
 * Extract text from comment summary array
 *
 * @param summary - Array of comment blocks
 * @returns Concatenated text
 */
function extractCommentText(summary: Array<{ kind: string; text: string }>): string {
  return summary
    .filter(block => block.kind === 'text')
    .map(block => block.text.trim())
    .filter(text => text.length > 0)
    .join(' ');
}

// ============================================================================
// Type System Helpers
// ============================================================================

/**
 * Get a human-readable type name from a TypeNode
 *
 * @param typeNode - Type node from jdoc.json
 * @returns Type name string
 */
export function getTypeName(typeNode: TypeNode | undefined): string {
  if (!typeNode) return 'any';

  switch (typeNode.type) {
    case 'intrinsic':
      return typeNode.name || 'unknown';

    case 'reference':
      if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const args = typeNode.typeArguments.map(getTypeName).join(', ');
        return `${typeNode.name}<${args}>`;
      }
      return typeNode.name || 'unknown';

    case 'array':
      return `${getTypeName(typeNode.elementType)}[]`;

    case 'union':
      return typeNode.types?.map(getTypeName).join(' | ') || 'unknown';

    case 'intersection':
      return typeNode.types?.map(getTypeName).join(' & ') || 'unknown';

    case 'literal':
      return JSON.stringify(typeNode.value);

    case 'reflection':
      return 'object';

    default:
      return typeNode.type || 'unknown';
  }
}

/**
 * Get signature string from a parsed node
 *
 * Constructs a function signature like: (param1: type1, param2: type2) => ReturnType
 *
 * @param node - Parsed node
 * @returns Signature string
 */
export function getSignatureString(node: ParsedNode): string {
  if (!node.signature) return '';

  const params = node.signature.parameters
    ?.map(p => `${p.name}: ${getTypeName(p.type)}`)
    .join(', ') || '';

  const returnType = getTypeName(node.signature.type);

  return `(${params}) => ${returnType}`;
}

// ============================================================================
// Node Traversal
// ============================================================================

/**
 * Recursively traverse jdoc.json node tree and extract relevant nodes
 *
 * Extracts nodes of kinds that should have embeddings generated
 * (functions, classes, interfaces, modules, methods).
 *
 * @param node - Current node to process
 * @param parentPath - File path from parent node
 * @returns Array of parsed nodes
 */
export function traverseNodes(node: JDocNode, parentPath: string = ''): ParsedNode[] {
  const results: ParsedNode[] = [];

  // Determine the file path for this node
  const filePath = node.sources?.[0]?.fileName || parentPath;

  // Process current node if it should have an embedding
  if (shouldGenerateEmbedding(node.kind)) {
    const parsed: ParsedNode = {
      id: node.id,
      name: node.name,
      kind: node.kind,
      filePath,
      docstring: extractDocstring(node),
      signature: node.signatures?.[0],
      sources: node.sources || [],
      children: [],
      type: node.type,
    };

    results.push(parsed);
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      const childNodes = traverseNodes(child, filePath);
      results.push(...childNodes);

      // If we processed the parent, attach children to it
      if (results.length > 0 && shouldGenerateEmbedding(node.kind)) {
        const parent = results[results.length - 1 - childNodes.length];
        if (parent && parent.id === node.id) {
          parent.children.push(...childNodes);
        }
      }
    }
  }

  // For methods, also check signatures array
  if (node.kind === NodeKind.Class || node.kind === NodeKind.Interface) {
    if (node.children) {
      for (const child of node.children) {
        if (child.kind === NodeKind.Method || child.kind === NodeKind.Property) {
          const methodNodes = traverseNodes(child, filePath);
          if (results.length > 0) {
            const parent = results.find(r => r.id === node.id);
            if (parent) {
              parent.children.push(...methodNodes);
            }
          }
        }
      }
    }
  }

  return results;
}

/**
 * Extract all nodes from jdoc.json root
 *
 * Convenience wrapper around traverseNodes that starts from the root.
 *
 * @param root - Root jdoc.json node
 * @returns Array of all parsed nodes
 */
export function extractAllNodes(root: JDocNode): ParsedNode[] {
  const nodes = traverseNodes(root);

  const stats = {
    total: nodes.length,
    functions: nodes.filter(n => n.kind === NodeKind.Function).length,
    classes: nodes.filter(n => n.kind === NodeKind.Class).length,
    interfaces: nodes.filter(n => n.kind === NodeKind.Interface).length,
    modules: nodes.filter(n => n.kind === NodeKind.Module).length,
    methods: nodes.filter(n => n.kind === NodeKind.Method).length,
  };

  logger.info('Extracted nodes from jdoc.json', stats);

  return nodes;
}

// ============================================================================
// Node Grouping
// ============================================================================

/**
 * Group parsed nodes by source file path
 *
 * Groups nodes for file-level batch processing during sync.
 *
 * @param nodes - Array of parsed nodes
 * @returns Map of file path to nodes from that file
 */
export function groupNodesByFile(nodes: ParsedNode[]): Map<string, ParsedNode[]> {
  const grouped = new Map<string, ParsedNode[]>();

  for (const node of nodes) {
    if (!node.filePath) {
      logger.warn('Node has no file path, skipping', {
        nodeName: node.name,
        nodeId: node.id,
      });
      continue;
    }

    const existing = grouped.get(node.filePath) || [];
    existing.push(node);
    grouped.set(node.filePath, existing);
  }

  logger.debug('Grouped nodes by file', {
    totalNodes: nodes.length,
    fileCount: grouped.size,
  });

  return grouped;
}

/**
 * Group parsed nodes by kind (for analysis)
 *
 * @param nodes - Array of parsed nodes
 * @returns Map of kind to nodes of that kind
 */
export function groupNodesByKind(nodes: ParsedNode[]): Map<number, ParsedNode[]> {
  const grouped = new Map<number, ParsedNode[]>();

  for (const node of nodes) {
    const existing = grouped.get(node.kind) || [];
    existing.push(node);
    grouped.set(node.kind, existing);
  }

  return grouped;
}

// ============================================================================
// Node Filtering
// ============================================================================

/**
 * Filter nodes by kind
 *
 * @param nodes - Array of parsed nodes
 * @param kinds - Array of kinds to include
 * @returns Filtered nodes
 */
export function filterNodesByKind(nodes: ParsedNode[], kinds: number[]): ParsedNode[] {
  return nodes.filter(node => kinds.includes(node.kind));
}

/**
 * Filter nodes by file path pattern
 *
 * @param nodes - Array of parsed nodes
 * @param pattern - Regex pattern to match file paths
 * @returns Filtered nodes
 */
export function filterNodesByFilePath(nodes: ParsedNode[], pattern: RegExp): ParsedNode[] {
  return nodes.filter(node => pattern.test(node.filePath));
}

/**
 * Get nodes without docstrings
 *
 * Useful for finding documentation gaps.
 *
 * @param nodes - Array of parsed nodes
 * @returns Nodes without docstrings
 */
export function getNodesWithoutDocstrings(nodes: ParsedNode[]): ParsedNode[] {
  return nodes.filter(node => !node.docstring || node.docstring.trim().length === 0);
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get parsing statistics
 *
 * @param nodes - Array of parsed nodes
 * @returns Statistics object
 */
export function getParsingStats(nodes: ParsedNode[]): {
  totalNodes: number;
  byKind: Record<string, number>;
  byFile: Record<string, number>;
  withDocstrings: number;
  withoutDocstrings: number;
  filesProcessed: number;
} {
  const byKind: Record<string, number> = {};
  const byFile: Record<string, number> = {};
  let withDocstrings = 0;
  let withoutDocstrings = 0;

  for (const node of nodes) {
    // Count by kind
    const kindName = getKindName(node.kind);
    byKind[kindName] = (byKind[kindName] || 0) + 1;

    // Count by file
    byFile[node.filePath] = (byFile[node.filePath] || 0) + 1;

    // Count docstrings
    if (node.docstring && node.docstring.trim().length > 0) {
      withDocstrings++;
    } else {
      withoutDocstrings++;
    }
  }

  return {
    totalNodes: nodes.length,
    byKind,
    byFile,
    withDocstrings,
    withoutDocstrings,
    filesProcessed: Object.keys(byFile).length,
  };
}
