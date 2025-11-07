# Tidyscripts Codebase Introspection & RAG System
## Part 1: Codebase to Database - Implementation Roadmap

---

## Overview

This document outlines the implementation plan for **Part 1** of the RAG system: ingesting the tidyscripts codebase into a SurrealDB database with vector embeddings.

**Scope**: JSON parsing → Embedding generation → Database storage → Validation

**Out of Scope** (see `introspection_querying_roadmap.md`): Query interface, semantic search, agent integration

The system reads JSON-rendered documentation (jdoc.json), parses and interprets it, generates vector embeddings for semantic retrieval, and stores architecture and metadata in a SurrealDB instance.

---

## Core Architecture

### Hybrid Storage Strategy

The system uses a **hybrid approach** combining SurrealDB's graph capabilities with vector embeddings:

**1. Full Structural Metadata (Graph Database)**
- Store complete JSON documentation structure in SurrealDB
- Preserve all relationships: Module → Function, Function → Parameters, etc.
- Enable graph queries: "find all functions that use PatientData type"
- Maintain source locations (fileName, line, character, GitHub URLs)
- Keep type information for static analysis

**2. Vector Embeddings (Semantic Search)**
- Generate embeddings from function signatures + docstrings + type info
- Store embedding vectors alongside metadata records
- Enable semantic queries: "find authentication-related functions"
- Each embedding links back to its full metadata record

**3. Why Hybrid?**
- Pure vector search loses precise relationships (imports, call chains)
- Pure graph search can't do semantic "find similar functions"
- Hybrid: Use vector search to find candidates, graph to understand context
- Example: "Find auth functions" (vector) → trace their dependencies (graph)

---

## JSON Documentation Structure (jdoc.json)

The JSON is TypeDoc output with a hierarchical structure:

### Root Level
```json
{
  "id": 0,
  "name": "Tidyscripts Docs",
  "variant": "project",
  "kind": 1,
  "children": [...]
}
```

### Common Node Properties
- `id`: Unique numeric identifier
- `name`: Name of the symbol (function, class, module, etc.)
- `variant`: "declaration" | "signature" | "project" | "param"
- `kind`: Numeric enum indicating node type (see below)
- `flags`: Object with boolean flags (isConst, isExported, etc.)
- `children`: Array of nested nodes
- `sources`: Array of source locations with fileName, line, character, url

### Kind Enum (Common Values)
- 1: Project
- 4: Module/Namespace
- 64: Function
- 128: Class
- 256: Interface
- 512: Constructor
- 1024: Property
- 2048: Method
- 4096: Call signature (function signature)
- 32768: Parameter
- 65536: Type literal
- 2097152: Type alias

### Function Node Structure
```json
{
  "id": 1037,
  "name": "ask_ai",
  "variant": "declaration",
  "kind": 64,
  "flags": {},
  "sources": [{
    "fileName": "packages/ts_common/src/apis/aidx.ts",
    "line": 65,
    "character": 22,
    "url": "https://github.com/..."
  }],
  "signatures": [{
    "id": 1038,
    "name": "ask_ai",
    "variant": "signature",
    "kind": 4096,
    "comment": {
      "summary": [
        {
          "kind": "text",
          "text": "This uses the Tidyscripts publicly provided API..."
        },
        {
          "kind": "code",
          "text": "```\nimport * as ts...\n```"
        }
      ]
    },
    "parameters": [{
      "id": 1039,
      "name": "prompt",
      "variant": "param",
      "kind": 32768,
      "type": {
        "type": "intrinsic",
        "name": "string"
      }
    }],
    "type": {
      "type": "reference",
      "name": "Promise",
      "typeArguments": [...]
    }
  }]
}
```

**Key Observations:**
- Docstrings are in `signatures[].comment.summary[]`
- Source locations include exact line/character positions
- Type information is fully nested
- Each node has unique ID for relationships

---

## Multi-Level Indexing Strategy

Create embeddings at three granularity levels:

### Tier 1: Module Level (Coarse-grained)
**Purpose**: "What modules exist and what do they do?"

**Embedding text format**:
```
Module: common/apis/aidx
Path: packages/ts_common/src/apis/aidx.ts
Docstring: AI and clinical decision support API utilities
Exports:
  - ask_ai(prompt: string, max_tokens: number): Promise<ApiResult> - OpenAI API wrapper
  - ai_cds(patient_data: PatientData): Promise<ApiResult> - AI clinical decision support
  - generate_patient_data(input: {one_liner, hp}): Promise<PatientData> - Generates patient data from text
  - clean_json_string(jstring: string): string - Cleans OpenAI JSON responses
Types: ApiResult, PatientData
```

**Best for**: "Where is authentication handled?" → Returns auth-related modules

### Tier 2: Class Level (Medium-grained)
**Purpose**: "What classes handle X functionality?"

**Embedding text format**:
```
Class: PatientDataHandler
Docstring: Handles patient data validation and transformation for HIPAA compliance
Methods:
  - validate(data: PatientData): boolean - Validates patient data format
  - transform(raw: any): PatientData - Transforms raw input to PatientData
  - encrypt(data: PatientData): EncryptedData - Encrypts sensitive patient information
  - audit(action: string, data: PatientData): void - Logs access for compliance
```

**Best for**: "Find classes that manage user sessions"

### Tier 3: Function Level (Fine-grained)
**Purpose**: "Find specific function that does Y"

**Embedding text format**:
```
ask_ai - This uses the Tidyscripts publicly provided API endpoint for OpenAI. Because it is implemented in Tidyscripts.common this function can be called from the browser or from server side node. There is no cost to use the API since the maintainer of Tidyscripts provides it for free (for now). - Parameters: prompt (string), max_tokens (number) - Returns: Promise<ApiResult>
```

**Best for**: "Which function validates email addresses?"

