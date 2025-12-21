---
title: "Cortex: A Composable Agent Architecture for AI Applications"
description: "Deep dive into Cortex — an agentic AI architecture with composable functions, knowledge graphs, and provider-agnostic design."
date: "2024-12-21"
author: "TidyScripts"
tags: ["ai", "agents", "typescript", "surrealdb", "architecture"]
---

# Cortex: A Novel Agent Architecture Enabling Composable Tool Calls 

Building AI agents that can reason, use tools, and persist knowledge is challenging.

Cortex's key innovation is an architecture that enables Tool Call Composition, which allows the agent to orchestrate complex "Call Chains" that weave outputs of tool calls into inputs of other tool calls, ultimately returning the final result to the user - all without polluting the model context.

This is enabled by a unique call syntax as well as a "CortexRAM" module that persists intermediate values using an ID system.

What you get is the ability to perform complex computation like this:

```typescript
// User: "Save this note about quantum computing to my knowledge base"
// Cortex outputs a single call chain:
{
  thoughts: "I'll collect the note, compute its embedding, and store it",
  calls: [
    { name: "accumulate_text", parameters: { prompt: "Enter your note:" } },
    { name: "compute_embedding", parameters: { text: "$0" } },
    { name: "save_to_database", parameters: { text: "$0", embedding: "$1" } }
  ],
  return_indeces: [2]
}
// $0 = user's note, $1 = embedding vector — chained without extra LLM calls
```

Also novel is the ability for the agent to store a "Call Chain" as a re-usable template or "Call Chain Template". A huge advantage of call chain templates is that the agent can create and store templates for re-use later, which allows the agent to augment its own abilities over time using the available composable tools! 


This post walks through the key concepts behind Cortex, a novel agentic AI architecture built on TypeScript and SurrealDB. 

