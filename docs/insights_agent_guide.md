# InsightsClient Agent Guide

**Last Updated:** January 20, 2026
**Version:** 1.0.0
**Target Audience:** AI Agents (Claude) integrating InsightsClient into applications

---

## Table of Contents

1. [Quick Reference](#1-quick-reference)
2. [Architecture Overview](#2-architecture-overview)
3. [Quick Start Guide](#3-quick-start-guide)
4. [Core Concepts](#4-core-concepts)
5. [API Reference](#5-api-reference)
6. [Configuration Guide](#6-configuration-guide)
7. [Event Types & Payload Design](#7-event-types--payload-design)
8. [Event Chains & Traces](#8-event-chains--traces)
9. [Database Integration](#9-database-integration)
10. [API Endpoints](#10-api-endpoints)
11. [Troubleshooting](#11-troubleshooting)
12. [Performance & Best Practices](#12-performance--best-practices)
13. [Integration Examples](#13-integration-examples)
14. [Testing with Meditation App](#14-testing-with-meditation-app)

---

## 1. Quick Reference

### What is InsightsClient?

**InsightsClient** is a unified event tracking system for capturing application events (user interactions, LLM invocations, code executions, errors) with OpenTelemetry-compatible structure, automatic batching, and event chain support.

### Key Concepts

- **Events:** Basic tracking unit (OTel-compatible spans)
- **Event Chains:** Parent-child relationships via `trace_id` (link related events)
- **Batching:** Automatic buffering and batch sending (configurable size/interval)
- **Traces:** Group entire workflows using `trace_id` (OTel trace concept)
- **Silent Failure:** Never throws errors, always returns valid IDs

### Critical File Paths

```
/packages/ts_common/src/apis/insights.ts          # Implementation
/packages/ts_common/src/types/insights.ts         # Type definitions
/docs/insights_schema.surql                       # Database schema
/apps/ts_next_app/app/laboratory/meditation/      # Reference implementation
/meta/plans/meditation.md                         # Detailed implementation plan
```

### Common Usage Pattern

```typescript
// 1. Import
import * as insights from 'tidyscripts_web/common/insights';

// 2. Initialize
const client = insights.createClient({
  app_name: 'my_app',
  app_version: '1.0.0',
  user_id: 'user_123',
  batch_size: 50,
  batch_interval_ms: 5000,
});

// 3. Track events
const eventId = await client.addEvent('user_action', {
  action: 'button_click',
  button_id: 'submit',
});

// 4. Track event chains
const rootId = await client.startChain('user_workflow', { workflow: 'create_note' });
await client.addInChain('llm_invocation', { model: 'gpt-4', prompt: 'Generate note' });
await client.addInChain('execution', { type: 'save_note', status: 'success' });
client.endChain();

// 5. Cleanup (on app unmount/shutdown)
await client.shutdown();
```

---

## 2. Architecture Overview

### High-Level Flow

```
┌─────────────┐
│ Application │
└──────┬──────┘
       │ addEvent(), addInChain(), etc.
       ↓
┌─────────────────┐
│ InsightsClient  │
│  - Event Queue  │
│  - Chain Stack  │
│  - Auto Batching│
└──────┬──────────┘
       │ Automatic flush (batch_size or batch_interval_ms)
       ↓
┌─────────────────┐
│ POST /api/      │
│ insights/batch  │
└──────┬──────────┘
       │ Store batch
       ↓
┌─────────────────┐
│   SurrealDB     │
│ insights_events │
│    table        │
└─────────────────┘
       ↑
       │ Query events
┌──────┴──────────┐
│ POST /api/      │
│ insights/query  │
└─────────────────┘
```

### Component Responsibilities

**InsightsClient (Frontend/Client-side):**
- Event creation with automatic ID generation
- Event batching (size + time-based)
- Event chain management (trace_id linking)
- Browser metadata capture (user agent, viewport, Firebase auth)
- Silent failure handling (never breaks the app)

**API Endpoint (`/api/insights/batch`):**
- Receives event batches
- Validates events
- Stores to SurrealDB
- Returns success/error status

**SurrealDB (`insights_events` table):**
- Persistent storage for all events
- Flexible schema (FLEXIBLE payload/client_info fields)
- Comprehensive indexing for fast queries
- OTel-compatible structure

**Query Endpoint (`/api/insights/query`):**
- Retrieve events by filters (session, trace, type, etc.)
- Support for analytics and debugging

---

## 3. Quick Start Guide

### Step 1: Import InsightsClient

```typescript
// For Next.js apps (client components)
'use client';
import { common } from 'tidyscripts_web';
const { insights } = common;

// Or direct import
import * as insights from 'tidyscripts_web/common/insights';
```

### Step 2: Initialize Client

```typescript
// Basic initialization
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: getUserId(), // From your auth system
});

// With custom configuration
const client = insights.createClient({
  app_name: 'rai',
  app_version: '2.1.0',
  user_id: 'user_abc123',
  session_id: insights.generateSessionId(), // Optional: auto-generated if omitted
  batch_size: 100,                          // Optional: default 50
  batch_interval_ms: 3000,                  // Optional: default 5000
  endpoint: '/api/insights/batch',          // Optional: default value
  enabled: true,                            // Optional: default true
});
```

### Step 3: Track Events

```typescript
// Simple event
await client.addEvent('page_view', {
  page: '/dashboard',
  referrer: document.referrer,
});

// User interaction
await client.addUserInput({
  input_mode: 'voice',
  input_length: 250,
  transcription_confidence: 0.95,
});

// LLM invocation
await client.addLLMInvocation({
  model: 'gpt-4',
  provider: 'openai',
  prompt_tokens: 1200,
  completion_tokens: 800,
  latency_ms: 2400,
  status: 'success',
});

// Code execution
await client.addExecution({
  execution_type: 'code_sandbox',
  status: 'success',
  duration_ms: 1500,
  function_calls: 10,
  variables_assigned: 5,
});
```

### Step 4: Track Event Chains (Optional)

```typescript
// Start a workflow chain
const rootId = await client.startChain('note_generation', {
  note_type: 'research',
});

// Add child events (automatically linked)
await client.addInChain('user_input', {
  input_mode: 'text',
  input_length: 100,
});

await client.addInChain('llm_invocation', {
  model: 'gpt-4',
  provider: 'openai',
  prompt_tokens: 500,
  completion_tokens: 300,
  latency_ms: 1800,
  status: 'success',
});

await client.addInChain('execution', {
  execution_type: 'save_note',
  status: 'success',
  duration_ms: 200,
});

// End the chain
client.endChain();
```

### Step 5: Cleanup

```typescript
// On component unmount (React)
useEffect(() => {
  return () => {
    client.shutdown();
  };
}, []);

// Or manually
await client.shutdown(); // Flushes remaining events and stops timer
```

---

## 4. Core Concepts

### Events

**Events** are the basic unit of tracking. Each event represents a discrete action or occurrence in your application.

**Structure:**
- Unique `event_id` (generated automatically)
- `event_type` (flexible string like "user_input", "llm_invocation", etc.)
- `payload` (flexible object with app-specific data)
- Metadata (timestamp, tags, duration, etc.)
- Client info (browser metadata, Firebase auth)

**OTel Compatibility:**
- Events map to **Spans** in OpenTelemetry
- `event_id` = Span ID
- `event_type` = Span name
- `payload` = Span attributes
- `trace_id` = Trace ID
- `parent_event_id` = Parent Span ID

### Event Chains

**Event chains** link related events together to represent multi-step workflows or nested operations.

**How it works:**
- Use `startChain()` to begin a chain (creates root event with new `trace_id`)
- All subsequent `addInChain()` calls automatically link to the chain
- Events in a chain share the same `trace_id`
- Each event has a `parent_event_id` pointing to the previous event in the chain
- Use `endChain()` to close the chain

**When to use chains:**
- Multi-step user workflows (e.g., "create note" → "invoke LLM" → "save result")
- LLM invocations with follow-up actions
- Nested function calls
- Error propagation tracking

**Standalone events (no chain):**
- If you call `addEvent()` without an active chain, the event is standalone
- Standalone events don't get a `trace_id` (OTel-compatible behavior)
- Standalone events don't have a `parent_event_id`

### Batching

**Automatic batching** improves performance by sending multiple events in a single HTTP request.

**How it works:**
- Events are queued in memory
- Batch is flushed when:
  - Batch size reaches `batch_size` (default: 50 events)
  - OR `batch_interval_ms` elapses (default: 5000ms)
  - OR `flushBatch()` is called manually
  - OR `shutdown()` is called

**Benefits:**
- Reduced network overhead (fewer HTTP requests)
- Better performance (non-blocking)
- Lower server load

**Configuration:**
- Small apps: `batch_size: 20`, `batch_interval_ms: 10000`
- Medium apps: `batch_size: 50`, `batch_interval_ms: 5000` (default)
- Large apps: `batch_size: 100`, `batch_interval_ms: 2000`

### Silent Failure

**InsightsClient never throws errors** to prevent breaking your application.

**Behavior:**
- If event creation fails → returns a dummy `event_id`
- If batch flush fails → logs warning, retries later
- If API is unreachable → events are queued and retried
- If disabled (`enabled: false`) → returns dummy IDs immediately

**Observability:**
- All errors/warnings logged to browser console with `[insights]` prefix
- Check console for debugging

### Client Info (Automatic Metadata)

**Client info** is automatically captured for browser-based events.

**Captured data:**
- `user_agent` - Browser user agent string
- `viewport_size` - Window dimensions (e.g., "1920x1080")
- `firebase_uid` - Firebase user ID (if logged in)
- `firebase_email` - Firebase email (if logged in)
- `firebase_display_name` - Firebase display name (if logged in)

**When captured:**
- Only in browser environment (not server-side)
- Attached to every event automatically
- Stored in the FLEXIBLE `client_info` field

---

## 5. API Reference

### Initialization

#### `createClient(config: InsightsConfig): InsightsClient`

Creates a new InsightsClient instance.

**Parameters:**
- `config` - Configuration object (see [Configuration Guide](#6-configuration-guide))

**Returns:** InsightsClient instance

**Example:**
```typescript
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: 'user_123',
});
```

#### `generateSessionId(): string`

Generates a unique session ID with prefix `ses_`.

**Returns:** Session ID (e.g., "ses_lxy1z2abc")

**Example:**
```typescript
const sessionId = insights.generateSessionId();
```

#### `generateEventId(): string`

Generates a unique event ID with prefix `evt_`.

**Returns:** Event ID (e.g., "evt_lxy1z2abc")

#### `generateTraceId(): string`

Generates a unique trace ID with prefix `trc_`.

**Returns:** Trace ID (e.g., "trc_lxy1z2abc")

---

### Event Creation

#### `addEvent(event_type: string, payload: Record<string, any>, options?: AddEventOptions): Promise<string>`

Add a generic event.

**Parameters:**
- `event_type` - Event type (flexible string)
- `payload` - Event data (flexible object)
- `options` - Optional configuration
  - `tags?: string[]` - Tags like ["error", "slow"]
  - `parent_event_id?: string` - Explicit parent event
  - `trace_id?: string` - Explicit trace ID
  - `duration_ms?: number` - Event duration

**Returns:** Promise resolving to event ID

**Example:**
```typescript
const eventId = await client.addEvent('user_action', {
  action: 'button_click',
  button_id: 'submit',
  page: '/dashboard',
}, {
  tags: ['ui_interaction'],
});
```

#### `addUserInput(data: UserInputData): Promise<string>`

Convenience method for user input events.

**Parameters:**
- `data.input_mode` - Input mode (e.g., "voice", "text", "chat")
- `data.input_length` - Length of input
- `data.transcription_confidence?` - Confidence score (0-1)
- `data.context?` - Additional context

**Returns:** Promise resolving to event ID

**Example:**
```typescript
await client.addUserInput({
  input_mode: 'voice',
  input_length: 250,
  transcription_confidence: 0.95,
  context: { language: 'en-US' },
});
```

#### `addLLMInvocation(data: LLMInvocationData): Promise<string>`

Convenience method for LLM invocation events.

**Parameters:**
- `data.model` - Model name (e.g., "gpt-4", "claude-3-opus")
- `data.provider` - Provider (e.g., "openai", "anthropic")
- `data.mode?` - Invocation mode (e.g., "structured", "unstructured")
- `data.prompt_tokens` - Input token count
- `data.completion_tokens` - Output token count
- `data.latency_ms` - Request latency
- `data.status` - Status (e.g., "success", "error", "timeout")
- `data.error?` - Error message if failed
- `data.context?` - Additional context

**Returns:** Promise resolving to event ID

**Automatic Tags:**
- Adds `["error"]` if `status === "error"`
- Adds `["slow"]` if `latency_ms > 5000`

**Example:**
```typescript
await client.addLLMInvocation({
  model: 'gpt-4',
  provider: 'openai',
  mode: 'structured',
  prompt_tokens: 1200,
  completion_tokens: 800,
  latency_ms: 2400,
  status: 'success',
  context: { temperature: 0.7 },
});
```

#### `addExecution(data: ExecutionData): Promise<string>`

Convenience method for code execution events.

**Parameters:**
- `data.execution_type` - Type (e.g., "code_sandbox", "note_generation")
- `data.status` - Status (e.g., "success", "error")
- `data.duration_ms` - Execution duration
- `data.error?` - Error message if failed
- `data.function_calls?` - Number of functions called
- `data.variables_assigned?` - Number of variables assigned
- `data.logs_count?` - Number of logs generated
- `data.context?` - Additional context

**Returns:** Promise resolving to event ID

**Automatic Tags:**
- Adds `["error"]` if `status === "error"`
- Adds `["slow"]` if `duration_ms > 10000`

**Example:**
```typescript
await client.addExecution({
  execution_type: 'code_sandbox',
  status: 'success',
  duration_ms: 1500,
  function_calls: 10,
  variables_assigned: 5,
  logs_count: 20,
});
```

---

### Event Chains

#### `startChain(event_type: string, payload: Record<string, any>): Promise<string>`

Start an event chain (creates root event with new trace_id).

**Parameters:**
- `event_type` - Event type for root event
- `payload` - Event data for root event

**Returns:** Promise resolving to root event ID

**Example:**
```typescript
const rootId = await client.startChain('user_workflow', {
  workflow: 'note_generation',
  user_id: 'user_123',
});
```

#### `addInChain(event_type: string, payload: Record<string, any>, options?: AddEventOptions): Promise<string>`

Add an event to the current chain (automatically linked).

**Parameters:**
- Same as `addEvent()`

**Returns:** Promise resolving to event ID

**Behavior:**
- Automatically uses the current chain's `trace_id`
- Automatically sets `parent_event_id` to the previous event in the chain

**Example:**
```typescript
await client.addInChain('llm_invocation', {
  model: 'gpt-4',
  prompt: 'Generate note',
});
```

#### `endChain(): void`

End the current event chain.

**Returns:** void

**Example:**
```typescript
client.endChain();
```

---

### State Management

#### `flushBatch(): Promise<void>`

Manually flush the current batch to the API.

**Returns:** Promise that resolves when flush completes

**Example:**
```typescript
await client.flushBatch();
```

#### `shutdown(): Promise<void>`

Stop the batch timer, flush remaining events, and cleanup.

**Returns:** Promise that resolves when shutdown completes

**Example:**
```typescript
await client.shutdown();
```

#### `getSessionId(): string`

Get the current session ID.

**Returns:** Session ID

**Example:**
```typescript
const sessionId = client.getSessionId();
```

#### `getChainDepth(): number`

Get the current chain depth (number of nested chains).

**Returns:** Chain depth (0 if no active chains)

**Example:**
```typescript
const depth = client.getChainDepth();
console.log(`Current chain depth: ${depth}`);
```

#### `setEnabled(enabled: boolean): void`

Enable or disable event tracking.

**Parameters:**
- `enabled` - true to enable, false to disable

**Behavior:**
- When disabled, all event methods return dummy IDs immediately
- Batch timer is stopped when disabled

**Example:**
```typescript
client.setEnabled(false); // Disable tracking
client.setEnabled(true);  // Enable tracking
```

---

### Singleton Pattern (Optional)

#### `setDefaultClient(client: InsightsClient): void`

Set the global default client.

**Example:**
```typescript
const client = insights.createClient({ ... });
insights.setDefaultClient(client);
```

#### `getDefaultClient(): InsightsClient`

Get the global default client.

**Throws:** Error if default client is not set

**Example:**
```typescript
const client = insights.getDefaultClient();
```

---

## 6. Configuration Guide

### InsightsConfig Interface

```typescript
interface InsightsConfig {
  app_name: string;              // Required
  app_version: string;           // Required
  user_id: string;               // Required
  session_id?: string;           // Optional
  endpoint?: string;             // Optional
  batch_size?: number;           // Optional
  batch_interval_ms?: number;    // Optional
  enabled?: boolean;             // Optional
}
```

### Configuration Parameters

#### `app_name` (Required)

**Type:** `string`
**Description:** Your application identifier.

**Examples:**
- `"cortex"` - Cortex app
- `"rai"` - RAI app
- `"meditation"` - Meditation test app

**Best Practices:**
- Use lowercase
- Use underscores for multi-word names
- Keep it short and descriptive

---

#### `app_version` (Required)

**Type:** `string`
**Description:** Semantic version of your application.

**Examples:**
- `"1.0.0"` - Initial release
- `"2.1.3"` - Semantic versioning

**Best Practices:**
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update when deploying new versions
- Enables version-based filtering in queries

---

#### `user_id` (Required)

**Type:** `string`
**Description:** Current user identifier.

**Examples:**
- `"user_abc123"` - Authenticated user
- `"anonymous_xyz"` - Anonymous user
- Firebase UID, Auth0 ID, etc.

**Best Practices:**
- Use stable user IDs (don't change on login/logout)
- For anonymous users, generate and persist a unique ID
- Enables user-based analytics and filtering

---

#### `session_id` (Optional)

**Type:** `string`
**Default:** Auto-generated using `generateSessionId()`

**Description:** Session identifier (groups events from a single session).

**When to provide:**
- If you have an existing session management system
- If you want to persist sessions across page reloads

**Example:**
```typescript
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: 'user_123',
  session_id: insights.generateSessionId(), // Explicit generation
});
```

---

#### `endpoint` (Optional)

**Type:** `string`
**Default:** `"/api/insights/batch"`

**Description:** API endpoint for batch event submission.

**When to override:**
- Custom API routing
- Different environment endpoints (dev/staging/prod)

**Example:**
```typescript
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: 'user_123',
  endpoint: '/custom/insights/endpoint',
});
```

---

#### `batch_size` (Optional)

**Type:** `number`
**Default:** `50`
**Range:** `10-200` (recommended)

**Description:** Maximum number of events per batch before automatic flush.

**When to adjust:**
- **Low traffic apps** (< 100 events/min): Set to `20-30`
- **Medium traffic apps** (100-1000 events/min): Keep default `50`
- **High traffic apps** (> 1000 events/min): Set to `100-200`

**Trade-offs:**
- **Smaller batches:** More frequent network requests, lower latency
- **Larger batches:** Fewer network requests, higher latency

**Example:**
```typescript
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: 'user_123',
  batch_size: 100, // High-traffic app
});
```

---

#### `batch_interval_ms` (Optional)

**Type:** `number`
**Default:** `5000` (5 seconds)
**Range:** `1000-30000` (recommended)

**Description:** Time interval (in milliseconds) before automatic batch flush.

**When to adjust:**
- **Real-time requirements:** Set to `1000-2000` (1-2 seconds)
- **Low traffic apps:** Set to `10000-30000` (10-30 seconds)
- **High traffic apps:** Set to `2000-5000` (2-5 seconds)

**Trade-offs:**
- **Shorter intervals:** More real-time data, more network requests
- **Longer intervals:** Less real-time data, fewer network requests

**Example:**
```typescript
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: 'user_123',
  batch_interval_ms: 2000, // 2-second flush interval
});
```

---

#### `enabled` (Optional)

**Type:** `boolean`
**Default:** `true`

**Description:** Enable or disable event tracking.

**When to disable:**
- Development mode (avoid polluting production data)
- User privacy settings
- Performance testing (isolate tracking overhead)

**Example:**
```typescript
const client = insights.createClient({
  app_name: 'cortex',
  app_version: '1.0.0',
  user_id: 'user_123',
  enabled: process.env.NODE_ENV === 'production', // Only in production
});
```

---

### Configuration Examples

#### Minimal Configuration
```typescript
const client = insights.createClient({
  app_name: 'my_app',
  app_version: '1.0.0',
  user_id: 'user_123',
});
```

#### Development Configuration
```typescript
const client = insights.createClient({
  app_name: 'my_app',
  app_version: '1.0.0-dev',
  user_id: 'dev_user',
  batch_size: 10,
  batch_interval_ms: 2000,
  enabled: false, // Disable in dev
});
```

#### Production Configuration
```typescript
const client = insights.createClient({
  app_name: 'my_app',
  app_version: '2.1.0',
  user_id: getUserId(),
  batch_size: 100,
  batch_interval_ms: 3000,
  enabled: true,
});
```

---

## 7. Event Types & Payload Design

### Common Event Types

InsightsClient uses **flexible string event types** (not enums) for maximum flexibility.

#### Predefined Types (CommonEventTypes)

```typescript
export const CommonEventTypes = {
  // User interactions
  USER_INPUT: 'user_input',
  USER_INTERACTION: 'user_interaction',
  USER_OUTPUT: 'user_output',

  // LLM operations
  LLM_INVOCATION: 'llm_invocation',

  // Executions
  EXECUTION: 'execution',
  CODE_EXECUTION: 'code_execution',
  EXECUTION_COMPLETE: 'execution_complete',

  // RAI specific
  NOTE_GENERATION: 'note_generation',
  TEST_RUN: 'test_run',
  MODEL_TEST: 'model_test',
  MODEL_TEST_COMPLETE: 'model_test_complete',
};
```

#### Custom Event Types

You can use **any string** as an event type:

```typescript
await client.addEvent('custom_workflow', { ... });
await client.addEvent('payment_completed', { ... });
await client.addEvent('file_uploaded', { ... });
```

---

### Payload Design Guidelines

The `payload` field is a **flexible object** that can contain any nested structure.

#### Best Practices

1. **Keep payloads flat when possible**
   ```typescript
   // Good (flat)
   { action: 'click', button_id: 'submit', page: '/dashboard' }

   // Acceptable (nested, but not deep)
   { action: 'click', button: { id: 'submit', label: 'Submit' }, page: '/dashboard' }
   ```

2. **Use descriptive keys**
   ```typescript
   // Good
   { model: 'gpt-4', prompt_tokens: 1200, latency_ms: 2400 }

   // Bad
   { m: 'gpt-4', pt: 1200, lat: 2400 }
   ```

3. **Include context for debugging**
   ```typescript
   {
     action: 'api_call',
     endpoint: '/api/users',
     method: 'POST',
     status_code: 200,
     duration_ms: 1500,
   }
   ```

4. **Leverage FLEXIBLE schema** (nested objects allowed)
   ```typescript
   {
     workflow: 'note_generation',
     input: {
       text: 'User input here',
       length: 250,
       language: 'en-US',
     },
     output: {
       note_id: 'note_123',
       word_count: 500,
     },
   }
   ```

5. **Avoid extremely large payloads** (keep under 10KB)
   - Don't include full documents/responses
   - Use IDs or references instead
   - Summarize large data

6. **Avoid deeply nested objects** (2-3 levels max)
   - Makes querying harder
   - Reduces readability

---

### Event Type Examples by Application

#### Cortex Event Types

```typescript
// User message
await client.addEvent('user_message', {
  message_id: 'msg_123',
  message_length: 250,
  context_tokens: 1000,
});

// LLM response
await client.addLLMInvocation({
  model: 'gpt-4',
  provider: 'openai',
  prompt_tokens: 1200,
  completion_tokens: 800,
  latency_ms: 2400,
  status: 'success',
});

// Code execution
await client.addExecution({
  execution_type: 'code_sandbox',
  status: 'success',
  duration_ms: 1500,
  function_calls: 10,
});
```

#### RAI Event Types

```typescript
// Note generation workflow
const rootId = await client.startChain('note_generation', {
  note_type: 'research',
  source: 'user_input',
});

await client.addInChain('user_input', {
  input_mode: 'text',
  input_length: 100,
});

await client.addInChain('llm_invocation', {
  model: 'gpt-4',
  provider: 'openai',
  mode: 'structured',
  prompt_tokens: 500,
  completion_tokens: 300,
  latency_ms: 1800,
  status: 'success',
});

await client.addInChain('execution', {
  execution_type: 'save_note',
  status: 'success',
  duration_ms: 200,
});

client.endChain();
```

#### General Web App Event Types

```typescript
// Page view
await client.addEvent('page_view', {
  page: '/dashboard',
  referrer: document.referrer,
  viewport_size: `${window.innerWidth}x${window.innerHeight}`,
});

// Button click
await client.addEvent('button_click', {
  button_id: 'submit',
  button_label: 'Submit',
  page: '/dashboard',
});

// Form submission
await client.addEvent('form_submit', {
  form_id: 'login_form',
  fields: ['email', 'password'],
  validation_errors: 0,
});

// Error
await client.addEvent('error', {
  error_type: 'network_error',
  error_message: 'Failed to fetch',
  stack_trace: error.stack,
}, {
  tags: ['error', 'network'],
});
```

---

## 8. Event Chains & Traces

### Understanding Event Chains

**Event chains** link related events to represent workflows or nested operations.

### Chain Mechanics

1. **Root Event (start of chain)**
   - Created with `startChain()`
   - Gets a new `trace_id` (e.g., "trc_lxy1z2abc")
   - No `parent_event_id` (it's the root)

2. **Child Events**
   - Created with `addInChain()`
   - Share the same `trace_id` as the root
   - Each has a `parent_event_id` pointing to the previous event

3. **End Chain**
   - Called with `endChain()`
   - Stops automatic linking for subsequent events

### Visual Example

```
startChain('user_workflow')
  ↓
  evt_001 (root)
    trace_id: trc_abc
    parent_event_id: null
  ↓
addInChain('llm_invocation')
  ↓
  evt_002
    trace_id: trc_abc
    parent_event_id: evt_001
  ↓
addInChain('execution')
  ↓
  evt_003
    trace_id: trc_abc
    parent_event_id: evt_002
  ↓
endChain()
```

### When to Use Chains

#### Multi-Step User Workflows
```typescript
// User creates a note
const rootId = await client.startChain('create_note_workflow', {
  workflow_type: 'manual_creation',
});

await client.addInChain('user_input', {
  input_mode: 'text',
  input_length: 100,
});

await client.addInChain('llm_invocation', {
  model: 'gpt-4',
  prompt: 'Enhance note',
});

await client.addInChain('execution', {
  execution_type: 'save_note',
  status: 'success',
});

client.endChain();
```

#### LLM Invocations with Follow-up Actions
```typescript
const rootId = await client.startChain('llm_workflow', {
  purpose: 'generate_response',
});

await client.addInChain('llm_invocation', {
  model: 'gpt-4',
  prompt_tokens: 1200,
  completion_tokens: 800,
  latency_ms: 2400,
  status: 'success',
});

await client.addInChain('post_processing', {
  type: 'markdown_formatting',
  duration_ms: 50,
});

await client.addInChain('display', {
  type: 'render_response',
  duration_ms: 100,
});

client.endChain();
```

#### Nested Function Calls
```typescript
const rootId = await client.startChain('complex_computation', {
  function: 'processUserRequest',
});

await client.addInChain('execution', {
  execution_type: 'validate_input',
  status: 'success',
  duration_ms: 50,
});

await client.addInChain('execution', {
  execution_type: 'fetch_data',
  status: 'success',
  duration_ms: 500,
});

await client.addInChain('execution', {
  execution_type: 'transform_data',
  status: 'success',
  duration_ms: 200,
});

client.endChain();
```

#### Error Propagation Tracking
```typescript
const rootId = await client.startChain('risky_operation', {
  operation: 'api_call',
});

try {
  await client.addInChain('execution', {
    execution_type: 'api_call',
    status: 'success',
    duration_ms: 1000,
  });
} catch (error) {
  await client.addInChain('error', {
    error_type: 'api_error',
    error_message: error.message,
  }, {
    tags: ['error'],
  });
}

client.endChain();
```

---

### Standalone Events (No Chain)

**Standalone events** don't participate in chains:

```typescript
// These events are standalone (no trace_id, no parent_event_id)
await client.addEvent('page_view', { page: '/dashboard' });
await client.addEvent('button_click', { button_id: 'submit' });
await client.addEvent('error', { error_message: 'Network error' });
```

**When to use standalone events:**
- Simple, isolated actions (page views, clicks)
- Events that don't relate to workflows
- Performance tracking (individual metrics)

---

### Querying Event Chains

**Reconstruct a workflow by trace_id:**

```sql
SELECT * FROM insights_events
WHERE trace_id = 'trc_abc123'
ORDER BY timestamp ASC;
```

**Result:**
```
evt_001 → evt_002 → evt_003 → evt_004
```

**Get all chains for a session:**

```sql
SELECT trace_id, COUNT(*) as event_count
FROM insights_events
WHERE session_id = 'ses_xyz'
  AND trace_id IS NOT NULL
GROUP BY trace_id;
```

---

### Nested Chains (Advanced)

InsightsClient supports **nested chains** via the internal chain stack.

**Example:**
```typescript
// Outer chain
const outerRoot = await client.startChain('outer_workflow', {});

await client.addInChain('step_1', {});

// Inner chain (nested)
const innerRoot = await client.startChain('inner_workflow', {});

await client.addInChain('step_2', {});
await client.addInChain('step_3', {});

client.endChain(); // End inner chain

await client.addInChain('step_4', {}); // Back to outer chain

client.endChain(); // End outer chain
```

**Trace relationships:**
- Outer chain: `trace_id = trc_outer`
- Inner chain: `trace_id = trc_inner`, with `parent_event_id` linking to outer chain

---

## 9. Database Integration

### Schema Overview

**Table:** `insights_events`
**Namespace:** `production`
**Database:** `insights_events`
**Schema Mode:** `SCHEMAFULL` (with FLEXIBLE fields for payload/client_info)

### Key Fields

| Field            | Type           | Description                                    |
|------------------|----------------|------------------------------------------------|
| `event_id`       | `string`       | Primary key, unique event identifier           |
| `event_type`     | `string`       | Event type (flexible string)                   |
| `app_name`       | `string`       | Application name                               |
| `app_version`    | `string`       | Application version                            |
| `user_id`        | `string`       | User identifier                                |
| `session_id`     | `string`       | Session identifier                             |
| `timestamp`      | `datetime`     | Event timestamp                                |
| `trace_id`       | `option<string>` | Trace ID (links event chains)                 |
| `parent_event_id`| `option<string>` | Parent event ID (links to parent)             |
| `payload`        | `object` (FLEXIBLE) | App-specific data (nested objects allowed) |
| `tags`           | `option<array>` | Tags (e.g., ["error", "slow"])                |
| `duration_ms`    | `option<int>`  | Event duration                                 |
| `client_info`    | `option<object>` (FLEXIBLE) | Browser metadata + Firebase auth  |

### Flexible Fields

**`payload` (FLEXIBLE):**
- Can contain **any nested structure**
- No schema enforcement (add fields freely)
- Ideal for app-specific data

**`client_info` (FLEXIBLE):**
- Can contain **any nested structure**
- Automatically includes: `user_agent`, `viewport_size`, `firebase_uid`, `firebase_email`, `firebase_display_name`
- Can be extended with custom fields

### Indexes

The schema includes comprehensive indexes for common query patterns:

| Index Name         | Fields                       | Purpose                              |
|--------------------|------------------------------|--------------------------------------|
| `idx_app_user_time` | `app_name`, `user_id`, `timestamp` | Query events by app, user, and time |
| `idx_event_type`    | `event_type`, `app_name`     | Query events by type and app         |
| `idx_session`       | `session_id`, `timestamp`    | Query events by session (chronological) |
| `idx_trace`         | `trace_id`, `timestamp`      | Query event chains by trace_id       |
| `idx_tags`          | `tags`                       | Query events by tags                 |
| `idx_errors`        | `tags WHERE 'error' IN tags` | Quickly find errors                  |

### Common Queries

#### Get All Events for a Session

```sql
SELECT * FROM insights_events
WHERE session_id = 'ses_xyz'
ORDER BY timestamp DESC;
```

#### Get Event Chain (Trace)

```sql
SELECT * FROM insights_events
WHERE trace_id = 'trc_abc123'
ORDER BY timestamp ASC;
```

#### Get All LLM Invocations

```sql
SELECT * FROM insights_events
WHERE event_type = 'llm_invocation'
ORDER BY timestamp DESC
LIMIT 100;
```

#### Error Analysis by Event Type

```sql
SELECT event_type, COUNT(*) as error_count
FROM insights_events
WHERE 'error' IN tags
GROUP BY event_type
ORDER BY error_count DESC;
```

#### Slow Operations

```sql
SELECT event_type, app_name, duration_ms, payload
FROM insights_events
WHERE duration_ms > 5000
ORDER BY duration_ms DESC
LIMIT 20;
```

#### Cross-App Insights

```sql
SELECT
  app_name,
  event_type,
  COUNT(*) as count,
  math::mean(duration_ms) as avg_duration
FROM insights_events
WHERE timestamp > time::now() - 1d
GROUP BY app_name, event_type;
```

#### LLM Token Usage by Model

```sql
SELECT
  payload.model as model,
  SUM(payload.prompt_tokens) as total_prompt_tokens,
  SUM(payload.completion_tokens) as total_completion_tokens
FROM insights_events
WHERE event_type = 'llm_invocation'
  AND timestamp > time::now() - 1d
GROUP BY payload.model;
```

#### User Activity Summary

```sql
SELECT
  user_id,
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(DISTINCT event_type) as unique_event_types
FROM insights_events
WHERE timestamp > time::now() - 7d
GROUP BY user_id
ORDER BY total_events DESC
LIMIT 10;
```

---

### Schema File Location

**File:** `/docs/insights_schema.surql`

This file contains the complete schema definition with:
- Field definitions
- Index definitions
- Example queries
- Notes on OTel compatibility

---

## 10. API Endpoints

### POST /api/insights/batch

Store events in batch.

#### Request

**Method:** POST
**Content-Type:** application/json

**Body:**
```json
{
  "events": [
    {
      "event_id": "evt_lxy1z2abc",
      "event_type": "user_input",
      "app_name": "cortex",
      "app_version": "1.0.0",
      "user_id": "user_123",
      "session_id": "ses_xyz",
      "timestamp": 1706745600000,
      "payload": {
        "input_mode": "voice",
        "input_length": 250
      },
      "client_info": {
        "user_agent": "Mozilla/5.0...",
        "viewport_size": "1920x1080"
      }
    },
    ...
  ]
}
```

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "events_received": 10,
  "events_stored": 10,
  "errors": []
}
```

**Partial Success (200 OK):**
```json
{
  "success": true,
  "events_received": 10,
  "events_stored": 8,
  "errors": [
    "Event evt_001: Missing required field 'event_type'",
    "Event evt_002: Invalid timestamp"
  ]
}
```

**Error (500 Internal Server Error):**
```json
{
  "success": false,
  "events_received": 0,
  "events_stored": 0,
  "errors": ["Database connection failed"]
}
```

---

### POST /api/insights/query

Query stored events.

#### Request

**Method:** POST
**Content-Type:** application/json

**Body:**
```json
{
  "filters": {
    "event_type": "llm_invocation",
    "session_id": "ses_xyz",
    "app_name": "cortex"
  },
  "limit": 100,
  "order_by": "timestamp",
  "order_direction": "DESC"
}
```

**Supported Filters:**
- `event_type` (string)
- `session_id` (string)
- `trace_id` (string)
- `user_id` (string)
- `app_name` (string)
- `app_version` (string)
- `tags` (array of strings)
- `timestamp_from` (number, Unix timestamp)
- `timestamp_to` (number, Unix timestamp)

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "events": [
    {
      "event_id": "evt_lxy1z2abc",
      "event_type": "llm_invocation",
      "app_name": "cortex",
      "timestamp": 1706745600000,
      "payload": {
        "model": "gpt-4",
        "prompt_tokens": 1200,
        "completion_tokens": 800
      },
      ...
    },
    ...
  ],
  "count": 42
}
```

**Error (500 Internal Server Error):**
```json
{
  "success": false,
  "events": [],
  "count": 0,
  "error": "Database query failed"
}
```

---

## 11. Troubleshooting

### Common Issues

#### Issue 1: Events Not Appearing in Database

**Symptoms:**
- Events created successfully (client returns event IDs)
- Events not visible in database queries

**Possible Causes:**
1. **Batch hasn't flushed yet**
   - Wait for `batch_interval_ms` to elapse
   - Or call `client.flushBatch()` manually

2. **API endpoint unreachable**
   - Check browser console for `[insights]` logs
   - Check network tab for failed requests
   - Verify API endpoint is running

3. **SurrealDB connection issue**
   - Check server logs
   - Verify SurrealDB is running
   - Verify connection credentials

**Solutions:**
```typescript
// 1. Manual flush
await client.flushBatch();

// 2. Check console logs
// Look for: "[insights] Flushing N events to /api/insights/batch"
// Look for: "[insights] Batch sent successfully: M/N stored"

// 3. Reduce batch interval for testing
const client = insights.createClient({
  ...config,
  batch_interval_ms: 1000, // Flush every 1 second
});
```

---

#### Issue 2: Missing Firebase Auth Data

**Symptoms:**
- `client_info.firebase_uid`, `firebase_email`, etc. are null/undefined

**Possible Causes:**
1. **User not logged in**
   - Firebase auth not initialized
   - User hasn't logged in yet

2. **`window.getAuth` not available**
   - Firebase auth not properly exposed to window

**Solutions:**
```typescript
// 1. Check if user is logged in
const auth = window.getAuth?.();
console.log('Current user:', auth?.currentUser);

// 2. Ensure Firebase auth is exposed
// In your Firebase setup file:
if (typeof window !== 'undefined') {
  window.getAuth = () => getAuth();
}
```

---

#### Issue 3: Duplicate Events in Development

**Symptoms:**
- Events appear twice in logs/database
- Only happens in development mode

**Cause:**
- React Strict Mode causes double-rendering in development

**Solution:**
- **This is normal in development** (not an issue in production)
- To disable in development, remove `<React.StrictMode>` from `_app.tsx`

---

#### Issue 4: Slow Queries

**Symptoms:**
- Database queries take > 1 second
- High database CPU usage

**Possible Causes:**
1. **Not using indexed fields**
   - Queries without indexed fields cause full table scans

2. **Large result sets**
   - Querying without `LIMIT` returns all matching rows

3. **Complex filters**
   - Querying nested payload fields

**Solutions:**
```sql
-- 1. Use indexed fields
SELECT * FROM insights_events
WHERE event_type = 'llm_invocation'  -- Indexed
  AND session_id = 'ses_xyz'          -- Indexed
LIMIT 100;

-- 2. Add timestamp range
SELECT * FROM insights_events
WHERE event_type = 'llm_invocation'
  AND timestamp > time::now() - 1h
LIMIT 100;

-- 3. Avoid filtering on nested payload fields
-- Bad:
SELECT * FROM insights_events
WHERE payload.model = 'gpt-4';  -- Not indexed, slow

-- Good:
SELECT * FROM insights_events
WHERE event_type = 'llm_invocation';  -- Indexed, fast
-- Then filter in application code
```

---

#### Issue 5: Events Not Linked in Chain

**Symptoms:**
- Called `startChain()` and `addInChain()`
- Events don't have matching `trace_id`

**Possible Causes:**
1. **Forgot to await `startChain()`**
   - Chain not established before `addInChain()` calls

2. **Called `endChain()` too early**
   - Chain ended before all events added

**Solutions:**
```typescript
// 1. Always await startChain()
const rootId = await client.startChain('workflow', {});  // MUST await

// 2. Add all events before endChain()
await client.addInChain('step_1', {});
await client.addInChain('step_2', {});
await client.addInChain('step_3', {});
client.endChain();  // Now end the chain
```

---

### Debugging Tips

#### Enable Verbose Logging

```typescript
// Check browser console for [insights] logs
// All operations are logged automatically

// Example logs:
// [insights] InsightsClient initialized for cortex v1.0.0
// [insights] Session ID: ses_lxy1z2abc
// [insights] Batch size: 50, Interval: 5000ms
// [insights] Flushing 10 events to /api/insights/batch
// [insights] Batch sent successfully: 10/10 stored
```

#### Check Client State

```typescript
console.log('Session ID:', client.getSessionId());
console.log('Chain depth:', client.getChainDepth());
console.log('Batch size:', client.eventBatch.length);
```

#### Check Network Requests

1. Open browser DevTools
2. Go to Network tab
3. Filter by "insights"
4. Check POST requests to `/api/insights/batch`
5. Inspect request/response payloads

#### Manual Batch Flush

```typescript
// Force immediate flush for debugging
await client.flushBatch();
console.log('Batch flushed manually');
```

---

## 12. Performance & Best Practices

### Batch Configuration

**Small Apps (< 100 events/min):**
```typescript
const client = insights.createClient({
  ...config,
  batch_size: 20,
  batch_interval_ms: 10000, // 10 seconds
});
```

**Medium Apps (100-1000 events/min):**
```typescript
const client = insights.createClient({
  ...config,
  batch_size: 50,          // Default
  batch_interval_ms: 5000, // Default (5 seconds)
});
```

**High-Traffic Apps (> 1000 events/min):**
```typescript
const client = insights.createClient({
  ...config,
  batch_size: 100,
  batch_interval_ms: 2000, // 2 seconds
});
```

---

### Query Optimization

#### Always Use Indexed Fields

**Indexed fields:**
- `event_type`
- `session_id`
- `trace_id`
- `app_name`
- `user_id`
- `timestamp`
- `tags`

**Example:**
```sql
-- Good (uses indexes)
SELECT * FROM insights_events
WHERE event_type = 'llm_invocation'
  AND session_id = 'ses_xyz'
  AND timestamp > time::now() - 1h
LIMIT 100;

-- Bad (no indexes, full table scan)
SELECT * FROM insights_events
WHERE payload.custom_field = 'value';
```

#### Limit Result Sets

**Always use LIMIT:**
```sql
-- Good
SELECT * FROM insights_events
WHERE session_id = 'ses_xyz'
LIMIT 100;

-- Bad (returns all rows, slow)
SELECT * FROM insights_events
WHERE session_id = 'ses_xyz';
```

**Default limit: 100**

#### Use Timestamp Ranges

**Filter by time range:**
```sql
SELECT * FROM insights_events
WHERE event_type = 'llm_invocation'
  AND timestamp > time::now() - 1d  -- Last 24 hours
LIMIT 100;
```

---

### Event Design Best Practices

#### Keep Payloads Under 10KB

```typescript
// Good (concise)
await client.addEvent('user_action', {
  action: 'click',
  button_id: 'submit',
});

// Bad (too large)
await client.addEvent('user_action', {
  action: 'click',
  button_id: 'submit',
  full_document: largeDocument, // Don't include large data
});
```

**Solution for large data:**
- Store large data elsewhere (database, file storage)
- Include only IDs/references in events

#### Avoid Deeply Nested Objects (2-3 Levels Max)

```typescript
// Good (2 levels)
await client.addEvent('api_call', {
  endpoint: '/api/users',
  response: {
    status: 200,
    duration_ms: 1500,
  },
});

// Acceptable (3 levels)
await client.addEvent('complex_action', {
  workflow: {
    step: {
      name: 'validate',
      status: 'success',
    },
  },
});

// Bad (too deep, hard to query)
await client.addEvent('over_nested', {
  level1: {
    level2: {
      level3: {
        level4: {
          value: 'too deep',
        },
      },
    },
  },
});
```

#### Use Tags for Common Filters

```typescript
// Add tags for easy filtering
await client.addEvent('api_call', {
  endpoint: '/api/users',
  status_code: 500,
}, {
  tags: ['error', 'api', 'users'],
});

// Query by tags (indexed)
SELECT * FROM insights_events
WHERE 'error' IN tags;
```

---

### Silent Failure Handling

**InsightsClient never throws errors** to prevent breaking your app.

**Best practices:**
1. **Check browser console** for warnings
2. **Don't wrap in try/catch** (not necessary)
3. **Always returns valid IDs** (even on failure)

```typescript
// No try/catch needed
const eventId = await client.addEvent('action', {});
// eventId is always a valid string (even if tracking failed)
```

---

### Memory Management

**InsightsClient manages memory automatically:**
- Event batch is cleared after each flush
- Failed events are retried (with size limit)
- No memory leaks

**Best practices:**
1. **Always call `shutdown()` on unmount**
   ```typescript
   useEffect(() => {
     return () => {
       client.shutdown();
     };
   }, []);
   ```

2. **Don't create multiple clients** (use singleton pattern)
   ```typescript
   // Bad (creates multiple clients, wastes memory)
   useEffect(() => {
     const client = insights.createClient({...});
   }, []); // Creates new client on every render

   // Good (singleton)
   const clientRef = useRef(null);
   useEffect(() => {
     if (!clientRef.current) {
       clientRef.current = insights.createClient({...});
     }
   }, []);
   ```

---

## 13. Integration Examples

### Example 1: Cortex Integration

Track user messages and LLM responses in a chat application.

#### Setup

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { common } from 'tidyscripts_web';
const { insights } = common;

function CortexApp() {
  const insightsClient = useRef(null);

  useEffect(() => {
    // Initialize InsightsClient
    insightsClient.current = insights.createClient({
      app_name: 'cortex',
      app_version: '1.0.0',
      user_id: getCurrentUserId(),
      batch_size: 50,
      batch_interval_ms: 5000,
    });

    return () => {
      insightsClient.current?.shutdown();
    };
  }, []);

  return <div>...</div>;
}
```

#### Track User Messages

```typescript
async function handleUserMessage(message: string) {
  // Track user input
  await insightsClient.current.addUserInput({
    input_mode: 'text',
    input_length: message.length,
    context: { chat_id: currentChatId },
  });

  // Send message to LLM...
}
```

#### Track LLM Invocations

```typescript
async function invokeLLM(prompt: string) {
  const startTime = Date.now();

  try {
    const response = await fetch('/api/llm', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    const latency = Date.now() - startTime;

    // Track LLM invocation
    await insightsClient.current.addLLMInvocation({
      model: 'gpt-4',
      provider: 'openai',
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      latency_ms: latency,
      status: 'success',
    });

    return data.message;
  } catch (error) {
    const latency = Date.now() - startTime;

    // Track LLM error
    await insightsClient.current.addLLMInvocation({
      model: 'gpt-4',
      provider: 'openai',
      prompt_tokens: 0,
      completion_tokens: 0,
      latency_ms: latency,
      status: 'error',
      error: error.message,
    });

    throw error;
  }
}
```

#### Track Complete Workflow

```typescript
async function handleChatWorkflow(userMessage: string) {
  // Start workflow chain
  const rootId = await insightsClient.current.startChain('chat_workflow', {
    chat_id: currentChatId,
    message_length: userMessage.length,
  });

  // 1. User input
  await insightsClient.current.addInChain('user_input', {
    input_mode: 'text',
    input_length: userMessage.length,
  });

  // 2. LLM invocation
  const llmResponse = await invokeLLM(userMessage);
  await insightsClient.current.addInChain('llm_invocation', {
    model: 'gpt-4',
    provider: 'openai',
    prompt_tokens: 1200,
    completion_tokens: 800,
    latency_ms: 2400,
    status: 'success',
  });

  // 3. Save to database
  await saveMessage(llmResponse);
  await insightsClient.current.addInChain('execution', {
    execution_type: 'save_message',
    status: 'success',
    duration_ms: 200,
  });

  // 4. End workflow
  insightsClient.current.endChain();
}
```

---

### Example 2: RAI Integration

Track note generation workflow in Research AI.

#### Setup

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { common } from 'tidyscripts_web';
const { insights } = common;

function RAIApp() {
  const insightsClient = useRef(null);

  useEffect(() => {
    insightsClient.current = insights.createClient({
      app_name: 'rai',
      app_version: '2.1.0',
      user_id: getCurrentUserId(),
      batch_size: 100,
      batch_interval_ms: 3000,
    });

    return () => {
      insightsClient.current?.shutdown();
    };
  }, []);

  return <div>...</div>;
}
```

#### Track Note Generation Workflow

```typescript
async function generateNote(userInput: string) {
  // Start note generation workflow
  const rootId = await insightsClient.current.startChain('note_generation', {
    note_type: 'research',
    source: 'user_input',
  });

  // 1. User input
  await insightsClient.current.addInChain('user_input', {
    input_mode: 'text',
    input_length: userInput.length,
  });

  // 2. LLM invocation (generate note structure)
  const structure = await invokeLLM('Generate note structure');
  await insightsClient.current.addInChain('llm_invocation', {
    model: 'gpt-4',
    provider: 'openai',
    mode: 'structured',
    prompt_tokens: 500,
    completion_tokens: 300,
    latency_ms: 1800,
    status: 'success',
    context: { purpose: 'generate_structure' },
  });

  // 3. LLM invocation (generate note content)
  const content = await invokeLLM('Generate note content');
  await insightsClient.current.addInChain('llm_invocation', {
    model: 'gpt-4',
    provider: 'openai',
    mode: 'unstructured',
    prompt_tokens: 1000,
    completion_tokens: 2000,
    latency_ms: 4500,
    status: 'success',
    context: { purpose: 'generate_content' },
  });

  // 4. Save note
  const noteId = await saveNote({ structure, content });
  await insightsClient.current.addInChain('execution', {
    execution_type: 'save_note',
    status: 'success',
    duration_ms: 200,
    context: { note_id: noteId },
  });

  // 5. End workflow
  insightsClient.current.endChain();

  return noteId;
}
```

#### Track Model Testing

```typescript
async function runModelTest(modelName: string) {
  // Start model test workflow
  const rootId = await insightsClient.current.startChain('model_test', {
    model: modelName,
  });

  // Run test cases
  for (const testCase of testCases) {
    await insightsClient.current.addInChain('test_run', {
      test_id: testCase.id,
      test_name: testCase.name,
    });

    const result = await runTest(testCase);

    await insightsClient.current.addInChain('execution', {
      execution_type: 'test_execution',
      status: result.passed ? 'success' : 'error',
      duration_ms: result.duration,
      context: {
        test_id: testCase.id,
        passed: result.passed,
      },
    });
  }

  // Complete test suite
  await insightsClient.current.addInChain('model_test_complete', {
    total_tests: testCases.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
  });

  insightsClient.current.endChain();
}
```

---

### Example 3: Generic Web App

Track page views, clicks, and errors in a standard web application.

#### Setup

```typescript
'use client';
import { useEffect, useRef } from 'react';
import { common } from 'tidyscripts_web';
const { insights } = common;

function App() {
  const insightsClient = useRef(null);

  useEffect(() => {
    insightsClient.current = insights.createClient({
      app_name: 'my_web_app',
      app_version: '1.0.0',
      user_id: getAnonymousUserId(), // Generate persistent anonymous ID
      batch_size: 50,
      batch_interval_ms: 5000,
    });

    // Track initial page view
    insightsClient.current.addEvent('page_view', {
      page: window.location.pathname,
      referrer: document.referrer,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    });

    return () => {
      insightsClient.current?.shutdown();
    };
  }, []);

  return <div>...</div>;
}
```

#### Track Page Views

```typescript
// Track route changes (Next.js)
import { usePathname } from 'next/navigation';

function PageTracker() {
  const pathname = usePathname();
  const insightsClient = useRef(null);

  useEffect(() => {
    if (insightsClient.current) {
      insightsClient.current.addEvent('page_view', {
        page: pathname,
        referrer: document.referrer,
      });
    }
  }, [pathname]);

  return null;
}
```

#### Track Button Clicks

```typescript
function SubmitButton() {
  const insightsClient = useContext(InsightsContext);

  const handleClick = async () => {
    // Track click
    await insightsClient.addEvent('button_click', {
      button_id: 'submit',
      button_label: 'Submit',
      page: window.location.pathname,
    });

    // Handle submission...
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

#### Track Form Submissions

```typescript
function LoginForm() {
  const insightsClient = useContext(InsightsContext);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Start form submission workflow
    const rootId = await insightsClient.startChain('form_submission', {
      form_id: 'login_form',
      page: window.location.pathname,
    });

    // Validate form
    await insightsClient.addInChain('execution', {
      execution_type: 'form_validation',
      status: 'success',
      duration_ms: 50,
    });

    // Submit to API
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      await insightsClient.addInChain('execution', {
        execution_type: 'api_call',
        status: response.ok ? 'success' : 'error',
        duration_ms: 1500,
      });

      if (response.ok) {
        // Success
        await insightsClient.addInChain('user_interaction', {
          action: 'login_success',
        });
      } else {
        // Error
        await insightsClient.addInChain('error', {
          error_type: 'login_failed',
          error_message: 'Invalid credentials',
        }, {
          tags: ['error', 'auth'],
        });
      }
    } catch (error) {
      await insightsClient.addInChain('error', {
        error_type: 'network_error',
        error_message: error.message,
      }, {
        tags: ['error', 'network'],
      });
    }

    insightsClient.endChain();
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Track Errors

```typescript
// Global error handler
useEffect(() => {
  const handleError = (event) => {
    insightsClient.current?.addEvent('error', {
      error_type: 'uncaught_error',
      error_message: event.message,
      error_stack: event.error?.stack,
      page: window.location.pathname,
    }, {
      tags: ['error', 'uncaught'],
    });
  };

  window.addEventListener('error', handleError);

  return () => {
    window.removeEventListener('error', handleError);
  };
}, []);
```

---

## 14. Testing with Meditation App

The **Meditation app** is a complete reference implementation and testing dashboard for InsightsClient.

### Location & Access

**File Path:** `/apps/ts_next_app/app/laboratory/meditation/`
**URL:** `http://localhost:3000/laboratory/meditation` (when Next.js dev server is running)

### Features

#### 1. Event Generator (Manual Testing)
- Create custom events with any type and payload
- Test all convenience methods (addUserInput, addLLMInvocation, addExecution)
- Create event chains interactively
- Observe client state changes in real-time

#### 2. Event Monitor (Real-time Feed)
- Live event feed (displays last 100 events)
- Shows event details (ID, type, payload, timestamps)
- Visual indicators for chained events (trace_id, parent_event_id)
- Event count tracking

#### 3. Database Query (Verify Storage)
- Query events from SurrealDB
- Filter by session, event type, trace, etc.
- Verify events are persisted correctly
- Test query performance

#### 4. Validation Tests (7 Automated Tests)
1. Client initialization
2. Event creation
3. Event batching
4. Event chains
5. Convenience methods
6. Client state management
7. Silent failure handling

#### 5. Database Test Suite (8 End-to-End Tests)
1. Event storage verification
2. Event retrieval
3. Chain integrity
4. Index performance
5. Payload flexibility
6. Tag filtering
7. Timestamp queries
8. Cross-session queries

#### 6. Demo Workflow (One-Click Full Demo)
- Runs a complete workflow demonstrating all features
- Creates various event types
- Demonstrates event chains
- Tests batching and flushing
- Verifies database storage

#### 7. Log Exporter (Capture All Logs)
- Export all logs to JSON/text file
- Includes console logs, events, network requests
- Useful for debugging and analysis

### How to Use for Testing

#### Step 1: Start Next.js Dev Server

```bash
cd /home/oluwa/dev/tidyscripts/apps/ts_next_app
npm run dev
```

#### Step 2: Navigate to Meditation App

Open browser to: `http://localhost:3000/laboratory/meditation`

#### Step 3: Run Demo Workflow

1. Click "Run Demo Workflow" button
2. Observe real-time event creation
3. Check Event Monitor for created events
4. Verify database storage in Database Query tab

#### Step 4: Run Validation Tests

1. Go to "Validation Tests" tab
2. Click "Run All Tests"
3. Verify all tests pass (green checkmarks)

#### Step 5: Run Database Test Suite

1. Click "Run Database Tests" button
2. Observe test results (all tests should pass)
3. Check for any errors or failures

#### Step 6: Manual Testing

1. Go to "Event Generator" tab
2. Create custom events with different types/payloads
3. Test event chains (Start Chain → Add Events → End Chain)
4. Verify events in Event Monitor
5. Query events in Database Query tab

#### Step 7: Export Logs

1. Click "Export Logs" button
2. Download logs file
3. Analyze logs for debugging

### Testing Checklist

- [ ] Demo workflow completes successfully
- [ ] All validation tests pass
- [ ] All database tests pass
- [ ] Events appear in Event Monitor
- [ ] Events stored in database (verified via Database Query)
- [ ] Event chains linked correctly (matching trace_id)
- [ ] Client state updates correctly (session ID, batch size, chain depth)
- [ ] Batch flushing works (manual and automatic)
- [ ] Silent failure handling works (no app crashes)

### Example Usage in Meditation App

**File:** `/apps/ts_next_app/app/laboratory/meditation/page.tsx`

```typescript
// Initialize InsightsClient
const insightsClient = insights.createClient({
  app_name: 'meditation',
  app_version: '0.1.0',
  user_id: 'test_user',
  session_id: insights.generateSessionId(),
  batch_size: 10,
  batch_interval_ms: 5000,
});

// Create events
await insightsClient.addEvent('test_event', {
  test_data: 'hello world',
});

// Create event chain
const rootId = await insightsClient.startChain('test_workflow', {});
await insightsClient.addInChain('step_1', {});
await insightsClient.addInChain('step_2', {});
insightsClient.endChain();

// Flush batch
await insightsClient.flushBatch();

// Shutdown
await insightsClient.shutdown();
```

### Additional Resources

**Implementation Plan:** `/meta/plans/meditation.md` (840+ lines of detailed implementation notes)

---

## Appendix

### Related Documentation

- **Database Schema:** `/docs/insights_schema.surql`
- **Meditation Implementation Plan:** `/meta/plans/meditation.md`
- **InsightsClient Implementation:** `/packages/ts_common/src/apis/insights.ts`
- **Type Definitions:** `/packages/ts_common/src/types/insights.ts`

### OpenTelemetry Mapping

| InsightsClient       | OpenTelemetry (OTel) |
|----------------------|----------------------|
| Event                | Span                 |
| `event_id`           | Span ID              |
| `event_type`         | Span name            |
| `payload`            | Span attributes      |
| `trace_id`           | Trace ID             |
| `parent_event_id`    | Parent Span ID       |
| Event chain          | Trace (multiple spans)|
| `timestamp`          | Span start time      |
| `duration_ms`        | Span duration        |

### Version History

| Version | Date       | Changes                              |
|---------|------------|--------------------------------------|
| 1.0.0   | 2026-01-20 | Initial comprehensive documentation  |

---

**End of InsightsClient Agent Guide**

For questions or issues, refer to the Meditation app for working examples and testing tools.