---

## Incremental Update & Caching Architecture

### Two-Hash Strategy

**ALL node types** (modules, classes, functions) maintain two hashes for optimal performance:

```typescript
interface FunctionNode {
  nodeId: number;           // From jdoc.json
  name: string;
  filePath: string;

  // HASH 1: Full node hash (for change detection & metadata updates)
  nodeHash: string;         // Hash of ENTIRE jdoc.json node (signature, sources, implementation metadata)

  // HASH 2: Embedding content hash (for API cost savings)
  embeddingHash: string;    // Hash of just the embedding text

  // Metadata that might change without affecting embedding
  sources: SourceLocation[];
  signature: FunctionSignature;
  embedding: number[];      // Or reference to content-addressable storage
}
```

**Why two hashes?**

Consider a refactored function:
```typescript
// Version 1
function validateEmail(email: string): boolean {
  return email.includes('@');
}

// Version 2 (refactored, better implementation)
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

- **nodeHash changes**: Source code changed, line numbers might shift
- **embeddingHash unchanged**: Signature and docstring identical
- **Action**: Update metadata (line numbers, sources) but reuse existing embedding!

### Content-Addressable Embedding Storage

Deduplicate embeddings across the codebase:

```typescript
// Two-tier storage:

// 1. NODE METADATA (by nodeId for relationships)
interface FunctionNode {
  nodeId: number;          // From jdoc.json - for graph relationships
  name: string;
  filePath: string;
  nodeHash: string;        // Hash of function definition
  embeddingHash: string;   // Points to embedding in content-addressable store
}

// 2. EMBEDDING CACHE (by content hash - deduplicated)
interface EmbeddingCache {
  contentHash: string;     // Primary key
  embedding: number[];     // The actual vector
  usageCount: number;      // Reference count
}
```

**Benefits**:
- Identical functions across files share one embedding
- Moved/copied functions reuse embeddings
- Massive API cost savings

### File-Level Tracking

```typescript
interface FileMetadata {
  filePath: string;
  contentHash: string;      // SHA-256 of file contents
  lastProcessed: Date;
  nodeIds: number[];        // IDs of nodes extracted from this file
}
```

---

## Module Structure

The introspection system is organized into focused, single-responsibility modules:

### File Organization

```
packages/ts_node/src/introspection/
├── index.ts                               # Main entry point and orchestration
├── introspection_implementation_roadmap.md # This file
├── introspection_querying_roadmap.md      # Part 2: Querying & Agent integration
├── README.md                              # Complete documentation
├── LOGGING.md                             # Logging guide and documentation
├── types.ts                               # TypeScript interfaces and type definitions
├── constants.ts                           # Constants and enums (NodeKind, etc.)
├── config.ts                              # Configuration and environment variables
├── logger.ts                              # Structured logging utility (NEW)
├── parser.ts                              # JSON parsing and traversal
├── hasher.ts                              # Hashing utilities (nodeHash, embeddingHash, fileHash)
├── embeddings.ts                          # Embedding generation and content-addressable caching
├── schema.ts                              # SurrealDB schema definition (SurrealQL)
├── database.ts                            # SurrealDB connection and operations
├── reconciler.ts                          # Batch reconciliation logic
├── sync.ts                                # Main synchronization orchestration
└── validate.ts                            # Database validation script
```

### Module Specifications

#### `types.ts`
**Purpose**: Central type definitions for the entire system

**Exports**:
```typescript
// jdoc.json node types
interface JDocNode {
  id: number;
  name: string;
  kind: number;
  variant: string;
  flags?: Record<string, boolean>;
  children?: JDocNode[];
  sources?: SourceLocation[];
  signatures?: SignatureNode[];
  comment?: CommentNode;
}

interface SourceLocation {
  fileName: string;
  line: number;
  character: number;
  url: string;
}

interface SignatureNode {
  id: number;
  name: string;
  kind: number;
  comment?: CommentNode;
  parameters?: ParameterNode[];
  type?: TypeNode;
}

interface CommentNode {
  summary?: Array<{kind: string; text: string}>;
}

// Parsed node types
interface ParsedNode {
  id: number;
  name: string;
  kind: number;
  filePath: string;
  docstring: string;
  signature?: SignatureNode;
  sources: SourceLocation[];
  children: ParsedNode[];
}

// Database node types
interface FunctionNode {
  nodeId: number;
  name: string;
  filePath: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  signature: any;
  sources: SourceLocation[];
  lastUpdated: Date;
}

interface ClassNode {
  nodeId: number;
  name: string;
  filePath: string;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  sources: SourceLocation[];
  lastUpdated: Date;
}

interface ModuleNode {
  nodeId: number;
  name: string;
  path: string;
  nodeHash: string;
  embeddingHash: string;
  docstring: string;
  exports: string[];
  lastUpdated: Date;
}

interface EmbeddingCache {
  contentHash: string;
  embedding: number[];
  usageCount: number;
}

interface FileMetadata {
  filePath: string;
  contentHash: string;
  lastProcessed: Date;
  nodeIds: number[];
}

// Reconciliation types
interface ReconcileResult {
  toCreate: ParsedNode[];
  toUpdate: ParsedNode[];
  toDelete: RemoteAsset[];
  unchanged: ParsedNode[];
}

interface RemoteAsset {
  nodeId: number;
  name: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
}
```

---

#### `constants.ts`
**Purpose**: Central constants and enums to avoid magic numbers

**Exports**:
```typescript
// NodeKind enum for jdoc.json node types
export const NodeKind = {
  Project: 1,
  Module: 4,
  Function: 64,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  CallSignature: 4096,
  Parameter: 32768,
  TypeLiteral: 65536,
  TypeAlias: 2097152
} as const;

export type NodeKind = typeof NodeKind[keyof typeof NodeKind];

