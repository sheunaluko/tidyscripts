# ReflectionsClient Documentation

**Version:** 1.0
**Last Updated:** 2026-01-21
**Package:** `tidyscripts_common/apis/reflections`

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Core Concepts](#core-concepts)
6. [API Reference](#api-reference)
   - [Core Query Methods](#core-query-methods)
   - [Data Exploration Methods](#data-exploration-methods)
   - [Utility Methods](#utility-methods)
   - [Not Yet Implemented](#not-yet-implemented)
7. [Type Definitions](#type-definitions)
8. [Caching System](#caching-system)
9. [Error Handling](#error-handling)
10. [Integration Examples](#integration-examples)
11. [Best Practices](#best-practices)

---

## Overview

**ReflectionsClient** is the query and analysis system for Insights events. It provides read-side operations in a CQRS (Command Query Responsibility Segregation) architecture:

- **InsightsClient** (write-side): Creates and stores events
- **ReflectionsClient** (read-side): Queries and analyzes stored events

### Key Features

- ✅ **Flexible querying** with multiple filter options
- ✅ **Built-in caching** with configurable TTL (default: 60 seconds)
- ✅ **Data exploration** utilities (19 methods total)
- ✅ **Silent failure mode** for resilient apps
- ✅ **Session and trace inspection**
- ✅ **Event type statistics and schema inspection**
- ⏸️ **Advanced analytics** (Phase 3-4, not yet implemented)

### Current Status

**Phase 1 Complete:** Core query functionality
**Phase 1.5 Complete:** Data exploration utilities (11 methods)
**Phase 2 Deferred:** Advanced query endpoint
**Phase 3 Deferred:** Session/trace analysis
**Phase 4 Deferred:** LLM/performance analytics

---

## Architecture

### CQRS Pattern

```
┌─────────────────┐         ┌──────────────────┐
│ InsightsClient  │ ─────▶  │    SurrealDB     │
│  (Write Side)   │  Write  │  insights_events │
└─────────────────┘         └──────────────────┘
                                     │
                                     ▼ Read
                            ┌──────────────────┐
                            │ ReflectionsClient│
                            │  (Read Side)     │
                            └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │   MemoryCache    │
                            │   (60s TTL)      │
                            └──────────────────┘
```

### Request Flow

1. **Client** calls `queryEvents(filter)`
2. **Cache Check**: Look for cached result (key = JSON.stringify(filter))
3. **Cache Hit**: Return cached result with `from_cache: true`
4. **Cache Miss**: Execute query via `/api/insights/query` endpoint
5. **Store Result**: Cache result for future queries
6. **Return**: Query result with metadata

---

## Quick Start

### Installation

```typescript
import { createClient } from 'tidyscripts_common/apis/reflections';
```

### Basic Usage

```typescript
// Create client with defaults
const client = createClient();

// Query events
const result = await client.queryEvents({ limit: 10 });
console.log(`Found ${result.total_count} events`);

// Get events by session
const sessionEvents = await client.getEventsBySession('session_abc123');

// Explore event types
const types = await client.getEventTypes();
console.log('Event types:', types);

// Get database statistics
const stats = await client.getDatabaseStats();
console.log(`Total events: ${stats.total_events}`);
```

### With Custom Configuration

```typescript
const client = createClient({
  endpoint: '/api/insights/query',
  enable_cache: true,
  cache_ttl_ms: 120000, // 2 minutes
  silent_failure: true,
  verbose: true
});
```

---

## Configuration

### ReflectionsConfig Interface

```typescript
interface ReflectionsConfig {
  endpoint?: string;                    // Default: '/api/insights/query'
  enable_cache?: boolean;               // Default: true
  cache_ttl_ms?: number;               // Default: 60000 (1 minute)
  cache_namespace?: string;            // Default: 'reflections'
  silent_failure?: boolean;            // Default: false
  verbose?: boolean;                   // Default: false
  slow_llm_threshold_ms?: number;      // Default: 5000
  slow_operation_threshold_ms?: number; // Default: 10000
}
```

### Configuration Options Explained

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | string | `/api/insights/query` | API endpoint for queries |
| `enable_cache` | boolean | `true` | Enable/disable caching |
| `cache_ttl_ms` | number | `60000` | Cache TTL in milliseconds |
| `cache_namespace` | string | `reflections` | Cache key prefix |
| `silent_failure` | boolean | `false` | Return empty results on error instead of throwing |
| `verbose` | boolean | `false` | Enable detailed logging |
| `slow_llm_threshold_ms` | number | `5000` | Threshold for slow LLM operations |
| `slow_operation_threshold_ms` | number | `10000` | Threshold for slow operations |

---

## Core Concepts

### Event Structure

Every Insights event has these core fields:

```typescript
interface InsightsEvent {
  event_id: string;           // Unique identifier
  event_type: string;         // e.g., "llm_invocation", "user_input"
  timestamp: number;          // Unix timestamp (ms)
  session_id: string;         // Groups related events
  trace_id?: string;          // Groups parent-child events
  parent_event_id?: string;   // Parent event in chain
  app_name: string;
  app_version: string;
  user_id: string;
  tags?: string[];            // e.g., ["error", "slow"]
  payload?: Record<string, any>; // Event-specific data
  duration_ms?: number;       // Operation duration
  client_info?: Record<string, any>;
}
```

### Query Filters

All query methods accept flexible filters:

```typescript
interface QueryFilter {
  // Basic filters
  event_type?: string;
  session_id?: string;
  trace_id?: string;
  user_id?: string;
  app_name?: string;
  app_version?: string;

  // Tag filters
  tags?: string[];           // Events with ANY of these tags
  tags_all?: string[];       // Events with ALL of these tags
  parent_event_id?: string;

  // Time range
  timestamp_gte?: number;    // Greater than or equal
  timestamp_lte?: number;    // Less than or equal

  // Advanced filters
  duration_min_ms?: number;
  duration_max_ms?: number;
  has_error?: boolean;

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'timestamp' | 'duration_ms' | 'event_type';
  sort_order?: 'asc' | 'desc';
}
```

### Query Results

All queries return a `QueryResult`:

```typescript
interface QueryResult {
  events: InsightsEvent[];
  total_count: number;
  query_time_ms: number;
  from_cache: boolean;      // true if served from cache
  server_logs?: string[];   // Server-side logs (if verbose)
}
```

---

## API Reference

### Core Query Methods

#### `queryEvents(filter?: QueryFilter): Promise<QueryResult>`

Core query method that all other queries build upon.

**Parameters:**
- `filter` (optional): Query filter options

**Returns:** `QueryResult` with events, count, timing, and cache status

**Example:**
```typescript
// Get all events (up to default limit)
const all = await client.queryEvents();

// Filter by event type
const llmCalls = await client.queryEvents({
  event_type: 'llm_invocation'
});

// Complex query
const result = await client.queryEvents({
  event_type: 'user_input',
  timestamp_gte: Date.now() - 86400000, // Last 24 hours
  limit: 50,
  sort_by: 'timestamp',
  sort_order: 'desc'
});
```

---

#### `getEventsBySession(session_id: string, options?: { limit?: number }): Promise<QueryResult>`

Get all events for a specific session.

**Parameters:**
- `session_id` (required): Session identifier
- `options.limit` (optional): Maximum events to return

**Returns:** `QueryResult` sorted by timestamp (ascending)

**Example:**
```typescript
const sessionEvents = await client.getEventsBySession('sess_abc123');
console.log(`Session has ${sessionEvents.total_count} events`);

// Limit results
const recent = await client.getEventsBySession('sess_abc123', { limit: 10 });
```

---

#### `getEventsByTrace(trace_id: string): Promise<QueryResult>`

Get all events in a trace (event chain).

**Parameters:**
- `trace_id` (required): Trace identifier

**Returns:** `QueryResult` sorted by timestamp (ascending)

**Example:**
```typescript
const traceEvents = await client.getEventsByTrace('trc_xyz789');
console.log(`Trace has ${traceEvents.total_count} events`);

// Trace events maintain parent-child relationships
traceEvents.events.forEach(event => {
  console.log(`${event.event_type} → parent: ${event.parent_event_id}`);
});
```

---

#### `getEventsByType(event_type: string, options?: { limit?: number; session_id?: string }): Promise<QueryResult>`

Get events of a specific type.

**Parameters:**
- `event_type` (required): Event type to filter
- `options.limit` (optional): Maximum events to return
- `options.session_id` (optional): Further filter by session

**Returns:** `QueryResult`

**Example:**
```typescript
// Get all LLM invocations
const llmEvents = await client.getEventsByType('llm_invocation');

// Limit to 20
const recent = await client.getEventsByType('llm_invocation', { limit: 20 });

// Filter by session and type
const sessionLLM = await client.getEventsByType('llm_invocation', {
  session_id: 'sess_abc123'
});
```

---

#### `getEventById(event_id: string): Promise<InsightsEvent | null>`

Retrieve a single event by ID.

**Parameters:**
- `event_id` (required): Event identifier

**Returns:** `InsightsEvent` or `null` if not found

**Note:** Current implementation queries all events and filters. Phase 2 will add direct ID lookup.

**Example:**
```typescript
const event = await client.getEventById('evt_12345');
if (event) {
  console.log('Event found:', event.event_type);
} else {
  console.log('Event not found');
}
```

---

### Data Exploration Methods

#### `getEventTypes(): Promise<string[]>`

Get all unique event types in the database.

**Returns:** Sorted array of event type strings

**Example:**
```typescript
const types = await client.getEventTypes();
console.log('Event types:', types);
// Output: ["llm_invocation", "user_input", "execution", ...]
```

---

#### `getEventTypeStats(): Promise<EventTypeStats[]>`

Get detailed statistics for each event type.

**Returns:** Array of `EventTypeStats` sorted by count (descending)

**EventTypeStats Interface:**
```typescript
interface EventTypeStats {
  event_type: string;
  count: number;
  first_seen: number;        // Timestamp
  last_seen: number;         // Timestamp
  has_duration: boolean;     // Any events have duration_ms
  has_tags: boolean;         // Any events have tags
  sample_payload_keys: string[]; // Payload keys from first event
}
```

**Example:**
```typescript
const stats = await client.getEventTypeStats();
stats.forEach(stat => {
  console.log(`${stat.event_type}: ${stat.count} events`);
  console.log(`  First: ${new Date(stat.first_seen).toLocaleString()}`);
  console.log(`  Last: ${new Date(stat.last_seen).toLocaleString()}`);
  console.log(`  Payload keys: ${stat.sample_payload_keys.join(', ')}`);
});
```

---

#### `inspectPayloadSchema(event_type: string): Promise<PayloadSchemaInspection>`

Analyze payload structure for a specific event type.

**Parameters:**
- `event_type` (required): Event type to inspect

**Returns:** `PayloadSchemaInspection` with field analysis

**PayloadSchemaInspection Interface:**
```typescript
interface PayloadSchemaInspection {
  event_type: string;
  total_events: number;
  fields: PayloadFieldInfo[];
  common_fields: string[];    // Present in >90% of events
  optional_fields: string[];  // Present in <90% of events
}

interface PayloadFieldInfo {
  field_name: string;
  occurrences: number;
  sample_values: any[];       // Up to 5 samples
  value_types: string[];      // e.g., ["string", "number"]
}
```

**Example:**
```typescript
const schema = await client.inspectPayloadSchema('llm_invocation');
console.log(`Analyzed ${schema.total_events} events`);
console.log('Common fields:', schema.common_fields);
console.log('Optional fields:', schema.optional_fields);

schema.fields.forEach(field => {
  console.log(`${field.field_name}: ${field.occurrences} occurrences`);
  console.log(`  Types: ${field.value_types.join(', ')}`);
  console.log(`  Samples: ${field.sample_values.slice(0, 3).join(', ')}`);
});
```

---

#### `getSessions(limit?: number): Promise<string[]>`

Get list of all session IDs.

**Parameters:**
- `limit` (optional): Maximum sessions to return (default: 100)

**Returns:** Array of session ID strings

**Example:**
```typescript
const sessions = await client.getSessions();
console.log(`Found ${sessions.length} sessions`);

// Get first 10 sessions
const recent = await client.getSessions(10);
```

---

#### `getTraces(limit?: number): Promise<string[]>`

Get list of all trace IDs.

**Parameters:**
- `limit` (optional): Maximum traces to return (default: 100)

**Returns:** Array of trace ID strings (only events with trace_id)

**Example:**
```typescript
const traces = await client.getTraces();
console.log(`Found ${traces.length} traces`);

// Get first 5 traces
const recent = await client.getTraces(5);
```

---

#### `inspectSession(session_id: string): Promise<SessionInspection>`

Deep inspection of a specific session.

**Parameters:**
- `session_id` (required): Session to inspect

**Returns:** `SessionInspection` with detailed analysis

**SessionInspection Interface:**
```typescript
interface SessionInspection {
  session_id: string;
  event_count: number;
  event_types: Record<string, number>; // Type → count
  traces: string[];                     // Trace IDs in session
  time_range: { start: number; end: number };
  duration_ms: number;
  sample_events: InsightsEvent[];       // First 5 events
}
```

**Example:**
```typescript
const inspection = await client.inspectSession('sess_abc123');
console.log(`Session: ${inspection.session_id}`);
console.log(`Events: ${inspection.event_count}`);
console.log(`Duration: ${inspection.duration_ms}ms`);
console.log('Event breakdown:');
Object.entries(inspection.event_types).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});
console.log(`Traces: ${inspection.traces.length}`);
```

---

#### `inspectTrace(trace_id: string): Promise<TraceInspection>`

Deep inspection of a specific trace (event chain).

**Parameters:**
- `trace_id` (required): Trace to inspect

**Returns:** `TraceInspection` with chain structure analysis

**TraceInspection Interface:**
```typescript
interface TraceInspection {
  trace_id: string;
  event_count: number;
  events: InsightsEvent[];              // All events in trace
  has_root: boolean;                    // Has event with no parent
  root_event?: InsightsEvent;
  chain_structure: {
    depth: number;                       // Max chain depth
    branches: number;                    // Children of root
    leaf_count: number;                  // Events with no children
  };
  time_range: { start: number; end: number };
  duration_ms: number;
}
```

**Example:**
```typescript
const inspection = await client.inspectTrace('trc_xyz789');
console.log(`Trace: ${inspection.trace_id}`);
console.log(`Events: ${inspection.event_count}`);
console.log(`Chain depth: ${inspection.chain_structure.depth}`);
console.log(`Branches: ${inspection.chain_structure.branches}`);
console.log(`Leaf nodes: ${inspection.chain_structure.leaf_count}`);

if (inspection.has_root) {
  console.log('Root event:', inspection.root_event?.event_type);
}
```

---

#### `getAllTags(): Promise<string[]>`

Get all unique tags used in events.

**Returns:** Sorted array of tag strings

**Example:**
```typescript
const tags = await client.getAllTags();
console.log('Tags in use:', tags);
// Output: ["error", "slow", "llm", "cached", ...]
```

---

#### `getTimeRange(): Promise<TimeRangeInfo>`

Get time range of all events in database.

**Returns:** `TimeRangeInfo` with dataset boundaries

**TimeRangeInfo Interface:**
```typescript
interface TimeRangeInfo {
  earliest: number;           // Unix timestamp (ms)
  latest: number;             // Unix timestamp (ms)
  span_ms: number;           // Duration in ms
  span_days: number;         // Duration in days
  total_events: number;
}
```

**Example:**
```typescript
const range = await client.getTimeRange();
console.log(`Dataset spans ${range.span_days.toFixed(1)} days`);
console.log(`From: ${new Date(range.earliest).toLocaleString()}`);
console.log(`To: ${new Date(range.latest).toLocaleString()}`);
console.log(`Total events: ${range.total_events}`);
```

---

#### `getDatabaseStats(): Promise<DatabaseStats>`

Get comprehensive database statistics.

**Returns:** `DatabaseStats` with overview

**DatabaseStats Interface:**
```typescript
interface DatabaseStats {
  total_events: number;
  event_types: string[];      // All event types
  sessions: string[];         // All session IDs
  traces: string[];           // All trace IDs
  apps: string[];             // All app names
  users: string[];            // All user IDs
  time_range: TimeRangeInfo;
}
```

**Example:**
```typescript
const stats = await client.getDatabaseStats();
console.log('Database Overview:');
console.log(`  Total events: ${stats.total_events}`);
console.log(`  Event types: ${stats.event_types.length}`);
console.log(`  Sessions: ${stats.sessions.length}`);
console.log(`  Traces: ${stats.traces.length}`);
console.log(`  Applications: ${stats.apps.length}`);
console.log(`  Users: ${stats.users.length}`);
console.log(`  Time span: ${stats.time_range.span_days.toFixed(1)} days`);
```

---

#### `sampleEvents(event_type: string, limit?: number): Promise<InsightsEvent[]>`

Get sample events of a specific type.

**Parameters:**
- `event_type` (required): Event type to sample
- `limit` (optional): Number of samples (default: 10)

**Returns:** Array of `InsightsEvent`

**Example:**
```typescript
// Get 5 sample LLM invocations
const samples = await client.sampleEvents('llm_invocation', 5);
samples.forEach(event => {
  console.log(`${event.event_type} at ${new Date(event.timestamp).toLocaleString()}`);
  console.log('Payload:', event.payload);
});
```

---

### Utility Methods

#### `invalidateCache(pattern?: string): Promise<void>`

Invalidate cache entries matching a pattern (or all if no pattern).

**Parameters:**
- `pattern` (optional): String to match in cache keys

**Returns:** Promise that resolves when cache is invalidated

**Example:**
```typescript
// Clear specific cache entries
await client.invalidateCache('llm_invocation');

// Clear all cache
await client.invalidateCache();
```

---

#### `getCacheStats(): any`

Get cache statistics.

**Returns:** Cache stats object or `{ enabled: false }`

**Example:**
```typescript
const stats = client.getCacheStats();
if (stats.enabled) {
  console.log(`Cache hits: ${stats.hits}`);
  console.log(`Cache misses: ${stats.misses}`);
  console.log(`Hit rate: ${(stats.hits / stats.total * 100).toFixed(1)}%`);
}
```

---

#### `setEnabled(enabled: boolean): void`

Enable or disable the client.

**Parameters:**
- `enabled` (required): Enable/disable client

**Example:**
```typescript
// Disable client (all queries return empty results)
client.setEnabled(false);

// Re-enable
client.setEnabled(true);
```

---

#### `getConfig(): Required<ReflectionsConfig>`

Get current client configuration.

**Returns:** Complete configuration object

**Example:**
```typescript
const config = client.getConfig();
console.log('Endpoint:', config.endpoint);
console.log('Cache enabled:', config.enable_cache);
console.log('Cache TTL:', config.cache_ttl_ms);
```

---

### Not Yet Implemented

These methods are placeholders for future phases:

#### `analyzeSession(session_id: string): Promise<SessionAnalysis>`
**Status:** Phase 3 - Not yet implemented
**Throws:** `"analyzeSession not yet implemented (Phase 3)"`

#### `analyzeTrace(trace_id: string): Promise<TraceAnalysis>`
**Status:** Phase 3 - Not yet implemented
**Throws:** `"analyzeTrace not yet implemented (Phase 3)"`

#### `analyzeLLMUsage(time_range, filter?): Promise<LLMAnalytics>`
**Status:** Phase 4 - Not yet implemented
**Throws:** `"analyzeLLMUsage not yet implemented (Phase 4)"`

#### `analyzePerformance(time_range, filter?): Promise<PerformanceMetrics>`
**Status:** Phase 4 - Not yet implemented
**Throws:** `"analyzePerformance not yet implemented (Phase 4)"`

#### `analyzeErrors(time_range, filter?): Promise<ErrorAnalysis>`
**Status:** Phase 4 - Not yet implemented
**Throws:** `"analyzeErrors not yet implemented (Phase 4)"`

---

## Type Definitions

All types are exported from `tidyscripts_common/types/reflections`:

```typescript
import {
  QueryFilter,
  QueryResult,
  EventTypeStats,
  PayloadSchemaInspection,
  SessionInspection,
  TraceInspection,
  TimeRangeInfo,
  DatabaseStats,
  ReflectionsConfig
} from 'tidyscripts_common/types/reflections';
```

See the [Core Concepts](#core-concepts) section for detailed type definitions.

---

## Caching System

### How Caching Works

1. **Cache Key Generation:** `JSON.stringify(filter)`
2. **Cache Lookup:** Check MemoryCache for key
3. **Cache Hit:** Return cached result with `from_cache: true`
4. **Cache Miss:** Execute query, store result, return with `from_cache: false`
5. **TTL:** Cached entries expire after `cache_ttl_ms` (default: 60 seconds)

### Cache Benefits

- **Reduced latency:** Cached queries return in <1ms
- **Reduced database load:** Same query doesn't hit database repeatedly
- **Automatic expiration:** Stale data cleared after TTL

### Cache Invalidation

```typescript
// Clear all cache
await client.invalidateCache();

// Clear specific pattern
await client.invalidateCache('llm_invocation');

// Clear specific method
await client.invalidateCache('getEventTypes');
```

### Cache Statistics

```typescript
const stats = client.getCacheStats();
console.log(`Hits: ${stats.hits}`);
console.log(`Misses: ${stats.misses}`);
console.log(`Total: ${stats.total}`);
console.log(`Hit rate: ${(stats.hits / stats.total * 100).toFixed(1)}%`);
```

### Disabling Cache

```typescript
const client = createClient({
  enable_cache: false
});
```

---

## Error Handling

### Silent Failure Mode

When `silent_failure: true`, errors return empty results instead of throwing:

```typescript
const client = createClient({ silent_failure: true });

// Will return empty result instead of throwing on error
const result = await client.queryEvents({ invalid_filter: true });
console.log(result); // { events: [], total_count: 0, ... }
```

### Standard Error Mode

When `silent_failure: false` (default), errors are thrown:

```typescript
try {
  const result = await client.queryEvents({ invalid_filter: true });
} catch (error) {
  console.error('Query failed:', error.message);
}
```

### HTTP Errors

API errors include status codes:

```typescript
try {
  const result = await client.queryEvents();
} catch (error) {
  // Error format: "HTTP 500: Internal Server Error"
  console.error(error.message);
}
```

---

## Integration Examples

### React Component

```typescript
import { createClient } from 'tidyscripts_common/apis/reflections';
import { useState, useEffect } from 'react';

function EventExplorer() {
  const [client] = useState(() => createClient());
  const [stats, setStats] = useState(null);

  useEffect(() => {
    client.getDatabaseStats().then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1>Database Overview</h1>
      <p>Total events: {stats.total_events}</p>
      <p>Event types: {stats.event_types.length}</p>
      <p>Sessions: {stats.sessions.length}</p>
    </div>
  );
}
```

### Session Analysis

```typescript
async function analyzeUserSession(sessionId: string) {
  const client = createClient();

  // Get session overview
  const inspection = await client.inspectSession(sessionId);
  console.log(`Session ${sessionId}:`);
  console.log(`  Duration: ${inspection.duration_ms}ms`);
  console.log(`  Events: ${inspection.event_count}`);

  // Get event type breakdown
  Object.entries(inspection.event_types).forEach(([type, count]) => {
    const percentage = (count / inspection.event_count * 100).toFixed(1);
    console.log(`  ${type}: ${count} (${percentage}%)`);
  });

  // Get all session events for detailed analysis
  const allEvents = await client.getEventsBySession(sessionId);
  const errors = allEvents.events.filter(e =>
    e.tags?.includes('error')
  );
  console.log(`  Errors: ${errors.length}`);
}
```

### Trace Debugging

```typescript
async function debugTrace(traceId: string) {
  const client = createClient();

  const inspection = await client.inspectTrace(traceId);

  console.log(`Trace ${traceId}:`);
  console.log(`  Chain depth: ${inspection.chain_structure.depth}`);
  console.log(`  Total events: ${inspection.event_count}`);

  // Print event chain
  if (inspection.root_event) {
    printEventTree(inspection.root_event, inspection.events, 0);
  }
}

function printEventTree(event: InsightsEvent, allEvents: InsightsEvent[], depth: number) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}├─ ${event.event_type} (${event.duration_ms}ms)`);

  // Find children
  const children = allEvents.filter(e => e.parent_event_id === event.event_id);
  children.forEach(child => printEventTree(child, allEvents, depth + 1));
}
```

### Event Type Analysis

```typescript
async function analyzeEventType(eventType: string) {
  const client = createClient();

  // Get schema
  const schema = await client.inspectPayloadSchema(eventType);
  console.log(`\nEvent Type: ${eventType}`);
  console.log(`Total events: ${schema.total_events}`);
  console.log(`\nCommon fields (>90%):`);
  schema.common_fields.forEach(field => {
    const fieldInfo = schema.fields.find(f => f.field_name === field);
    console.log(`  ${field}: ${fieldInfo?.value_types.join(' | ')}`);
  });

  console.log(`\nOptional fields (<90%):`);
  schema.optional_fields.forEach(field => {
    const fieldInfo = schema.fields.find(f => f.field_name === field);
    const percentage = (fieldInfo!.occurrences / schema.total_events * 100).toFixed(1);
    console.log(`  ${field}: ${percentage}% (${fieldInfo?.value_types.join(' | ')})`);
  });

  // Get samples
  const samples = await client.sampleEvents(eventType, 3);
  console.log(`\nSample events:`);
  samples.forEach((event, i) => {
    console.log(`\nSample ${i + 1}:`);
    console.log(JSON.stringify(event.payload, null, 2));
  });
}
```

---

## Best Practices

### 1. Use Caching Wisely

✅ **Good:** Keep cache enabled for repeated queries
```typescript
const client = createClient(); // cache enabled by default
```

❌ **Bad:** Disabling cache unnecessarily
```typescript
const client = createClient({ enable_cache: false });
```

### 2. Use Appropriate Query Methods

✅ **Good:** Use specific methods for common patterns
```typescript
const sessionEvents = await client.getEventsBySession(sessionId);
const llmCalls = await client.getEventsByType('llm_invocation');
```

❌ **Bad:** Always using queryEvents
```typescript
const sessionEvents = await client.queryEvents({ session_id: sessionId });
```

### 3. Handle Errors Appropriately

✅ **Good:** Use silent_failure for non-critical queries
```typescript
const client = createClient({ silent_failure: true });
const events = await client.queryEvents(); // Returns empty on error
```

✅ **Good:** Use try-catch for critical queries
```typescript
try {
  const events = await client.queryEvents({ critical: true });
} catch (error) {
  // Handle error appropriately
}
```

### 4. Limit Query Results

✅ **Good:** Use limit for large datasets
```typescript
const recent = await client.queryEvents({ limit: 100 });
```

❌ **Bad:** Querying all events when you need a few
```typescript
const all = await client.queryEvents(); // Returns 10000+
```

### 5. Use Exploration Methods

✅ **Good:** Use exploration methods to understand data first
```typescript
// Discover what's available
const types = await client.getEventTypes();
const stats = await client.getEventTypeStats();

// Then query specific data
const events = await client.getEventsByType(types[0]);
```

### 6. Cache Invalidation Strategy

✅ **Good:** Invalidate cache when data changes
```typescript
// After writing new events
await insightsClient.addEvent(...);
await reflectionsClient.invalidateCache();
```

✅ **Good:** Invalidate specific patterns
```typescript
await client.invalidateCache('llm_invocation');
```

### 7. Monitor Cache Performance

✅ **Good:** Check cache hit rate periodically
```typescript
const stats = client.getCacheStats();
const hitRate = (stats.hits / stats.total * 100).toFixed(1);
if (hitRate < 50) {
  console.warn('Low cache hit rate:', hitRate);
}
```

---

## Summary

**ReflectionsClient** provides a comprehensive query and exploration system for Insights events with:

- ✅ 19 methods covering all common query patterns
- ✅ Built-in caching for performance
- ✅ Data exploration utilities
- ✅ Flexible filtering and sorting
- ✅ Silent failure mode for resilient apps
- ✅ Complete TypeScript type definitions

**Current Status:** Phase 1 + Phase 1.5 complete
**Future Phases:** Advanced analytics coming in Phase 3-4

For questions or issues, see the source code at:
- Implementation: `packages/ts_common/src/apis/reflections.ts`
- Types: `packages/ts_common/src/types/reflections.ts`
- Examples: `packages/ts_common/src/apis/reflections_example.ts`
