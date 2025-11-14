# Tidyscripts Codebase Introspection & RAG System
## Part 2: Querying & Agent Integration - Implementation Roadmap

---

## Overview

This document outlines the implementation plan for **Part 2** of the RAG system: querying the populated SurrealDB database and integrating with AI agents.

**Prerequisites**: Complete Part 1 (see `introspection_implementation_roadmap.md`)
- Database populated with codebase metadata
- Embeddings generated and cached
- File tracking and incremental updates working

**Scope**: Query interface → Semantic search → Agent integration → Auto-sync

---

## Architecture Overview

### Query System Components

1. **Semantic Search**: Vector similarity queries to find relevant code
2. **Graph Traversal**: Follow relationships (CONTAINS, USES) to understand context
3. **Hybrid Queries**: Combine semantic + graph for powerful lookups
4. **Context Assembly**: Gather all relevant information for agent consumption


---

## Implementation Phases

### Phase 1: Basic Query Interface
Build foundational query functions

- [ ] **1a.** Implement basic SELECT queries by nodeId, name, filePath
- [ ] **1b.** Implement count queries (how many functions/classes/modules)
- [ ] **1c.** Implement filter queries by kind (functions vs classes)
- [ ] **1d.** Add pagination support for large result sets
- [ ] **1e.** Implement query result formatting/transformation
- [ ] **1f.** Add error handling for malformed queries

**Code Example**:
```typescript
interface QueryResult {
  node: ParsedNode;
  similarity?: number;
  context?: {
    module: string;
    relatedFunctions: string[];
    usedTypes: string[];
  };
}

async function findByName(
  db: Surreal,
  name: string
): Promise<FunctionNode | null> {
  const result = await db.query(
    'SELECT * FROM function_node WHERE name = $name LIMIT 1',
    { name }
  );
  return result?.[0] || null;
}

async function findByFile(
  db: Surreal,
  filePath: string
): Promise<FunctionNode[]> {
  const results = await db.query(
    'SELECT * FROM function_node WHERE filePath = $path',
    { path: filePath }
  );
  return results;
}

async function countByKind(db: Surreal): Promise<Record<string, number>> {
  const counts = await db.query(`
    SELECT
      (SELECT count() FROM function_node)[0].count AS functions,
      (SELECT count() FROM class_node)[0].count AS classes,
      (SELECT count() FROM module_node)[0].count AS modules
  `);
  return counts[0];
}
```

---

### Phase 2: Semantic Search
Implement vector similarity search

- [ ] **2a.** Research SurrealDB vector search capabilities/extensions
- [ ] **2b.** Implement embedding generation for search queries
- [ ] **2c.** Implement cosine similarity search function
- [ ] **2d.** Add configurable similarity threshold
- [ ] **2e.** Implement result ranking by similarity score
- [ ] **2f.** Add support for filtering results by file/module/kind
- [ ] **2g.** Optimize search performance (indexing strategies)

**Code Example**:
```typescript
async function semanticSearch(
  db: Surreal,
  query: string,
  options: {
    limit?: number;
    threshold?: number;
    kind?: number; // Filter by node kind
    filePath?: string; // Filter by file
  } = {}
): Promise<QueryResult[]> {
  const { limit = 10, threshold = 0.5, kind, filePath } = options;

  // Generate embedding for search query
  const openai = new OpenAI();
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    encoding_format: 'float'
  });
  const embedding = queryEmbedding.data[0].embedding;

  // Vector similarity search
  // Note: Implementation depends on SurrealDB's vector capabilities
  // This is a conceptual example
  let queryStr = `
    SELECT *,
           vector::similarity::cosine(embedding, $queryEmbedding) AS similarity
    FROM function_node
    WHERE similarity > $threshold
  `;

  if (kind !== undefined) {
    queryStr += ' AND kind = $kind';
  }
  if (filePath) {
    queryStr += ' AND filePath = $filePath';
  }

  queryStr += `
    ORDER BY similarity DESC
    LIMIT $limit
  `;

  const results = await db.query(queryStr, {
    queryEmbedding: embedding,
    threshold,
    limit,
    kind,
    filePath
  });

  return results.map(r => ({
    node: r,
    similarity: r.similarity
  }));
}
```