// Node variant types
export const NodeVariant = {
  Project: 'project',
  Declaration: 'declaration',
  Signature: 'signature',
  Param: 'param'
} as const;

export type NodeVariant = typeof NodeVariant[keyof typeof NodeVariant];

// Default configuration values
export const DEFAULT_JDOC_PATH = 'apps/docs/jdoc.json';
export const DEFAULT_SURREAL_URL = 'http://localhost:8000';
export const DEFAULT_SURREAL_NAMESPACE = 'tidyscripts';
export const DEFAULT_SURREAL_DATABASE = 'introspection';
```

**Usage**:
```typescript
// Instead of magic numbers
if (node.kind === 64) { ... }  // ❌ Bad

// Use named constants
if (node.kind === NodeKind.Function) { ... }  // ✅ Good
```

---

#### `config.ts`
**Purpose**: Configuration management and environment variable loading

**Environment Variables** (all prefixed with `TS_INTROSPECTION_SURREAL_`):
- `TS_INTROSPECTION_SURREAL_URL` - SurrealDB connection URL (default: http://localhost:8000)
- `TS_INTROSPECTION_SURREAL_NAMESPACE` - Namespace (default: tidyscripts)
- `TS_INTROSPECTION_SURREAL_DATABASE` - Database name (default: introspection)
- `TS_INTROSPECTION_SURREAL_USER` - Username
- `TS_INTROSPECTION_SURREAL_PASSWORD` - Password

**Exports**:
```typescript
interface SurrealConfig {
  url: string;
  namespace: string;
  database: string;
  user: string;
  password: string;
}

function loadSurrealConfig(): SurrealConfig;
function getJdocPath(): string; // Returns path to jdoc.json
```

---

#### `parser.ts`
**Purpose**: Parse and traverse jdoc.json structure

**Exports**:
```typescript
function loadJdoc(path?: string): Promise<JDocNode>;
function traverseNodes(node: JDocNode, parentPath?: string): ParsedNode[];
function extractDocstring(node: JDocNode): string;
function groupNodesByFile(nodes: ParsedNode[]): Map<string, ParsedNode[]>;
function getTypeName(typeNode: any): string;
function getSignatureString(node: ParsedNode): string;
```

---

#### `hasher.ts`
**Purpose**: Hashing utilities for change detection

**Exports**:
```typescript
function hashFile(filePath: string): Promise<string>;
function hashNode(node: ParsedNode): string;
function hashString(text: string): string;
function hashEmbeddingText(node: ParsedNode): string;
```

---

#### `embeddings.ts`
**Purpose**: Embedding generation and content-addressable caching

**Exports**:
```typescript
function buildEmbeddingText(node: ParsedNode): string;
function buildFunctionEmbeddingText(node: ParsedNode): string;
function buildClassEmbeddingText(node: ParsedNode): string;
function buildModuleEmbeddingText(node: ParsedNode): string;
function generateEmbedding(text: string): Promise<number[]>;
function generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
function getOrGenerateEmbedding(
  contentHash: string,
  embeddingText: string,
  db: any
): Promise<number[]>;
```

**Notes**:
- OpenAI client should be initialized on-demand within functions, NOT at module level
- Use `new OpenAI()` without explicit env var (reads OPENAI_API_KEY automatically)
- Implement content-addressable caching to minimize API calls

---

#### `schema.ts`
**Purpose**: SurrealDB schema definition (SurrealQL)

**Exports**:
```typescript
// Complete SurrealDB schema as a constant string
export const SCHEMA: string;
```

**Schema Contents**:
The schema defines all tables, fields, and indexes:

- **function_node**: Stores function metadata
  - Fields: nodeId, name, filePath, kind, nodeHash, embeddingHash, docstring, signature, sources, lastUpdated
  - Indexes: nodeId (unique), kind, name, filePath

- **class_node**: Stores class metadata
  - Fields: nodeId, name, filePath, nodeHash, embeddingHash, docstring, sources, lastUpdated
  - Indexes: nodeId (unique), name, filePath

- **module_node**: Stores module metadata
  - Fields: nodeId, name, path, nodeHash, embeddingHash, docstring, exports, lastUpdated
  - Indexes: nodeId (unique), path

- **embedding_cache**: Content-addressable embedding storage
  - Fields: contentHash, embedding, usageCount
  - Indexes: contentHash (unique)

- **file_metadata**: File tracking for incremental updates
  - Fields: filePath, contentHash, lastProcessed, nodeIds
  - Indexes: filePath (unique)

- **Relationships**: CONTAINS, USES edges

**Example Structure**:
```typescript
export const SCHEMA = `
DEFINE TABLE function_node SCHEMAFULL;
DEFINE FIELD nodeId ON function_node TYPE number;
DEFINE FIELD name ON function_node TYPE string;
-- ... (complete schema definition)
`;
```

**Notes**:
- Separating schema makes database.ts more readable
- Easy to version/modify schema independently
- Can be imported and executed by initializeSchema()

---

#### `database.ts`
**Purpose**: SurrealDB connection and operations

**Exports**:
```typescript
function connect(): Promise<Surreal>;
function disconnect(db: Surreal): Promise<void>;
function initializeSchema(db: Surreal): Promise<void>; // Executes SCHEMA from schema.ts
function insertFunctionNode(db: Surreal, node: FunctionNode): Promise<void>;
function insertClassNode(db: Surreal, node: ClassNode): Promise<void>;
function insertModuleNode(db: Surreal, node: ModuleNode): Promise<void>;
function updateFunctionNode(db: Surreal, node: FunctionNode): Promise<void>;
function deleteFunctionNode(db: Surreal, nodeId: number): Promise<void>;
function getFileMetadata(db: Surreal, filePath: string): Promise<FileMetadata | null>;
function updateFileMetadata(db: Surreal, metadata: FileMetadata): Promise<void>;
function getRemoteAssets(db: Surreal, filePath: string): Promise<RemoteAsset[]>;
function createRelationships(db: Surreal): Promise<void>;
```

**Notes**:
- Imports SCHEMA from schema.ts
- initializeSchema() executes the schema definition
- All database operations are centralized here
- Uses config from config.ts for connection parameters

---

#### `reconciler.ts`
**Purpose**: Batch reconciliation and change detection

**Exports**:
```typescript
function reconcile(
  localNodes: ParsedNode[],
  remoteAssets: RemoteAsset[]
): ReconcileResult;