The source is available on [github](https://github.com/sheunaluko/tidyscripts/blob/master/apps/ts_next_app/app/laboratory/src/cortex.ts), though is heavily in under construction.

Please reach out on [LinkedIn](https://www.linkedin.com/in/sheun-aluko/). I would love to hear your thoughts and feedback, and am excited to collaborate. 

---

## The Agent Loop

At its core, Cortex is an event-driven agent that extends `EventEmitter`. The agent runs in a loop, invoking the LLM and executing function calls until it decides to respond to the user.

```typescript
class Cortex extends EventEmitter {
  model: string;
  provider: Provider;
  functions: Function[];
  messages: IOMessages;
  CortexRAM: { [k: string]: any };

  async run_llm(loop: number = 6): Promise<string> {
    // Call LLM with structured output schema
    const result = await this.callProvider();
    return this.handle_llm_response(result, loop);
  }
}
```

Cortex maintains maximum flexibility by packaging all user/assistant messages along with the system prompt into a custom structured output api call to the LLM provider. This avoids lock-in to conventions of agentic libraries and enables the modular and innovative composable tool calling design described below. 

---

## The Function System (Composable Tool Calls)

Functions in Cortex aren't just callables—they receive a rich context of utilities that enable powerful patterns like composable calling, recursive invocation, and human-in-the-loop interaction.

```typescript
type Function = {
  name: string;
  description: string;
  parameters: FunctionParameters;
  fn: (ops: { params: any; util: AuxiliaryContext }) => Promise<any>;
}
```

Every function receives an `util` object with these capabilities:

```typescript
fn: async (ops) => {
  const {
    get_embedding,        // Compute embeddings
    set_var, get_var,     // CortexRAM access
    handle_function_call, // Recursive function invocation
    get_user_data,        // Human-in-the-loop input
    run_structured_completion,  // Ad-hoc LLM calls with custom schemas
    event, log, feedback  // UI synchronization
  } = ops.util;

  // Example: compute and store an embedding
  const embedding = await get_embedding(ops.params.text);
  const id = await set_var(embedding);
  return `@${id}`;
}
```

This design means functions can orchestrate other functions, request user input mid-execution, or spawn custom LLM completions—all without leaving the function context.

---

## Call Chains and Composability

The LLM doesn't just call one function at a time. It outputs a **call chain**—a sequence of function calls with a special reference syntax that makes composition natural.

```typescript
type CortexOutput = {
  thoughts: string;
  calls: FunctionCall[];
  return_indeces: number[];
}
```

Here's what the LLM might output:

```typescript
{
  thoughts: "I need to embed the text, then store it in the database",
  calls: [
    { name: "compute_embedding", parameters: { text: "hello world" } },
    { name: "store_in_database", parameters: { embedding: "$0" } }
  ],
  return_indeces: [1]
}
```

### The Three Reference Syntaxes

Cortex uses three reference patterns that make call chains composable:

| Syntax | Meaning | Example |
|--------|---------|---------|
| `$N` | Result of call N in current chain | `$0` = first call's result |
| `@id` | Value stored in CortexRAM | `@dc5a7a9940da` |
| `&param` | Template parameter placeholder | `&text` in templates |

The `$N` syntax is powerful because it lets the LLM chain operations without knowing the intermediate values at generation time:

```typescript
{
  calls: [
    { name: "fetch_user", parameters: { id: "123" } },
    { name: "get_preferences", parameters: { user: "$0" } },
    { name: "generate_recommendations", parameters: { prefs: "$1" } }
  ],
  return_indeces: [2]  // Only return the recommendations
}
```

---

## CortexRAM: Cross-Function State

CortexRAM is an in-memory key-value store that persists across function calls within a session. It's essential for storing computed embeddings, large objects, or any intermediate state.

```typescript
class Cortex {
  CortexRAM: { [k: string]: any } = {};

  async set_var(value: any): Promise<string> {
    const id = await get_variable_hash_id(value);
    this.CortexRAM[id] = value;
    return id;  // e.g., "dc5a7a9940da"
  }

  get_var(id: string): any {
    return this.CortexRAM[id];
  }
}
```

When a function returns `@dc5a7a9940da`, the agent can reference that value in subsequent calls:

```typescript
{
  calls: [
    { name: "compute_embedding", parameters: { text: "AI research" } },
    // Returns "@dc5a7a9940da"
    { name: "vector_search", parameters: { embedding: "@dc5a7a9940da" } }
  ]
}
```

The `@id` syntax is automatically resolved before function execution.

---

## Call Chain Templates

Templates are reusable call chain patterns stored in the database. They're like macros—define once, invoke with parameters.

```typescript
{
  name: "embed_and_categorize",
  description: "Computes embedding for text and stores with category",
  params_schema: { text: "string", category: "string" },
  calls: [
    { name: "compute_embedding", parameters: { text: "&text" } },
    {
      name: "database_query",
      parameters: {
        query: "INSERT INTO logs { text: '&text', category: '&category', embedding: $0 }"
      }
    }
  ],
  return_indices: [1]
}
```

The `&placeholder` syntax is resolved when the template executes:

```typescript
// Invoking the template
run_call_chain_template({
  name: "embed_and_categorize",
  args: { text: "Machine learning basics", category: "education" }
})
```

Templates are stored with their own embeddings, enabling **semantic discovery**:

```typescript
// Find templates by description similarity
const embedding = await get_embedding("store text with vector");
const templates = await vector_search("cortex_call_chain_templates", embedding);
```

A huge advantage of call chain templates is that the agent can create and store templates for re-use later, which allows the agent to augment its own abilities over time using composable tools.



---

## PromptManager: Dynamic Prompt Composition

Instead of hardcoding system prompts as strings, Cortex uses a **recipe-based** composition system. The PromptManager stores sections and arguments separately, enabling runtime modification.

```typescript
class PromptManager {
  private sections: SectionName[];
  private args: SectionArgs;

  build(): string {
    return this.sections
      .map(name => this.renderSection(name, this.args[name]))
      .join('\n\n');
  }

  buildWith(overrides: SectionOverrides): string {
    // Generate variant with modifications
    // - null = exclude section
    // - array = replace section args
  }
}
```

Available sections include:
- `intro` — Agent introduction and capabilities
- `cortexRAM` — RAM usage documentation
- `callChains` — Call chain syntax explanation
- `functions` — Available function definitions
- `outputFormat` — CortexOutput schema
- `responseGuidance` — Custom behavioral guidance

This enables dynamically swapping the desired structured output format at runtime: 

```typescript
async rerun_llm_with_output_format<T>(options: {
  schema: T;
  sectionOverrides?: SectionOverrides;
}): Promise<z.infer<T>> {
  // Rebuild prompt with custom schema, excluding functions section
  const system_content = this.promptManager.buildWith({
    ...options.sectionOverrides,
    functions: null,
    outputFormat: [options.schema]
  });

  return this.run_structured_completion({ schema, messages });
}
```

---

## Knowledge Graph and Vector Backend

Cortex uses SurrealDB with **first-class embeddings**—vectors are stored alongside entities as native fields with HNSW indexes for sublinear search.

### Schema Design

```typescript
// Entity with embedding
type Entity = {
  id: string;              // Normalized: "albert_einstein"
  embedding: number[];     // 1536-dimensional vector
  updateId: string;        // Provenance tracking
}

// Relation with embedding
type Relation = {
  id: string;              // "einstein_developed_relativity"
  name: string;            // "developed"
  source_id: string;
  target_id: string;
  embedding: number[];
}
```

### HNSW Indexes

```sql
DEFINE INDEX entity_embedding_idx ON Entity
  FIELDS embedding
  HNSW DIMENSION 1536 DIST COSINE;

DEFINE INDEX relation_embedding_idx ON RelationMetadata
  FIELDS embedding
  HNSW DIMENSION 1536 DIST COSINE;
```

### Vector Search

```sql
SELECT id, vector::distance::knn() AS distance
FROM Entity
WHERE embedding <|$limit, $effort|> $query_embedding
ORDER BY distance ASC
```

### Knowledge Extraction Pipeline

The knowledge graph is populated via LLM-powered extraction:

```typescript
async add_knowledge(text: string): Promise<GraphUpdate> {
  // 1. Extract entities via structured completion
  const entities = await this.extract_entities(text);

  // 2. Extract relations between entities
  const relations = await this.extract_relations(text, entities);

  // 3. Compute embeddings for all
  const entityEmbeddings = await get_embeddings_batch(
    entities.map(e => e.name)
  );

  // 4. Store with update tracking
  const entityUpdate = await this.add_entities(entities);
  const relationUpdate = await this.add_relations(relations);

  // 5. Emit event for UI
  this.emit('knowledge_added', { entityUpdate, relationUpdate });

  return { entityUpdate, relationUpdate, text, embedding };
}
```

### Graph Traversal

```sql
-- Get entity with all connections
SELECT
  id,
  ->?.{id, in, out} AS outgoing,
  <-?.{id, in, out} AS incoming
FROM Entity:$id

-- N-hop neighborhood
SELECT * FROM $entity.{1..$depth}(<-?<-?, ->?->?)
```

---

## Model Provider Abstraction

Cortex supports OpenAI, Anthropic (Claude), and Google Gemini through a unified interface. Provider detection is automatic based on model name:

```typescript
type Provider = 'openai' | 'anthropic' | 'gemini';

function getProviderFromModel(model: string): Provider {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  return 'openai';
}
```

All providers receive the same request format:

```typescript
interface StructuredRequest {
  model: string;
  input: Message[];
  schema: JSONSchema;
  schema_name: string;
}
```

And return normalized responses:

```typescript
interface StructuredResponse {
  output_text: string;  // JSON string matching schema
}
```

Each provider has its own adapter handling API differences:

```typescript
// OpenAI - New Responses API
const response = await client.responses.create({
  model,
  input,
  text: { format: { type: "json_schema", schema, strict: true } }
});

// Claude - Structured outputs beta
const response = await client.beta.messages.create({
  model,
  betas: ["structured-outputs-2025-11-13"],
  output_format: { type: "json_schema", schema: transformedSchema }
});

// Gemini - OpenAI SDK compatibility mode
const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai"
});
```

Switching providers is as simple as changing the model name:

```typescript
// OpenAI
const agent = new Cortex({ model: "gpt-4o", functions });

// Claude
const agent = new Cortex({ model: "claude-3.5-sonnet", functions });

// Gemini
const agent = new Cortex({ model: "gemini-2.0-flash", functions });
```

---

## Event-Driven Architecture

Cortex extends `EventEmitter`, enabling reactive UIs and decoupled logging:

```typescript
class Cortex extends EventEmitter {
  async handle_function_call(call: FunctionCall) {
    this.emit('function_start', { name: call.name, parameters: call.parameters });

    try {
      const result = await this.executeFunction(call);
      this.emit('function_complete', { name: call.name, result });
      return result;
    } catch (error) {
      this.emit('function_error', { name: call.name, error });
      throw error;
    }
  }
}
```

The UI subscribes to events for real-time updates:

```typescript
// React component
useEffect(() => {
  agent.on('function_start', ({ name }) => {
    setStatus(`Running ${name}...`);
  });

  agent.on('function_complete', ({ name, result }) => {
    setStatus(`Completed ${name}`);
    addToLog({ name, result });
  });

  agent.on('knowledge_added', ({ entityUpdate }) => {
    refreshKnowledgeGraph();
  });
}, [agent]);
```

---

## Channel System: Human-in-the-Loop

The Channel class is an async queue/promise bridge that enables functions to pause and request user input:

```typescript
class Channel {
  private queuedValues: any[] = [];
  private queuedPromises: ((value: any) => void)[] = [];

  async read(): Promise<any> {
    if (this.queuedValues.length > 0) {
      return this.queuedValues.shift();
    }
    return new Promise(resolve => {
      this.queuedPromises.push(resolve);
    });
  }

  write(data: any): void {
    if (this.queuedPromises.length > 0) {
      this.queuedPromises.shift()!(data);
    } else {
      this.queuedValues.push(data);
    }
  }
}
```

Functions can request user input mid-execution:

```typescript
{
  name: "confirm_action",
  fn: async (ops) => {
    const { get_user_data, user_output } = ops.util;

    user_output("Should I proceed with this action? (yes/no)");
    const response = await get_user_data();  // Blocks until user responds

    if (response.text === "yes") {
      return await performAction();
    }
    return "Action cancelled by user";
  }
}
```

This enables sophisticated workflows where the agent can pause, gather additional context, and continue—without losing state. All within a function/tool call and before returning to invoke the llm. 

---

## Conclusion

Cortex represents a different philosophy for building AI agents:

1. **Functions/Tools are supercharged** — They receive rich context enabling recursion, embedding computation, and human-in-the-loop patterns, among much more.

2. **Composability is built-in** — The `$`, `@`, and `&` reference syntax makes call chaining natural without explicit orchestration.

3. **Embeddings are primitive** — Vector search isn't an add-on; it's woven into the knowledge graph, templates, and entity storage.

4. **Providers are interchangeable** — Swap between OpenAI, Claude, and Gemini by changing a model name.

5. **Events enable reactivity** — The UI stays synchronized without polling or callbacks.

The result is an architecture where complex agent behaviors emerge from simple, composable primitives—rather than being hardcoded into framework internals.

---

*Cortex is part of the [Tidyscripts](https://tidyscripts.com) project. The source code is available on GitHub.*