**Notes**:
- SurrealDB vector search may require specific configuration or extensions
- Consider fallback strategies if native vector search not available
- May need to implement manual cosine similarity in application layer

---

### Phase 3: Graph Traversal Queries
Navigate relationships between nodes

- [ ] **3a.** Implement CONTAINS relationship queries (module → functions)
- [ ] **3b.** Implement USES relationship queries (function → types)
- [ ] **3c.** Implement reverse relationship queries (what contains this?)
- [ ] **3d.** Add multi-hop traversal (function → type → other functions using that type)
- [ ] **3e.** Implement shortest path queries between nodes
- [ ] **3f.** Add traversal depth limits to prevent infinite loops

**Code Example**:
```typescript
async function findModuleContents(
  db: Surreal,
  moduleId: number
): Promise<FunctionNode[]> {
  const results = await db.query(`
    SELECT ->CONTAINS->function_node AS functions
    FROM module_node
    WHERE nodeId = $id
  `, { id: moduleId });

  return results[0]?.functions || [];
}

async function findFunctionDependencies(
  db: Surreal,
  functionId: number
): Promise<any[]> {
  const results = await db.query(`
    SELECT ->USES->type_node AS dependencies
    FROM function_node
    WHERE nodeId = $id
  `, { id: functionId });

  return results[0]?.dependencies || [];
}

async function findFunctionsUsingType(
  db: Surreal,
  typeName: string
): Promise<FunctionNode[]> {
  const results = await db.query(`
    SELECT <-USES<-function_node AS functions
    FROM type_node
    WHERE name = $typeName
  `, { typeName });

  return results[0]?.functions || [];
}
```

---

### Phase 4: Hybrid Queries
Combine semantic search with graph traversal

- [ ] **4a.** Implement hybrid query: semantic search + context enrichment
- [ ] **4b.** Add "find related" queries (semantic search then graph expand)
- [ ] **4c.** Implement "find by example" (find similar to a specific function)
- [ ] **4d.** Add query composition (chain multiple query types)
- [ ] **4e.** Implement query result deduplication
- [ ] **4f.** Add relevance scoring (combine similarity + graph distance)

**Code Example**:
```typescript
async function hybridQuery(
  db: Surreal,
  semanticQuery: string,
  options: {
    limit?: number;
    includeRelated?: boolean;
    expandDepth?: number;
  } = {}
): Promise<QueryResult[]> {
  const { limit = 5, includeRelated = true, expandDepth = 1 } = options;

  // Step 1: Semantic search to find candidates
  const candidates = await semanticSearch(db, semanticQuery, { limit });

  if (!includeRelated) {
    return candidates;
  }

  // Step 2: Enrich each candidate with graph context
  const enriched = await Promise.all(
    candidates.map(async (candidate) => {
      // Find what this function uses (dependencies)
      const dependencies = await findFunctionDependencies(db, candidate.node.nodeId);

      // Find what module contains this
      const container = await db.query(`
        SELECT <-CONTAINS<-module_node AS module
        FROM function_node
        WHERE nodeId = $id
      `, { id: candidate.node.nodeId });

      return {
        ...candidate,
        context: {
          module: container[0]?.module?.name || 'unknown',
          relatedFunctions: dependencies.map(d => d.name),
          usedTypes: dependencies.filter(d => d.kind === 2097152).map(d => d.name)
        }
      };
    })
  );

  return enriched;
}

async function findSimilarToFunction(
  db: Surreal,
  functionId: number,
  limit: number = 5
): Promise<QueryResult[]> {
  // Get the target function's embedding
  const target = await db.query(
    'SELECT embeddingHash FROM function_node WHERE nodeId = $id',
    { id: functionId }
  );

  if (!target[0]) return [];

  // Get the actual embedding from cache
  const embeddingData = await db.query(
    'SELECT embedding FROM embedding_cache WHERE contentHash = $hash',
    { hash: target[0].embeddingHash }
  );

  if (!embeddingData[0]) return [];

  const embedding = embeddingData[0].embedding;

  // Find similar functions
  const results = await db.query(`
    SELECT *,
           vector::similarity::cosine(embedding, $embedding) AS similarity
    FROM function_node
    WHERE nodeId != $id
    ORDER BY similarity DESC
    LIMIT $limit
  `, { embedding, id: functionId, limit });

  return results.map(r => ({
    node: r,
    similarity: r.similarity
  }));
}
```