function processCreates(
  nodes: ParsedNode[],
  db: any
): Promise<void>;

function processUpdates(
  nodes: ParsedNode[],
  remoteAssets: RemoteAsset[],
  db: any
): Promise<void>;

function processDeletes(
  assets: RemoteAsset[],
  db: any
): Promise<void>;
```

---

#### `sync.ts`
**Purpose**: Main synchronization orchestration

**Exports**:
```typescript
function syncFile(
  filePath: string,
  db: any,
  jdoc: JDocNode
): Promise<void>;

function syncAllFiles(
  db: any
): Promise<void>;

function fullSync(): Promise<void>; // Main entry point
```

---

#### `index.ts`
**Purpose**: Main entry point and public API

**Exports**:
```typescript
export { fullSync } from './sync';
export { connect, disconnect } from './database';
export * from './types';

// Main function for CLI/testing
export async function get_codebase_json_documentation(): Promise<void>;
```

---

## Implementation Phases

### Phase 1: JSON Parsing & Extraction
Build the foundation for reading and understanding jdoc.json

- [ ] **1a.** Load and parse jdoc.json file from apps/docs/jdoc.json
- [ ] **1b.** Implement recursive JSON traversal to walk the node tree
- [ ] **1c.** Extract nodes by kind (use NodeKind constants: Function, Class, Interface, Module)
- [ ] **1d.** Parse comment/docstring data from signature nodes (signatures[].comment.summary[])
- [ ] **1e.** Extract source locations (fileName, line, character, GitHub URL)
- [ ] **1f.** Build parent-child relationship map (module contains functions, etc.)
- [ ] **1g.** Group nodes by source file path for batch processing

**Code Example**:
```typescript
import { NodeKind } from './constants';

interface ParsedNode {
  id: number;
  name: string;
  kind: number;
  filePath: string;
  docstring: string;
  signature?: FunctionSignature;
  sources: SourceLocation[];
  children: ParsedNode[];
}

function traverseNodes(node: any, parentPath: string = ''): ParsedNode[] {
  const results: ParsedNode[] = [];

  // Process current node - use NodeKind constants instead of magic numbers
  const relevantKinds = [
    NodeKind.Function,
    NodeKind.Class,
    NodeKind.Interface,
    NodeKind.Module
  ];

  if (node.kind && relevantKinds.includes(node.kind)) {
    const parsed: ParsedNode = {
      id: node.id,
      name: node.name,
      kind: node.kind,
      filePath: node.sources?.[0]?.fileName || parentPath,
      docstring: extractDocstring(node),
      signature: node.signatures?.[0],
      sources: node.sources || [],
      children: []
    };
    results.push(parsed);
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      results.push(...traverseNodes(child, node.sources?.[0]?.fileName || parentPath));
    }
  }

  return results;
}

function extractDocstring(node: any): string {
  if (!node.signatures?.[0]?.comment?.summary) return '';

  return node.signatures[0].comment.summary
    .filter((s: any) => s.kind === 'text')
    .map((s: any) => s.text)
    .join(' ');
}

function groupNodesByFile(nodes: ParsedNode[]): Map<string, ParsedNode[]> {
  const grouped = new Map<string, ParsedNode[]>();

  for (const node of nodes) {
    const existing = grouped.get(node.filePath) || [];
    existing.push(node);
    grouped.set(node.filePath, existing);
  }

  return grouped;
}
```

---

### Phase 2: Text Preparation for Embedding
Transform parsed nodes into embedding-ready text

- [ ] **2a.** Implement function-level embedding text builder
  - Format: `{name} - {docstring} - Parameters: {params} - Returns: {returnType}`
- [ ] **2b.** Implement class-level embedding text builder
  - Include all method signatures and class docstring
- [ ] **2c.** Implement module-level embedding text builder
  - Include exported symbols summary
- [ ] **2d.** Normalize and clean text (remove code blocks, excessive whitespace)
- [ ] **2e.** Implement hashing functions for both nodeHash and embeddingHash

**Code Example**:
```typescript
import { NodeKind } from './constants';

function buildEmbeddingText(node: ParsedNode): string {
  switch (node.kind) {
    case NodeKind.Function:
      return buildFunctionEmbeddingText(node);
    case NodeKind.Class:
      return buildClassEmbeddingText(node);
    case NodeKind.Module:
      return buildModuleEmbeddingText(node);
    default:
      return `${node.name} - ${node.docstring}`;
  }
}

function buildFunctionEmbeddingText(node: ParsedNode): string {
  const params = node.signature?.parameters
    ?.map(p => `${p.name} (${getTypeName(p.type)})`)
    .join(', ') || '';

  const returnType = getTypeName(node.signature?.type) || 'void';

  return `${node.name} - ${node.docstring} - Parameters: ${params} - Returns: ${returnType}`;
}

function buildClassEmbeddingText(node: ParsedNode): string {
  const methods = node.children
    .filter(c => c.kind === NodeKind.Method)
    .map(m => `  - ${m.name}${getSignatureString(m)} - ${m.docstring}`)
    .join('\n');

  return `Class: ${node.name}\nDocstring: ${node.docstring}\nMethods:\n${methods}`;
}

