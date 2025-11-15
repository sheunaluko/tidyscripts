/**
 * Embedding Generation for Tidyscripts Introspection System
 *
 * Generates vector embeddings from code documentation using OpenAI's API.
 * Implements content-addressable caching to minimize API costs.
 *
 * CRITICAL: OpenAI client is initialized ON-DEMAND within functions,
 * NOT at module level, to avoid errors when API key is missing.
 */

import OpenAI from 'openai';
import type Surreal from 'surrealdb';
import { NodeKind, EMBEDDING_MODEL, MAX_EMBEDDING_BATCH_SIZE, RETRY_CONFIG } from './constants';
import { getTypeName, getSignatureString } from './parser';
import { logger } from './logger';
import type { ParsedNode } from './types';

// DO NOT initialize OpenAI client at module level!
// const openai = new OpenAI(); // ❌ WRONG - will error if OPENAI_API_KEY not set

// ============================================================================
// Embedding Text Generation
// ============================================================================

/**
 * Build embedding text from a parsed node
 *
 * Delegates to specialized builders based on node kind.
 *
 * @param node - Parsed node
 * @returns Text to embed
 */
export function buildEmbeddingText(node: ParsedNode): string {
  switch (node.kind) {
    case NodeKind.Function:
      return buildFunctionEmbeddingText(node);

    case NodeKind.Class:
      return buildClassEmbeddingText(node);

    case NodeKind.Interface:
      return buildInterfaceEmbeddingText(node);

    case NodeKind.Module:
      return buildModuleEmbeddingText(node);

    case NodeKind.Method:
      return buildMethodEmbeddingText(node);

    case NodeKind.TypeAlias:
      return buildTypeAliasEmbeddingText(node);

    default:
      return buildGenericEmbeddingText(node);
  }
}

/**
 * Build embedding text for a function
 *
 * Format: {name} - {docstring} - Parameters: {params} - Returns: {returnType}
 *
 * @param node - Function node
 * @returns Embedding text
 */
export function buildFunctionEmbeddingText(node: ParsedNode): string {
  const params = node.signature?.parameters
    ?.map(p => `${p.name} (${getTypeName(p.type)})`)
    .join(', ') || '';

  const returnType = getTypeName(node.signature?.type) || 'void';
  const docstring = node.docstring || 'No documentation';

  return `${node.name} - ${docstring} - Parameters: ${params} - Returns: ${returnType}`;
}

/**
 * Build embedding text for a method (similar to function but includes context)
 *
 * @param node - Method node
 * @returns Embedding text
 */
export function buildMethodEmbeddingText(node: ParsedNode): string {
  return buildFunctionEmbeddingText(node);
}

/**
 * Build embedding text for a class
 *
 * Format:
 * Class: {name}
 * Docstring: {docstring}
 * Methods:
 *   - {method1}({params}) - {docstring}
 *   - {method2}({params}) - {docstring}
 *
 * @param node - Class node
 * @returns Embedding text
 */
export function buildClassEmbeddingText(node: ParsedNode): string {
  const docstring = node.docstring || 'No documentation';

  const methods = node.children
    .filter(c => c.kind === NodeKind.Method)
    .map(m => {
      const sig = getSignatureString(m);
      const doc = m.docstring || 'No documentation';
      return `  - ${m.name}${sig} - ${doc}`;
    })
    .join('\n');

  const methodsSection = methods ? `\nMethods:\n${methods}` : '';

  return `Class: ${node.name}\nDocstring: ${docstring}${methodsSection}`;
}

/**
 * Build embedding text for an interface
 *
 * Similar to class embedding.
 *
 * @param node - Interface node
 * @returns Embedding text
 */
export function buildInterfaceEmbeddingText(node: ParsedNode): string {
  const docstring = node.docstring || 'No documentation';

  const methods = node.children
    .filter(c => c.kind === NodeKind.Method || c.kind === NodeKind.Property)
    .map(m => {
      const sig = getSignatureString(m);
      const doc = m.docstring || 'No documentation';
      return `  - ${m.name}${sig} - ${doc}`;
    })
    .join('\n');

  const membersSection = methods ? `\nMembers:\n${methods}` : '';

  return `Interface: ${node.name}\nDocstring: ${docstring}${membersSection}`;
}

/**
 * Build embedding text for a module
 *
 * Format:
 * Module: {name}
 * Path: {filePath}
 * Docstring: {docstring}
 * Exports:
 *   - {export1}({params}) - {docstring}
 *   - {export2}({params}) - {docstring}
 * Types: {type1}, {type2}
 *
 * @param node - Module node
 * @returns Embedding text
 */
export function buildModuleEmbeddingText(node: ParsedNode): string {
  const docstring = node.docstring || 'No documentation';

  const exports = node.children
    .filter(c => ([NodeKind.Function, NodeKind.Class, NodeKind.Interface] as number[]).includes(c.kind))
    .map(e => {
      const sig = getSignatureString(e);
      const doc = e.docstring || 'No documentation';
      return `  - ${e.name}${sig} - ${doc}`;
    })
    .join('\n');

  const types = node.children
    .filter(c => c.kind === NodeKind.TypeAlias)
    .map(t => t.name)
    .join(', ');

  const exportsSection = exports ? `\nExports:\n${exports}` : '';
  const typesSection = types ? `\nTypes: ${types}` : '';

  return `Module: ${node.name}\nPath: ${node.filePath}\nDocstring: ${docstring}${exportsSection}${typesSection}`;
}

/**
 * Build embedding text for a type alias
 *
 * @param node - Type alias node
 * @returns Embedding text
 */