---

### Phase 5: Context Assembly
Format query results for agent consumption

- [ ] **5a.** Implement context formatter for single function
- [ ] **5b.** Implement context formatter for multiple results
- [ ] **5c.** Add source code snippet retrieval (read actual file)
- [ ] **5d.** Implement "explain this code" context assembly
- [ ] **5e.** Add "how to use this" context assembly
- [ ] **5f.** Implement context size limiting (token budgets)
- [ ] **5g.** Add context prioritization (most relevant first)

**Code Example**:
```typescript
interface AssembledContext {
  summary: string;
  functions: Array<{
    name: string;
    file: string;
    line: number;
    description: string;
    signature: string;
    sourceCode?: string;
  }>;
  relatedTypes: Array<{
    name: string;
    definition: string;
  }>;
}

async function assembleContext(
  db: Surreal,
  query: string,
  options: {
    includeSource?: boolean;
    maxTokens?: number;
  } = {}
): Promise<AssembledContext> {
  const { includeSource = false, maxTokens = 4000 } = options;

  // Perform hybrid query
  const results = await hybridQuery(db, query, { limit: 5 });

  // Assemble context
  const context: AssembledContext = {
    summary: `Found ${results.length} relevant functions for: "${query}"`,
    functions: [],
    relatedTypes: []
  };

  for (const result of results) {
    const funcContext = {
      name: result.node.name,
      file: result.node.filePath,
      line: result.node.sources[0]?.line || 0,
      description: result.node.docstring,
      signature: formatSignature(result.node.signature),
      sourceCode: undefined as string | undefined
    };

    // Optionally include source code
    if (includeSource) {
      funcContext.sourceCode = await getSourceCode(
        result.node.filePath,
        result.node.sources[0]?.line
      );
    }

    context.functions.push(funcContext);

    // Collect related types
    if (result.context?.usedTypes) {
      for (const typeName of result.context.usedTypes) {
        if (!context.relatedTypes.find(t => t.name === typeName)) {
          context.relatedTypes.push({
            name: typeName,
            definition: await getTypeDefinition(db, typeName)
          });
        }
      }
    }
  }

  return context;
}

function formatSignature(signature: any): string {
  if (!signature) return '';

  const params = signature.parameters
    ?.map((p: any) => `${p.name}: ${getTypeName(p.type)}`)
    .join(', ') || '';

  const returnType = getTypeName(signature.type) || 'void';

  return `(${params}): ${returnType}`;
}

async function getSourceCode(
  filePath: string,
  startLine: number,
  contextLines: number = 10
): Promise<string> {
  // Read source file and extract relevant lines
  const fs = require('fs').promises;
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const start = Math.max(0, startLine - contextLines);
  const end = Math.min(lines.length, startLine + contextLines);

  return lines.slice(start, end).join('\n');
}
```

---

### Phase 6: Agent Integration API
Build the interface for agents to query the codebase

- [ ] **6a.** Design agent API interface (class/functions)
- [ ] **6b.** Implement agent query method (natural language → context)
- [ ] **6c.** Add query caching for performance
- [ ] **6d.** Implement query history tracking
- [ ] **6e.** Add query analytics (what do agents search for?)
- [ ] **6f.** Implement rate limiting if needed
- [ ] **6g.** Add query explanation (why these results?)