function buildModuleEmbeddingText(node: ParsedNode): string {
  const exports = node.children
    .map(c => `  - ${c.name}${getSignatureString(c)} - ${c.docstring}`)
    .join('\n');

  const types = node.children
    .filter(c => c.kind === NodeKind.TypeAlias)
    .map(c => c.name)
    .join(', ');

  return `Module: ${node.name}\nPath: ${node.filePath}\nDocstring: ${node.docstring}\nExports:\n${exports}\nTypes: ${types}`;
}

function hashNode(node: ParsedNode): string {
  const crypto = require('crypto');
  const nodeData = JSON.stringify({
    name: node.name,
    signature: node.signature,
    sources: node.sources,
    docstring: node.docstring
  });
  return crypto.createHash('sha256').update(nodeData).digest('hex');
}

function hashString(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex');
}
```

---

### Phase 3: SurrealDB Schema Design
Define the database structure for graph relationships and embeddings

- [ ] **3a.** Define FunctionNode table schema with nodeHash and embeddingHash
- [ ] **3b.** Define ClassNode table schema
- [ ] **3c.** Define ModuleNode table schema
- [ ] **3d.** Define TypeNode table schema
- [ ] **3e.** Define EmbeddingCache table for content-addressable storage
- [ ] **3f.** Define FileMetadata table for file-level tracking
- [ ] **3g.** Define relationship edges:
  - Module -[CONTAINS]-> Function/Class
  - Function -[USES]-> Type
  - Module -[IMPORTS]-> Module (future enhancement)
- [ ] **3h.** Create indexes on kind, name, fileName, and embedding vectors

**Code Example**:
```typescript
// SurrealDB Schema Definition

const SCHEMA = `
-- Function nodes
DEFINE TABLE function_node SCHEMAFULL;
DEFINE FIELD nodeId ON function_node TYPE number;
DEFINE FIELD name ON function_node TYPE string;
DEFINE FIELD filePath ON function_node TYPE string;
DEFINE FIELD kind ON function_node TYPE number;
DEFINE FIELD nodeHash ON function_node TYPE string;
DEFINE FIELD embeddingHash ON function_node TYPE string;
DEFINE FIELD docstring ON function_node TYPE string;
DEFINE FIELD signature ON function_node TYPE object;
DEFINE FIELD sources ON function_node TYPE array;
DEFINE FIELD lastUpdated ON function_node TYPE datetime;

DEFINE INDEX idx_nodeId ON function_node FIELDS nodeId UNIQUE;
DEFINE INDEX idx_kind ON function_node FIELDS kind;
DEFINE INDEX idx_name ON function_node FIELDS name;
DEFINE INDEX idx_file ON function_node FIELDS filePath;

-- Class nodes
DEFINE TABLE class_node SCHEMAFULL;
DEFINE FIELD nodeId ON class_node TYPE number;
DEFINE FIELD name ON class_node TYPE string;
DEFINE FIELD filePath ON class_node TYPE string;
DEFINE FIELD nodeHash ON class_node TYPE string;
DEFINE FIELD embeddingHash ON class_node TYPE string;
DEFINE FIELD docstring ON class_node TYPE string;
DEFINE FIELD sources ON class_node TYPE array;
DEFINE FIELD lastUpdated ON class_node TYPE datetime;

-- Module nodes
DEFINE TABLE module_node SCHEMAFULL;
DEFINE FIELD nodeId ON module_node TYPE number;
DEFINE FIELD name ON module_node TYPE string;
DEFINE FIELD path ON module_node TYPE string;
DEFINE FIELD nodeHash ON module_node TYPE string;
DEFINE FIELD embeddingHash ON module_node TYPE string;
DEFINE FIELD docstring ON module_node TYPE string;
DEFINE FIELD exports ON module_node TYPE array;
DEFINE FIELD lastUpdated ON module_node TYPE datetime;

-- Content-addressable embedding cache
DEFINE TABLE embedding_cache SCHEMAFULL;
DEFINE FIELD contentHash ON embedding_cache TYPE string;
DEFINE FIELD embedding ON embedding_cache TYPE array;
DEFINE FIELD usageCount ON embedding_cache TYPE number DEFAULT 0;

DEFINE INDEX idx_contentHash ON embedding_cache FIELDS contentHash UNIQUE;

-- File metadata for incremental updates
DEFINE TABLE file_metadata SCHEMAFULL;
DEFINE FIELD filePath ON file_metadata TYPE string;
DEFINE FIELD contentHash ON file_metadata TYPE string;
DEFINE FIELD lastProcessed ON file_metadata TYPE datetime;
DEFINE FIELD nodeIds ON file_metadata TYPE array;

DEFINE INDEX idx_filePath ON file_metadata FIELDS filePath UNIQUE;

-- Relationships
DEFINE TABLE CONTAINS SCHEMAFULL;
DEFINE FIELD in ON CONTAINS TYPE record;
DEFINE FIELD out ON CONTAINS TYPE record;

DEFINE TABLE USES SCHEMAFULL;
DEFINE FIELD in ON USES TYPE record;
DEFINE FIELD out ON USES TYPE record;
`;

async function initializeSchema(db: Surreal) {
  await db.query(SCHEMA);
  console.log('Schema initialized successfully');
}
```

---

### Phase 4: Batch Reconciliation System
Implement efficient file-level and function-level change detection

- [ ] **4a.** Implement file content hashing
- [ ] **4b.** Implement file-level change detection (compare local vs remote file hash)
- [ ] **4c.** Implement batch retrieval of remote assets for a file
- [ ] **4d.** Implement in-memory reconciliation algorithm (diff local vs remote)
- [ ] **4e.** Categorize changes: toCreate, toUpdate, toDelete, unchanged
- [ ] **4f.** Implement smart update logic using two-hash comparison
  - nodeHash changed, embeddingHash unchanged → update metadata only
  - embeddingHash changed → update metadata AND re-embed

**Code Example**:
```typescript
interface ReconcileResult {
  toCreate: ParsedNode[];
  toUpdate: ParsedNode[];
  toDelete: RemoteAsset[];
  unchanged: ParsedNode[];
}