export function buildTypeAliasEmbeddingText(node: ParsedNode): string {
  const docstring = node.docstring || 'No documentation';
  const typeName = node.type ? getTypeName(node.type) : 'unknown';

  return `Type: ${node.name} = ${typeName} - ${docstring}`;
}

/**
 * Build generic embedding text for unknown node types
 *
 * @param node - Any node
 * @returns Embedding text
 */
export function buildGenericEmbeddingText(node: ParsedNode): string {
  const docstring = node.docstring || 'No documentation';
  return `${node.name} - ${docstring}`;
}

// ============================================================================
// OpenAI API Integration
// ============================================================================

/**
 * Generate embedding for a single text
 *
 * CRITICAL: Initializes OpenAI client on-demand within function.
 *
 * @param text - Text to embed
 * @returns Embedding vector (1536 dimensions for text-embedding-3-small)
 * @throws Error if API call fails
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Initialize on-demand within function ✓
  const openai = new OpenAI(); // Reads OPENAI_API_KEY from env automatically

  logger.startTimer('embedding-generation');
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    });

    const duration = logger.endTimer('embedding-generation');
    logger.debug('Embedding generated', {
      textLength: text.length,
      durationMs: duration,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Embedding generation failed', error as Error, {
      textLength: text.length,
      model: EMBEDDING_MODEL,
    });
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * More efficient than generating one at a time.
 * Automatically chunks into batches of MAX_EMBEDDING_BATCH_SIZE.
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors (same order as input)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Initialize on-demand within function ✓
  const openai = new OpenAI();

  // Split into chunks if needed
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += MAX_EMBEDDING_BATCH_SIZE) {
    chunks.push(texts.slice(i, i + MAX_EMBEDDING_BATCH_SIZE));
  }

  const allEmbeddings: number[][] = [];

  for (const chunk of chunks) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk,
        encoding_format: 'float',
      });

      const embeddings = response.data.map(d => d.embedding);
      allEmbeddings.push(...embeddings);

      logger.debug('Batch embeddings generated', { count: embeddings.length });
    } catch (error) {
      logger.error('Batch embedding generation failed', error as Error, {
        batchSize: chunk.length,
      });
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }

  return allEmbeddings;
}

/**
 * Generate embedding with retry logic
 *
 * Retries with exponential backoff on failure.
 *
 * @param text - Text to embed
 * @param retryCount - Current retry count (internal use)
 * @returns Embedding vector
 */
export async function generateEmbeddingWithRetry(
  text: string,
  retryCount: number = 0
): Promise<number[]> {
  try {
    return await generateEmbedding(text);
  } catch (error) {
    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delayMs = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount);
      logger.warn('Retrying embedding generation', {
        attempt: retryCount + 1,
        maxRetries: RETRY_CONFIG.maxRetries,
        delayMs,
      });

      await sleep(delayMs);
      return generateEmbeddingWithRetry(text, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Sleep utility for retry logic
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Content-Addressable Caching
// ============================================================================

/**
 * Get or generate embedding with content-addressable caching
 *
 * Checks if an embedding with the same contentHash already exists.
 * If yes, increments usage count and returns cached embedding.
 * If no, generates new embedding and stores in cache.
 *
 * @param contentHash - Hash of embedding text
 * @param embeddingText - Text to embed
 * @param db - SurrealDB instance
 * @returns Embedding vector
 */
export async function getOrGenerateEmbedding(
  contentHash: string,
  embeddingText: string,
  db: Surreal
): Promise<number[]> {
  // Check content-addressable cache
  const cached = await db.query<[{ embedding: number[] , id  : any }[]]>(
    'SELECT embedding,id FROM embedding_cache WHERE contentHash = $hash',
    { hash: contentHash }
  );

  const cachedResult = cached?.[0];
  if (cachedResult && cachedResult.length > 0) {
    // Cache hit!
    await db.query(
      'UPDATE embedding_cache SET usageCount += 1 WHERE contentHash = $hash',
      { hash: contentHash }
    );

    logger.debug('Embedding cache HIT', {
      contentHash: contentHash.slice(0, 8) + '...',
    });
    return cachedResult[0].id;
  }

  // Cache miss - generate new embedding
  logger.debug('Embedding cache MISS - generating new embedding', {
    contentHash: contentHash.slice(0, 8) + '...',
    textLength: embeddingText.length,
  });
  const embedding = await generateEmbeddingWithRetry(embeddingText);

  // Store in cache
  let r = await db.query(
    `INSERT INTO embedding_cache (contentHash, embedding, usageCount) VALUES ($hash, $embedding, 1)`,
    { hash: contentHash, embedding }
  ) as any ; 

    let inserted_record = r[0][0]; 
    
  return inserted_record.id;
}

// ============================================================================
// Statistics & Monitoring
// ============================================================================

/**
 * Cache statistics tracker
 */
export class EmbeddingStatsTracker {
  private totalGenerated: number = 0;
  private totalCacheHits: number = 0;
  private startTime: Date = new Date();

  recordGeneration(): void {
    this.totalGenerated++;
  }

  recordCacheHit(): void {
    this.totalCacheHits++;
  }

  getStats() {
    const total = this.totalGenerated + this.totalCacheHits;
    const hitRate = total > 0 ? this.totalCacheHits / total : 0;

    return {
      totalGenerated: this.totalGenerated,
      totalCacheHits: this.totalCacheHits,
      total,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      runtime: Date.now() - this.startTime.getTime(),
    };
  }

  reset(): void {
    this.totalGenerated = 0;
    this.totalCacheHits = 0;
    this.startTime = new Date();
  }
}

/**
 * Global stats tracker instance
 */
export const embeddingStats = new EmbeddingStatsTracker();