**Code Example**:
```typescript
class CodebaseRAG {
  private queryCache: Map<string, AssembledContext> = new Map();

  constructor(private db: Surreal) {}

  /**
   * Main query method for agents
   * Accepts natural language query and returns formatted context
   */
  async query(
    prompt: string,
    options: {
      includeSource?: boolean;
      maxResults?: number;
      cacheResults?: boolean;
    } = {}
  ): Promise<string> {
    const { includeSource = true, maxResults = 5, cacheResults = true } = options;

    // Check cache
    const cacheKey = `${prompt}:${includeSource}:${maxResults}`;
    if (cacheResults && this.queryCache.has(cacheKey)) {
      console.log('Cache hit for query:', prompt);
      return this.formatContextForAgent(this.queryCache.get(cacheKey)!);
    }

    // Assemble context
    const context = await assembleContext(this.db, prompt, {
      includeSource,
      maxTokens: 4000
    });

    // Cache result
    if (cacheResults) {
      this.queryCache.set(cacheKey, context);
    }

    // Format for agent consumption
    return this.formatContextForAgent(context);
  }

  /**
   * Format context as readable text for agent
   */
  private formatContextForAgent(context: AssembledContext): string {
    let output = `${context.summary}\n\n`;

    output += '## Functions\n\n';
    for (const func of context.functions) {
      output += `### ${func.name}\n`;
      output += `**Location**: ${func.file}:${func.line}\n`;
      output += `**Signature**: \`${func.signature}\`\n`;
      output += `**Description**: ${func.description}\n`;

      if (func.sourceCode) {
        output += `\n**Source Code**:\n\`\`\`typescript\n${func.sourceCode}\n\`\`\`\n`;
      }
      output += '\n';
    }

    if (context.relatedTypes.length > 0) {
      output += '## Related Types\n\n';
      for (const type of context.relatedTypes) {
        output += `### ${type.name}\n`;
        output += `\`\`\`typescript\n${type.definition}\n\`\`\`\n\n`;
      }
    }

    return output;
  }

  /**
   * Find specific function by name
   */
  async findFunction(name: string): Promise<FunctionNode | null> {
    return findByName(this.db, name);
  }

  /**
   * Get all functions in a file
   */
  async getFunctionsInFile(filePath: string): Promise<FunctionNode[]> {
    return findByFile(this.db, filePath);
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }
}
```

---

### Phase 7: Auto-Sync on Code Changes
Keep database synchronized when agent modifies code

- [ ] **7a.** Implement file modification detection
- [ ] **7b.** Build auto-sync trigger system
- [ ] **7c.** Implement incremental TypeDoc regeneration
- [ ] **7d.** Add background sync queue (don't block agent)
- [ ] **7e.** Implement lazy sync strategy (batch updates)
- [ ] **7f.** Add sync status tracking
- [ ] **7g.** Test full workflow: modify → sync → query reflects changes

**Code Example**:
```typescript
class AgentIntegration {
  private modifiedFiles: Set<string> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  constructor(
    private rag: CodebaseRAG,
    private db: Surreal
  ) {}

  /**
   * Called when agent modifies a file
   */
  async onFileModified(filePath: string): Promise<void> {
    console.log(`File modified: ${filePath}`);
    this.modifiedFiles.add(filePath);

    // Schedule lazy sync (batch updates)
    this.scheduleLazySync();
  }

  /**
   * Schedule background sync
   */
  private scheduleLazySync(): void {
    if (this.syncInterval) return;

    // Sync every 5 minutes or when agent queries
    this.syncInterval = setTimeout(() => {
      this.syncAllModified();
      this.syncInterval = null;
    }, 5 * 60 * 1000);
  }