interface RemoteAsset {
  nodeId: number;
  name: string;
  kind: number;
  nodeHash: string;
  embeddingHash: string;
}

async function syncFile(filePath: string, db: Surreal, jdoc: any) {
  // Step 1: File-level check
  const localFileHash = await hashFile(filePath);
  const remoteFile = await db.query(
    'SELECT contentHash FROM file_metadata WHERE filePath = $path',
    { path: filePath }
  );

  if (localFileHash === remoteFile?.[0]?.contentHash) {
    console.log(`File ${filePath} unchanged - skipping`);
    return;
  }

  console.log(`File ${filePath} changed - reconciling...`);

  // Step 2: Batch fetch ALL remote assets for this file
  const remoteAssets = await db.query<RemoteAsset[]>(`
    SELECT nodeId, name, kind, nodeHash, embeddingHash
    FROM function_node
    WHERE filePath = $path
  `, { path: filePath });

  // Step 3: Get local nodes from jdoc.json
  const allNodes = traverseNodes(jdoc);
  const localNodes = allNodes.filter(n => n.filePath === filePath);

  // Step 4: In-memory batch reconciliation
  const diff = reconcile(localNodes, remoteAssets[0] || []);

  console.log(`Reconciliation: ${diff.toCreate.length} create, ${diff.toUpdate.length} update, ${diff.toDelete.length} delete, ${diff.unchanged.length} unchanged`);

  // Step 5: Process changes
  await processCreates(diff.toCreate, db);
  await processUpdates(diff.toUpdate, remoteAssets[0] || [], db);
  await processDeletes(diff.toDelete, db);

  // Step 6: Update file metadata
  await db.query(`
    UPDATE file_metadata
    SET contentHash = $hash,
        lastProcessed = time::now(),
        nodeIds = $nodeIds
    WHERE filePath = $path
  `, {
    path: filePath,
    hash: localFileHash,
    nodeIds: localNodes.map(n => n.id)
  });
}

function reconcile(localNodes: ParsedNode[], remoteAssets: RemoteAsset[]): ReconcileResult {
  const remoteMap = new Map(remoteAssets.map(a => [a.nodeId, a]));
  const localMap = new Map(localNodes.map(n => [n.id, n]));

  const toCreate: ParsedNode[] = [];
  const toUpdate: ParsedNode[] = [];
  const unchanged: ParsedNode[] = [];

  // Check each local node
  for (const local of localNodes) {
    const remote = remoteMap.get(local.id);

    if (!remote) {
      toCreate.push(local); // New node
    } else {
      const localHash = hashNode(local);
      if (localHash !== remote.nodeHash) {
        toUpdate.push(local); // Changed
      } else {
        unchanged.push(local); // Same hash - skip
      }
    }
    remoteMap.delete(local.id); // Mark as processed
  }

  // Remaining remote nodes were deleted locally
  const toDelete = Array.from(remoteMap.values());

  return { toCreate, toUpdate, toDelete, unchanged };
}

async function processUpdates(nodes: ParsedNode[], remoteAssets: RemoteAsset[], db: Surreal) {
  for (const node of nodes) {
    const newNodeHash = hashNode(node);
    const embeddingText = buildEmbeddingText(node);
    const newEmbeddingHash = hashString(embeddingText);

    const remote = remoteAssets.find(a => a.nodeId === node.id);

    if (newEmbeddingHash === remote?.embeddingHash) {
      // Embedding unchanged - just update metadata
      await db.query(`
        UPDATE function_node
        SET nodeHash = $nodeHash,
            sources = $sources,
            lastUpdated = time::now()
        WHERE nodeId = $id
      `, { id: node.id, nodeHash: newNodeHash, sources: node.sources });

      console.log(`  ${node.name}: Metadata updated, embedding reused`);
    } else {
      // Embedding content changed - need new embedding
      const embedding = await getOrGenerateEmbedding(newEmbeddingHash, embeddingText, db);

      await db.query(`
        UPDATE function_node
        SET nodeHash = $nodeHash,
            embeddingHash = $newEmbeddingHash,
            sources = $sources,
            lastUpdated = time::now()
        WHERE nodeId = $id
      `, { id: node.id, nodeHash: newNodeHash, newEmbeddingHash, sources: node.sources });

      console.log(`  ${node.name}: Metadata AND embedding updated`);
    }
  }
}
```

---

### Phase 5: Vector Embedding Generation
Integrate with embedding API and implement content-addressable caching

- [ ] **5a.** Set up embedding model (OpenAI text-embedding-3-small)
- [ ] **5b.** Implement embedding generation function with error handling
- [ ] **5c.** Implement batch embedding generation for efficiency
- [ ] **5d.** Implement getOrGenerateEmbedding with content-addressable cache lookup
- [ ] **5e.** Track and log cache hit rates
- [ ] **5f.** Handle embedding failures gracefully (retry logic)

**Important Notes**:
- Initialize OpenAI client ON-DEMAND within functions, NOT at module level
- Use `new OpenAI()` without explicit env var (reads OPENAI_API_KEY automatically)
- This prevents errors when API key is missing during module import

**Code Example**:
```typescript
import OpenAI from 'openai';

// DO NOT initialize at module level!
// const openai = new OpenAI(); // ❌ WRONG

async function generateEmbedding(text: string): Promise<number[]> {
  // Initialize on-demand within function ✓
  const openai = new OpenAI(); // Reads OPENAI_API_KEY from env automatically

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const openai = new OpenAI(); // On-demand initialization

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    encoding_format: 'float'
  });

  return response.data.map(d => d.embedding);
}

async function getOrGenerateEmbedding(
  contentHash: string,
  embeddingText: string,
  db: Surreal
): Promise<number[]> {
  // Check content-addressable cache
  const cached = await db.query<{embedding: number[]}[]>(
    'SELECT embedding FROM embedding_cache WHERE contentHash = $hash',
    { hash: contentHash }
  );

  if (cached?.[0]?.length > 0) {
    // Cache hit!
    await db.query(
      'UPDATE embedding_cache SET usageCount += 1 WHERE contentHash = $hash',
      { hash: contentHash }
    );
    console.log(`    Cache HIT for hash ${contentHash.slice(0, 8)}...`);
    return cached[0][0].embedding;
  }

  // Cache miss - generate new embedding
  console.log(`    Cache MISS - generating embedding for hash ${contentHash.slice(0, 8)}...`);
  const embedding = await generateEmbedding(embeddingText);

  // Store in cache
  await db.query(`
    INSERT INTO embedding_cache (contentHash, embedding, usageCount)
    VALUES ($hash, $embedding, 1)
  `, { hash: contentHash, embedding });

  return embedding;
}

// Track cache statistics
interface CacheStats {
  totalGenerated: number;
  totalCacheHits: number;
}

const stats: CacheStats = {
  totalGenerated: 0,
  totalCacheHits: 0
};
```

---

### Phase 6: Storage & Indexing
Persist all data to SurrealDB with proper indexes

- [ ] **6a.** Implement batch insert for new nodes
- [ ] **6b.** Implement batch update for changed nodes
- [ ] **6c.** Implement batch delete for removed nodes
- [ ] **6d.** Create relationship edges (CONTAINS, USES)
- [ ] **6e.** Validate relationship integrity
- [ ] **6f.** Create vector similarity search index
- [ ] **6g.** Verify all indexes are created and optimized

**Code Example**:
```typescript
async function processCreates(nodes: ParsedNode[], db: Surreal) {
  for (const node of nodes) {
    const nodeHash = hashNode(node);
    const embeddingText = buildEmbeddingText(node);
    const embeddingHash = hashString(embeddingText);
    const embedding = await getOrGenerateEmbedding(embeddingHash, embeddingText, db);

    await db.query(`
      INSERT INTO function_node {
        nodeId: $id,
        name: $name,
        filePath: $filePath,
        kind: $kind,
        nodeHash: $nodeHash,
        embeddingHash: $embeddingHash,
        docstring: $docstring,
        signature: $signature,
        sources: $sources,
        lastUpdated: time::now()
      }
    `, {
      id: node.id,
      name: node.name,
      filePath: node.filePath,
      kind: node.kind,
      nodeHash,
      embeddingHash,
      docstring: node.docstring,
      signature: node.signature,
      sources: node.sources
    });

    console.log(`  Created: ${node.name}`);
  }
}

async function processDeletes(assets: RemoteAsset[], db: Surreal) {
  for (const asset of assets) {
    await db.query('DELETE function_node WHERE nodeId = $id', { id: asset.nodeId });
    console.log(`  Deleted: ${asset.name}`);
  }
}