  /**
   * Sync all modified files
   */
  async syncAllModified(): Promise<void> {
    if (this.modifiedFiles.size === 0 || this.isSyncing) return;

    this.isSyncing = true;
    console.log(`Syncing ${this.modifiedFiles.size} modified files...`);

    try {
      // Regenerate TypeDoc for modified files
      await this.regenerateTypeDocs(Array.from(this.modifiedFiles));

      // Load updated jdoc.json
      const jdoc = await loadJdoc();

      // Sync each file
      for (const filePath of this.modifiedFiles) {
        await syncFile(filePath, this.db, jdoc);
      }

      this.modifiedFiles.clear();
      this.rag.clearCache(); // Invalidate query cache
      console.log('Sync complete!');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Regenerate TypeDoc documentation
   */
  private async regenerateTypeDocs(files: string[]): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // For now, regenerate full docs
    // TODO: Implement incremental regeneration
    await execAsync('npm run docs');
  }

  /**
   * Ensure fresh data before query (force sync if needed)
   */
  async ensureFresh(): Promise<void> {
    if (this.modifiedFiles.size > 0) {
      // Cancel scheduled sync and sync immediately
      if (this.syncInterval) {
        clearTimeout(this.syncInterval);
        this.syncInterval = null;
      }
      await this.syncAllModified();
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isSyncing: boolean;
    pendingFiles: number;
  } {
    return {
      isSyncing: this.isSyncing,
      pendingFiles: this.modifiedFiles.size
    };
  }
}

// Usage
const rag = new CodebaseRAG(db);
const agent = new AgentIntegration(rag, db);

// Agent modifies code
await writeFile('packages/common/auth.ts', newContent);
await agent.onFileModified('packages/common/auth.ts');

// Later, agent queries (ensures fresh data first)
await agent.ensureFresh();
const results = await rag.query('How does authentication work?');
// Results include the updated code!
```

---

## Usage Examples

### Example 1: Simple Semantic Search
```typescript
const rag = new CodebaseRAG(db);
const result = await rag.query('How do I validate email addresses?');
console.log(result);
// Returns formatted context with relevant functions
```

### Example 2: Find Similar Functions
```typescript
const similar = await findSimilarToFunction(db, 1037, 5);
console.log('Functions similar to ask_ai:', similar);
```

### Example 3: Agent Workflow
```typescript
// Agent asks question
const context = await rag.query('patient data handling', {
  includeSource: true,
  maxResults: 3
});

// Agent uses context to make decision
console.log('Context for agent:', context);

// Agent modifies code
await writeFile('packages/common/patient.ts', modifiedCode);
await agent.onFileModified('packages/common/patient.ts');

// Background sync happens automatically
// Next query will reflect changes
```

---

## Future Enhancements

- [ ] Call graph integration (function call tracking)
- [ ] Import relationship tracking
- [ ] Cross-file reference detection
- [ ] Breaking change detection
- [ ] Code complexity metrics
- [ ] Historical queries (code evolution over time)
- [ ] Multi-language support (if codebase expands)
- [ ] Query performance optimization
- [ ] Advanced ranking algorithms
- [ ] Query auto-completion/suggestions

---

## Progress Tracking

**Phases**:
- [ ] Phase 1: Basic Query Interface (1a-1f)
- [ ] Phase 2: Semantic Search (2a-2g)
- [ ] Phase 3: Graph Traversal Queries (3a-3f)
- [ ] Phase 4: Hybrid Queries (4a-4f)
- [ ] Phase 5: Context Assembly (5a-5g)
- [ ] Phase 6: Agent Integration API (6a-6g)
- [ ] Phase 7: Auto-Sync on Code Changes (7a-7g)

**Current Status**: Part 2 Planning Complete - Waiting for Part 1 Completion

---

## Notes

- Prerequisites: Complete Part 1 first (database must be populated)
- Vector search implementation depends on SurrealDB capabilities
- May need to implement custom similarity search if native support unavailable
- Performance optimization will be critical for large codebases
- Consider cost of embedding API calls for search queries (cache aggressively)