async function createRelationships(db: Surreal) {
  // Create CONTAINS relationships (Module -> Functions)
  await db.query(`
    LET $modules = (SELECT * FROM module_node);
    LET $functions = (SELECT * FROM function_node);

    FOR $module IN $modules {
      FOR $func IN $functions {
        IF $func.filePath CONTAINS $module.path {
          RELATE $module->CONTAINS->$func;
        }
      }
    }
  `);
}
```

---

## Validation & Testing

After completing Phases 1-6, validate that the database is properly populated:

### Validation Checklist

- [ ] **V1.** Verify database schema is created correctly
- [ ] **V2.** Confirm all tables exist (function_node, class_node, module_node, embedding_cache, file_metadata)
- [ ] **V3.** Check that nodes are inserted with correct data
  - Verify nodeId, name, filePath, docstring are populated
  - Confirm nodeHash and embeddingHash are generated
  - Check sources array contains correct line numbers
- [ ] **V4.** Validate embeddings are stored
  - Check embedding_cache table has entries
  - Verify embedding vectors are correct dimensionality
  - Confirm usageCount increments on cache hits
- [ ] **V5.** Test file metadata tracking
  - Verify file_metadata table populated
  - Check contentHash matches actual file content
  - Confirm nodeIds array contains all nodes from file
- [ ] **V6.** Test incremental updates
  - Modify a source file
  - Run sync again
  - Verify only changed nodes are updated
  - Confirm unchanged nodes reuse cached embeddings
- [ ] **V7.** Verify relationships are created
  - Check CONTAINS edges (Module -> Function)
  - Verify USES edges if implemented
- [ ] **V8.** Test edge cases
  - Empty files
  - Files with no exported functions
  - Functions without docstrings
  - Nested modules

### Validation Queries

Use these queries to validate database content:

```typescript
async function validateDatabase(db: Surreal) {
  // Count nodes by type
  const counts = await db.query(`
    SELECT
      (SELECT count() FROM function_node)[0].count AS functions,
      (SELECT count() FROM class_node)[0].count AS classes,
      (SELECT count() FROM module_node)[0].count AS modules,
      (SELECT count() FROM embedding_cache)[0].count AS embeddings,
      (SELECT count() FROM file_metadata)[0].count AS files
  `);
  console.log('Database counts:', counts);

  // Sample function nodes
  const sampleFunctions = await db.query(`
    SELECT * FROM function_node LIMIT 5
  `);
  console.log('Sample functions:', JSON.stringify(sampleFunctions, null, 2));

  // Check embedding dimensions
  const sampleEmbedding = await db.query(`
    SELECT embedding FROM embedding_cache LIMIT 1
  `);
  if (sampleEmbedding[0]?.length > 0) {
    const dim = sampleEmbedding[0][0].embedding.length;
    console.log(`Embedding dimensionality: ${dim} (expected: 1536 for text-embedding-3-small)`);
  }

  // Check cache hit rates
  const cacheStats = await db.query(`
    SELECT
      count() AS total_entries,
      math::sum(usageCount) AS total_usage,
      math::max(usageCount) AS max_usage
    FROM embedding_cache
  `);
  console.log('Cache statistics:', cacheStats);

  // Verify file tracking
  const fileTracking = await db.query(`
    SELECT filePath, contentHash, array::len(nodeIds) AS node_count
    FROM file_metadata
    ORDER BY node_count DESC
    LIMIT 10
  `);
  console.log('Top files by node count:', fileTracking);

  // Check for missing data
  const missingDocstrings = await db.query(`
    SELECT name, filePath
    FROM function_node
    WHERE docstring = '' OR docstring IS NULL
    LIMIT 10
  `);
  console.log('Functions without docstrings:', missingDocstrings);
}
```

### Success Criteria

The database is properly populated when:

✅ All tables are created with correct schema
✅ function_node, class_node, module_node tables have entries
✅ Embeddings are stored with correct dimensionality (1536 for text-embedding-3-small)
✅ embedding_cache shows cache hits (usageCount > 1 for some entries)
✅ file_metadata tracks all processed files
✅ Incremental updates only modify changed nodes
✅ No critical errors in logs
✅ Validation queries return expected results

---

## Next Steps

Once Part 1 (Codebase → Database) is complete and validated, proceed to:

**`introspection_querying_roadmap.md`** - Part 2: Database Querying & Agent Integration

Part 2 will cover:
- Semantic search by embedding similarity
- Graph traversal queries (dependencies, usages)
- Hybrid query interface (semantic + graph)
- Context assembly for agents
- Agent integration and auto-sync workflows
- Query result ranking and filtering

---

## Progress Tracking

Use this roadmap to track implementation progress. Check off each lettered sub-phase as completed:

**Phases**:
- [x] Phase 1: JSON Parsing & Extraction (1a-1g) ✅
- [x] Phase 2: Text Preparation for Embedding (2a-2e) ✅
- [x] Phase 3: SurrealDB Schema Design (3a-3h) ✅
- [x] Phase 4: Batch Reconciliation System (4a-4f) ✅
- [x] Phase 5: Vector Embedding Generation (5a-5f) ✅
- [x] Phase 6: Storage & Indexing (6a-6g) ✅
- [ ] Validation & Testing (V1-V8) - Ready to test

**Current Status**: ✅ Part 1 Implementation COMPLETE - All modules implemented, SurrealDB API updated, and structured logging integrated

**Modules Implemented**:
- ✅ types.ts
- ✅ constants.ts
- ✅ config.ts
- ✅ logger.ts (structured logging with timestamps, context, and performance tracking)
- ✅ parser.ts (integrated with logger)
- ✅ hasher.ts
- ✅ embeddings.ts (integrated with logger)
- ✅ schema.ts
- ✅ database.ts (updated for new SurrealDB API + logger integration)
- ✅ reconciler.ts (integrated with logger)
- ✅ sync.ts (integrated with logger)
- ✅ index.ts
- ✅ validate.ts (integrated with logger)
- ✅ README.md (updated with logging documentation)
- ✅ LOGGING.md (comprehensive logging guide)

**Logging System**:
- ✅ All console.log statements replaced with structured logger
- ✅ Timestamped logs across all modules
- ✅ Contextual information (file paths, node IDs, operations)
- ✅ Performance tracking with automatic timers
- ✅ Configurable log levels (DEBUG, INFO, WARN, ERROR, SILENT)
- ✅ Full error stack traces with context
- ✅ Easy log trace debugging from any error

**Next**: Run validation testing (V1-V8) after setting up SurrealDB + OpenAI

---

## Notes

- All code examples are starting points and should be adapted to tidyscripts conventions
- Error handling should be added to all production code
- ✅ **Comprehensive logging and monitoring now integrated** - All modules use structured logger with timestamps, context, and performance tracking
- Test each phase independently before proceeding to the next
- Maintain backward compatibility with existing tidyscripts infrastructure
- Focus on completing Part 1 (this roadmap) before moving to Part 2 (querying)

### Logging Best Practices

The system now implements structured logging throughout:

**Environment Variable**:
```bash
export TS_INTROSPECTION_LOG_LEVEL=DEBUG  # DEBUG, INFO, WARN, ERROR, SILENT
```

**Log Features**:
- Timestamps on every log entry (ISO format)
- Structured context objects (file paths, node IDs, hashes, etc.)
- Performance timers for operations
- Full error stack traces with contextual information
- Progress indicators for batch operations
- Complete log trace from all modules leading up to errors

**Usage in Code**:
```typescript
import { logger } from './logger';

// Info logging with context
logger.info('Processing file', { filePath, nodeCount });

// Performance tracking
logger.startTimer('operation-name');
// ... do work ...
const duration = logger.endTimer('operation-name');
logger.logTiming('Operation completed', duration);

// Error logging with full context
logger.error('Operation failed', error, {
  operation: 'sync',
  filePath,
  nodeId,
  nodeName,
});
```

**Debugging**:
- Set `TS_INTROSPECTION_LOG_LEVEL=DEBUG` to see all cache hits/misses, hash comparisons, and reconciliation decisions
- Log output includes module name, timestamp, level, message, and structured context
- Easy to trace execution flow across all modules
- Performance bottlenecks visible through timing logs
