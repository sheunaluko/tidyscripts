# ReflectionsClient Implementation Plan

**Goal**: Build a read-side analytics client for the Insights event system using CQRS pattern

**Status**: Phase 1 Complete, Phase 1.5 (Data Exploration) Complete ✅
**Scope**: Core features (Phases 1, 1.5, 2-4)
**Estimated Timeline**: 5 weeks

---

## Architecture Overview

### Design Pattern: CQRS (Command Query Responsibility Segregation)
- **InsightsClient** (existing) = Write-side (captures events)
- **ReflectionsClient** (new) = Read-side (queries and analyzes events)

### Key Principles
- Mirror InsightsClient patterns (factory, singleton, environment-aware)
- Leverage existing infrastructure (SurrealDB, cache utilities, API endpoints)
- Stateless query client (no batching/timers like InsightsClient)
- Intelligent caching with TTL support
- Silent failure option for graceful degradation
- **Data-driven development**: Build exploration tools first, then implement analytics based on actual data patterns

---

## Implementation Status

### ✅ Phase 1: Foundation (COMPLETE)
- ✅ Basic query functionality
- ✅ Cache integration
- ✅ Factory pattern implementation
- ✅ Tests written
- ✅ Examples created

### ✅ Phase 1.5: Data Exploration (COMPLETE)
- ✅ Data discovery utilities (getEventTypes, getEventTypeStats)
- ✅ Payload schema inspection (inspectPayloadSchema)
- ✅ Session/trace exploration (inspectSession, inspectTrace, getSessions, getTraces)
- ✅ Field analysis tools (getAllTags, getTimeRange, getDatabaseStats)
- ✅ Event sampling (sampleEvents)
- ✅ Examples and test script created
**Rationale**: We don't have enough real data yet to implement analytics (Phases 3-4). Built exploration utilities first to understand actual data patterns, then implement analytics based on what we find.

### ⏸️ Phase 2: Query Enhancement (DEFERRED)
- Advanced filtering (tags, time ranges, duration)
- New API endpoint for complex queries
- Pagination and sorting

### ⏸️ Phase 3: Analysis Operations (DEFERRED)
- Session analysis with metrics
- Trace analysis with event chains
- Event chain tree building

### ⏸️ Phase 4: LLM & Performance Analytics (DEFERRED)
- LLM usage analytics (tokens, latency, cost)
- Performance metrics (percentiles, slow operations)
- Error analysis (patterns, recurring errors)

---

## Core Features (Phases 1, 1.5, 2-4)

### Phase 1: Foundation ✅
- Basic query functionality
- Cache integration
- Factory pattern implementation

### Phase 1.5: Data Exploration ✅ (NEW)
- Event type discovery and statistics
- Payload schema inspection
- Session/trace exploration tools
- Field distribution analysis
- Tag discovery
- Database statistics

### Phase 2: Query Enhancement ⏸️
- Advanced filtering (tags, time ranges, duration)
- New API endpoint for complex queries
- Pagination and sorting

### Phase 3: Analysis Operations ⏸️
- Session analysis with metrics
- Trace analysis with event chains
- Event chain tree building

### Phase 4: LLM & Performance Analytics ⏸️
- LLM usage analytics (tokens, latency, cost)
- Performance metrics (percentiles, slow operations)
- Error analysis (patterns, recurring errors)

---

## File Structure

```
packages/ts_common/src/
├── types/
│   └── reflections.ts          # NEW - Type definitions
├── apis/
│   ├── reflections.ts          # NEW - ReflectionsClient implementation
│   ├── insights.ts             # EXISTING - Reference for patterns
│   ├── cache.ts                # EXISTING - Reused for caching
│   └── index.ts                # UPDATE - Add exports

apps/ts_next_app/pages/api/insights/
├── batch.ts                    # EXISTING - Write endpoint
├── query.ts                    # EXISTING - Basic read endpoint
└── query_advanced.ts           # NEW - Advanced read endpoint
```

---

## Phase 1: Foundation (Week 1)

### 1.1 Create Type Definitions

**File**: `/packages/ts_common/src/types/reflections.ts`

```typescript
import { InsightsEvent } from './insights';

// Query types
export interface QueryFilter {
  event_type?: string;
  session_id?: string;
  trace_id?: string;
  user_id?: string;
  app_name?: string;
  app_version?: string;
  tags?: string[];
  tags_all?: string[];
  parent_event_id?: string;

  timestamp_gte?: number;
  timestamp_lte?: number;
  duration_min_ms?: number;
  duration_max_ms?: number;
  has_error?: boolean;

  limit?: number;
  offset?: number;
  sort_by?: 'timestamp' | 'duration_ms' | 'event_type';
  sort_order?: 'asc' | 'desc';
}

export interface QueryResult {
  events: InsightsEvent[];
  total_count: number;
  query_time_ms: number;
  from_cache: boolean;
  server_logs?: string[];
}

// Configuration
export interface ReflectionsConfig {
  endpoint?: string;
  enable_cache?: boolean;
  cache_ttl_ms?: number;
  cache_namespace?: string;
  silent_failure?: boolean;
  verbose?: boolean;
  slow_llm_threshold_ms?: number;
  slow_operation_threshold_ms?: number;
}
```

### 1.2 Create Basic ReflectionsClient

**File**: `/packages/ts_common/src/apis/reflections.ts`

```typescript
import * as logger from "../logger";
import { is_browser } from "../util/index";
import { MemoryCache, ICache } from "./cache";
import { InsightsEvent } from "../types/insights";
import { QueryFilter, QueryResult, ReflectionsConfig } from "../types/reflections";

const log = logger.get_logger({ id: "reflections" });

export class ReflectionsClient {
  private config: Required<ReflectionsConfig>;
  private cache?: ICache<any>;
  private enabled: boolean = true;

  constructor(config: ReflectionsConfig = {}) {
    // Normalize config with defaults
    this.config = {
      endpoint: config.endpoint || "/api/insights/query",
      enable_cache: config.enable_cache !== false,
      cache_ttl_ms: config.cache_ttl_ms || 60000,
      cache_namespace: config.cache_namespace || "reflections",
      silent_failure: config.silent_failure !== undefined ? config.silent_failure : false,
      verbose: config.verbose !== undefined ? config.verbose : false,
      slow_llm_threshold_ms: config.slow_llm_threshold_ms || 5000,
      slow_operation_threshold_ms: config.slow_operation_threshold_ms || 10000,
    };

    // Initialize cache if enabled
    if (this.config.enable_cache) {
      this.cache = new MemoryCache({
        defaultTtl: this.config.cache_ttl_ms,
        namespace: this.config.cache_namespace,
        verbose: this.config.verbose,
        enableStats: true,
      });
    }

    log(`ReflectionsClient initialized`);
  }

  async queryEvents(filter: QueryFilter = {}): Promise<QueryResult> {
    if (!this.enabled) {
      return { events: [], total_count: 0, query_time_ms: 0, from_cache: false };
    }

    // Generate cache key
    const cacheKey = JSON.stringify(filter);

    // Check cache
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        log(`Cache HIT: ${cacheKey.substring(0, 50)}...`);
        return { ...cached, from_cache: true };
      }
    }

    // Execute query
    const startTime = Date.now();
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filter)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const queryTime = Date.now() - startTime;

      const result: QueryResult = {
        events: data.events || [],
        total_count: data.events?.length || 0,
        query_time_ms: queryTime,
        from_cache: false,
        server_logs: data.server_logs
      };

      // Store in cache
      if (this.cache) {
        await this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      if (this.config.silent_failure) {
        log(`Query failed (silent): ${error}`);
        return { events: [], total_count: 0, query_time_ms: 0, from_cache: false };
      }
      throw error;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getCacheStats(): any {
    return this.cache ? { enabled: true, ...this.cache.getStats() } : { enabled: false };
  }

  async invalidateCache(pattern?: string): Promise<void> {
    if (!this.cache) return;
    if (pattern) {
      const keys = await this.cache.keys();
      for (const key of keys) {
        if (key.includes(pattern)) {
          await this.cache.delete(key);
        }
      }
    } else {
      await this.cache.clear();
    }
  }
}

// Singleton pattern
let defaultClient: ReflectionsClient | null = null;

export function createClient(config?: ReflectionsConfig): ReflectionsClient {
  return new ReflectionsClient(config);
}

export function getDefaultClient(): ReflectionsClient {
  if (!defaultClient) {
    throw new Error("Default ReflectionsClient not initialized");
  }
  return defaultClient;
}

export function setDefaultClient(client: ReflectionsClient): void {
  defaultClient = client;
}

export * from "../types/reflections";
```

### 1.3 Update Exports

**File**: `/packages/ts_common/src/apis/index.ts`
```typescript
export * as reflections from "./reflections";
```

**File**: `/packages/ts_common/src/index.ts` (add to existing exports)
```typescript
export * as reflections from "./apis/reflections";
```

### 1.4 Verification
```typescript
import { createClient } from 'tidyscripts_common/apis/reflections';

const client = createClient({ enable_cache: true });
const result = await client.queryEvents({ session_id: 'ses_test' });
console.log(`Found ${result.total_count} events`);
console.log(`From cache: ${result.from_cache}`);
```

---

## Phase 1.5: Data Exploration (Week 1.5) 🔄 NEW

**Rationale**: Before implementing high-level analytics (Phases 3-4), we need exploration utilities to understand actual data patterns in our events database. We don't have enough data yet to know what patterns exist, so we'll build tools to discover them.

### 1.5.1 Add Data Exploration Types

**File**: `/packages/ts_common/src/types/reflections.ts`

Add new type definitions for exploration utilities:

```typescript
// ============================================================================
// DATA EXPLORATION TYPES (Phase 1.5)
// ============================================================================

/**
 * Event type statistics
 */
export interface EventTypeStats {
  event_type: string;
  count: number;
  first_seen: number;
  last_seen: number;
  has_duration: boolean;
  has_tags: boolean;
  sample_payload_keys: string[];
}

/**
 * Payload field information
 */
export interface PayloadFieldInfo {
  field_name: string;
  occurrences: number;
  sample_values: any[];
  value_types: string[]; // ["string", "number", etc.]
}

/**
 * Payload schema inspection result
 */
export interface PayloadSchemaInspection {
  event_type: string;
  total_events: number;
  fields: PayloadFieldInfo[];
  common_fields: string[]; // Fields present in >90% of events
  optional_fields: string[]; // Fields present in <90% of events
}

/**
 * Session inspection result
 */
export interface SessionInspection {
  session_id: string;
  event_count: number;
  event_types: Record<string, number>;
  traces: string[];
  time_range: { start: number; end: number };
  duration_ms: number;
  sample_events: InsightsEvent[];
}

/**
 * Trace inspection result
 */
export interface TraceInspection {
  trace_id: string;
  event_count: number;
  events: InsightsEvent[];
  has_root: boolean;
  root_event?: InsightsEvent;
  chain_structure: {
    depth: number;
    branches: number;
    leaf_count: number;
  };
  time_range: { start: number; end: number };
  duration_ms: number;
}

/**
 * Field distribution result
 */
export interface FieldDistribution {
  field_name: string;
  total_events_with_field: number;
  unique_values: number;
  value_counts: Record<string, number>; // Top 20 values
  sample_values: any[];
}

/**
 * Time range info for dataset
 */
export interface TimeRangeInfo {
  earliest: number;
  latest: number;
  span_ms: number;
  span_days: number;
  total_events: number;
}

/**
 * Database stats
 */
export interface DatabaseStats {
  total_events: number;
  event_types: string[];
  sessions: string[];
  traces: string[];
  apps: string[];
  users: string[];
  time_range: TimeRangeInfo;
}
```

### 1.5.2 Implement Exploration Methods in ReflectionsClient

**File**: `/packages/ts_common/src/apis/reflections.ts`

Add these methods to ReflectionsClient class:

```typescript
// ============================================================================
// DATA EXPLORATION METHODS (Phase 1.5)
// ============================================================================

/**
 * Get all unique event types in the database
 */
async getEventTypes(): Promise<string[]> {
  const result = await this.queryEvents({ limit: 10000 });
  const types = new Set(result.events.map(e => e.event_type));
  return Array.from(types).sort();
}

/**
 * Get statistics for each event type
 */
async getEventTypeStats(): Promise<EventTypeStats[]> {
  const result = await this.queryEvents({ limit: 10000 });
  const statsByType = new Map<string, EventTypeStats>();

  for (const event of result.events) {
    if (!statsByType.has(event.event_type)) {
      statsByType.set(event.event_type, {
        event_type: event.event_type,
        count: 0,
        first_seen: event.timestamp,
        last_seen: event.timestamp,
        has_duration: false,
        has_tags: false,
        sample_payload_keys: [],
      });
    }

    const stats = statsByType.get(event.event_type)!;
    stats.count++;
    stats.first_seen = Math.min(stats.first_seen, event.timestamp);
    stats.last_seen = Math.max(stats.last_seen, event.timestamp);
    if (event.duration_ms !== undefined) stats.has_duration = true;
    if (event.tags && event.tags.length > 0) stats.has_tags = true;

    // Collect payload keys from first event
    if (stats.count === 1 && event.payload) {
      stats.sample_payload_keys = Object.keys(event.payload);
    }
  }

  return Array.from(statsByType.values()).sort((a, b) => b.count - a.count);
}

/**
 * Inspect payload schema for a specific event type
 */
async inspectPayloadSchema(event_type: string): Promise<PayloadSchemaInspection> {
  const result = await this.queryEvents({ event_type, limit: 1000 });
  const fieldMap = new Map<string, PayloadFieldInfo>();

  for (const event of result.events) {
    if (!event.payload) continue;

    for (const [key, value] of Object.entries(event.payload)) {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, {
          field_name: key,
          occurrences: 0,
          sample_values: [],
          value_types: [],
        });
      }

      const fieldInfo = fieldMap.get(key)!;
      fieldInfo.occurrences++;

      // Add sample values (max 5)
      if (fieldInfo.sample_values.length < 5) {
        fieldInfo.sample_values.push(value);
      }

      // Track value types
      const valueType = typeof value;
      if (!fieldInfo.value_types.includes(valueType)) {
        fieldInfo.value_types.push(valueType);
      }
    }
  }

  const fields = Array.from(fieldMap.values());
  const commonThreshold = result.total_count * 0.9;

  return {
    event_type,
    total_events: result.total_count,
    fields,
    common_fields: fields.filter(f => f.occurrences >= commonThreshold).map(f => f.field_name),
    optional_fields: fields.filter(f => f.occurrences < commonThreshold).map(f => f.field_name),
  };
}

/**
 * Get list of all session IDs
 */
async getSessions(limit: number = 100): Promise<string[]> {
  const result = await this.queryEvents({ limit: 10000 });
  const sessions = new Set(result.events.map(e => e.session_id));
  return Array.from(sessions).slice(0, limit);
}

/**
 * Get list of all trace IDs
 */
async getTraces(limit: number = 100): Promise<string[]> {
  const result = await this.queryEvents({ limit: 10000 });
  const traces = new Set(result.events.filter(e => e.trace_id).map(e => e.trace_id!));
  return Array.from(traces).slice(0, limit);
}

/**
 * Inspect a specific session
 */
async inspectSession(session_id: string): Promise<SessionInspection> {
  const result = await this.getEventsBySession(session_id, { limit: 10000 });
  const events = result.events;

  if (events.length === 0) {
    throw new Error(`No events found for session ${session_id}`);
  }

  // Count event types
  const event_types: Record<string, number> = {};
  for (const event of events) {
    event_types[event.event_type] = (event_types[event.event_type] || 0) + 1;
  }

  // Extract traces
  const traces = [...new Set(events.filter(e => e.trace_id).map(e => e.trace_id!))];

  // Time range
  const timestamps = events.map(e => e.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);

  return {
    session_id,
    event_count: events.length,
    event_types,
    traces,
    time_range: { start, end },
    duration_ms: end - start,
    sample_events: events.slice(0, 5), // First 5 events
  };
}

/**
 * Inspect a specific trace (event chain)
 */
async inspectTrace(trace_id: string): Promise<TraceInspection> {
  const result = await this.getEventsByTrace(trace_id);
  const events = result.events;

  if (events.length === 0) {
    throw new Error(`No events found for trace ${trace_id}`);
  }

  // Find root event (no parent_event_id)
  const root_event = events.find(e => !e.parent_event_id);
  const has_root = !!root_event;

  // Calculate chain structure
  const eventMap = new Map(events.map(e => [e.event_id, e]));
  const childrenCount = new Map<string, number>();

  for (const event of events) {
    if (event.parent_event_id) {
      childrenCount.set(event.parent_event_id, (childrenCount.get(event.parent_event_id) || 0) + 1);
    }
  }

  const branches = root_event ? (childrenCount.get(root_event.event_id) || 0) : 0;
  const leaf_count = events.filter(e => !childrenCount.has(e.event_id)).length;

  // Calculate depth
  let max_depth = 0;
  for (const event of events) {
    let depth = 0;
    let current = event;
    const visited = new Set<string>();

    while (current.parent_event_id && !visited.has(current.event_id)) {
      visited.add(current.event_id);
      const parent = eventMap.get(current.parent_event_id);
      if (!parent) break;
      current = parent;
      depth++;
    }
    max_depth = Math.max(max_depth, depth);
  }

  // Time range
  const timestamps = events.map(e => e.timestamp);
  const start = Math.min(...timestamps);
  const end = Math.max(...timestamps);

  return {
    trace_id,
    event_count: events.length,
    events,
    has_root,
    root_event,
    chain_structure: {
      depth: max_depth,
      branches,
      leaf_count,
    },
    time_range: { start, end },
    duration_ms: end - start,
  };
}

/**
 * Get all unique tags used in events
 */
async getAllTags(): Promise<string[]> {
  const result = await this.queryEvents({ limit: 10000 });
  const tags = new Set<string>();

  for (const event of result.events) {
    if (event.tags) {
      event.tags.forEach(tag => tags.add(tag));
    }
  }

  return Array.from(tags).sort();
}

/**
 * Get time range of all events in database
 */
async getTimeRange(): Promise<TimeRangeInfo> {
  const result = await this.queryEvents({ limit: 10000 });

  if (result.events.length === 0) {
    return {
      earliest: 0,
      latest: 0,
      span_ms: 0,
      span_days: 0,
      total_events: 0,
    };
  }

  const timestamps = result.events.map(e => e.timestamp);
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  const span_ms = latest - earliest;
  const span_days = span_ms / (1000 * 60 * 60 * 24);

  return {
    earliest,
    latest,
    span_ms,
    span_days,
    total_events: result.total_count,
  };
}

/**
 * Get overall database statistics
 */
async getDatabaseStats(): Promise<DatabaseStats> {
  const result = await this.queryEvents({ limit: 10000 });
  const events = result.events;

  const event_types = [...new Set(events.map(e => e.event_type))];
  const sessions = [...new Set(events.map(e => e.session_id))];
  const traces = [...new Set(events.filter(e => e.trace_id).map(e => e.trace_id!))];
  const apps = [...new Set(events.map(e => e.app_name))];
  const users = [...new Set(events.map(e => e.user_id))];

  const time_range = await this.getTimeRange();

  return {
    total_events: events.length,
    event_types,
    sessions,
    traces,
    apps,
    users,
    time_range,
  };
}

/**
 * Sample events of a specific type
 */
async sampleEvents(event_type: string, limit: number = 10): Promise<InsightsEvent[]> {
  const result = await this.queryEvents({ event_type, limit });
  return result.events;
}
```

### 1.5.3 Update Examples

**File**: `/packages/ts_common/src/apis/reflections_example.ts`

Add new examples for exploration methods:

```typescript
// ============================================================================
// Example 10: Data Exploration - Event Types
// ============================================================================

export async function example10_explore_event_types() {
  console.log('\n=== Example 10: Explore Event Types ===\n');

  const client = createClient();

  // Get all event types
  const types = await client.getEventTypes();
  console.log(`Found ${types.length} event types:`, types);

  // Get detailed stats for each type
  const stats = await client.getEventTypeStats();
  console.log('\nEvent Type Statistics:');
  for (const stat of stats) {
    console.log(`  ${stat.event_type}: ${stat.count} events`);
    console.log(`    First seen: ${new Date(stat.first_seen).toISOString()}`);
    console.log(`    Last seen: ${new Date(stat.last_seen).toISOString()}`);
    console.log(`    Has duration: ${stat.has_duration}`);
    console.log(`    Has tags: ${stat.has_tags}`);
    console.log(`    Payload keys: ${stat.sample_payload_keys.join(', ')}`);
  }
}

// ============================================================================
// Example 11: Data Exploration - Payload Schema
// ============================================================================

export async function example11_inspect_payload_schema() {
  console.log('\n=== Example 11: Inspect Payload Schema ===\n');

  const client = createClient();

  // Inspect payload structure for llm_invocation events
  const schema = await client.inspectPayloadSchema('llm_invocation');

  console.log(`Event Type: ${schema.event_type}`);
  console.log(`Total Events: ${schema.total_events}`);
  console.log(`\nCommon Fields (>90%): ${schema.common_fields.join(', ')}`);
  console.log(`Optional Fields (<90%): ${schema.optional_fields.join(', ')}`);

  console.log('\nField Details:');
  for (const field of schema.fields) {
    console.log(`  ${field.field_name}:`);
    console.log(`    Occurrences: ${field.occurrences}`);
    console.log(`    Types: ${field.value_types.join(', ')}`);
    console.log(`    Sample values: ${JSON.stringify(field.sample_values.slice(0, 3))}`);
  }
}

// ============================================================================
// Example 12: Data Exploration - Sessions & Traces
// ============================================================================

export async function example12_explore_sessions_traces() {
  console.log('\n=== Example 12: Explore Sessions & Traces ===\n');

  const client = createClient();

  // Get all sessions
  const sessions = await client.getSessions(10);
  console.log(`Found ${sessions.length} sessions:`, sessions);

  // Inspect first session
  if (sessions.length > 0) {
    const sessionInspection = await client.inspectSession(sessions[0]);
    console.log(`\nSession ${sessionInspection.session_id}:`);
    console.log(`  Events: ${sessionInspection.event_count}`);
    console.log(`  Duration: ${sessionInspection.duration_ms}ms`);
    console.log(`  Event types:`, sessionInspection.event_types);
    console.log(`  Traces: ${sessionInspection.traces.length}`);
  }

  // Get all traces
  const traces = await client.getTraces(10);
  console.log(`\nFound ${traces.length} traces:`, traces);

  // Inspect first trace
  if (traces.length > 0) {
    const traceInspection = await client.inspectTrace(traces[0]);
    console.log(`\nTrace ${traceInspection.trace_id}:`);
    console.log(`  Events: ${traceInspection.event_count}`);
    console.log(`  Has root: ${traceInspection.has_root}`);
    console.log(`  Chain depth: ${traceInspection.chain_structure.depth}`);
    console.log(`  Branches: ${traceInspection.chain_structure.branches}`);
    console.log(`  Leaf count: ${traceInspection.chain_structure.leaf_count}`);
  }
}

// ============================================================================
// Example 13: Database Overview
// ============================================================================

export async function example13_database_overview() {
  console.log('\n=== Example 13: Database Overview ===\n');

  const client = createClient();

  const stats = await client.getDatabaseStats();

  console.log('Database Statistics:');
  console.log(`  Total events: ${stats.total_events}`);
  console.log(`  Event types: ${stats.event_types.length}`);
  console.log(`  Sessions: ${stats.sessions.length}`);
  console.log(`  Traces: ${stats.traces.length}`);
  console.log(`  Apps: ${stats.apps.join(', ')}`);
  console.log(`  Users: ${stats.users.length}`);
  console.log(`\nTime Range:`);
  console.log(`  Earliest: ${new Date(stats.time_range.earliest).toISOString()}`);
  console.log(`  Latest: ${new Date(stats.time_range.latest).toISOString()}`);
  console.log(`  Span: ${stats.time_range.span_days.toFixed(2)} days`);

  // Get all tags
  const tags = await client.getAllTags();
  console.log(`\nTags in use: ${tags.join(', ')}`);
}
```

### 1.5.4 Verification

Use these exploration methods to understand the data before implementing analytics:

```typescript
import { createClient } from 'tidyscripts_common/apis/reflections';

const client = createClient();

// Explore what event types exist
const types = await client.getEventTypes();
console.log('Event types:', types);

// Understand payload structure for LLM events
const llmSchema = await client.inspectPayloadSchema('llm_invocation');
console.log('LLM payload fields:', llmSchema.common_fields);

// Find interesting sessions to analyze
const sessions = await client.getSessions();
const sessionDetail = await client.inspectSession(sessions[0]);
console.log('Session events:', sessionDetail.event_types);

// Check what traces exist
const traces = await client.getTraces();
const traceDetail = await client.inspectTrace(traces[0]);
console.log('Trace structure:', traceDetail.chain_structure);

// Get database overview
const dbStats = await client.getDatabaseStats();
console.log('Database has', dbStats.total_events, 'events');
```

---

## Phase 2: Query Enhancement (Week 2) ⏸️

### 2.1 Create Advanced Query Endpoint

**File**: `/apps/ts_next_app/pages/api/insights/query_advanced.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tsn from "tidyscripts_node";

const log = tsn.common.logger.get_logger({ id: "insights-query-advanced" });

interface QueryAdvancedRequest {
  filters: {
    event_type?: string;
    session_id?: string;
    trace_id?: string;
    user_id?: string;
    app_name?: string;
    tags?: string[];
    tags_all?: string[];
    parent_event_id?: string;
    timestamp_gte?: number;
    timestamp_lte?: number;
    duration_min_ms?: number;
    duration_max_ms?: number;
  };
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const serverLogs: string[] = [];
  const logWithCapture = (msg: string) => {
    log(msg);
    serverLogs.push(`[${new Date().toISOString()}] ${msg}`);
  };

  try {
    const body: QueryAdvancedRequest = req.body;
    const filters = body.filters || {};

    // Connect to SurrealDB
    const db = await tsn.apis.surreal.connect_to_surreal({
      url: process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL || 'ws://localhost:8000/rpc',
      namespace: 'production',
      database: 'insights_events',
      auth: {
        username: process.env.SURREAL_USER || 'root',
        password: process.env.SURREAL_PASS || 'root',
      }
    });

    // Build query dynamically
    let query = 'SELECT * FROM insights_events';
    const conditions: string[] = [];
    const params: any = {};

    // Basic filters
    if (filters.event_type) {
      conditions.push('event_type = $event_type');
      params.event_type = filters.event_type;
    }
    if (filters.session_id) {
      conditions.push('session_id = $session_id');
      params.session_id = filters.session_id;
    }
    if (filters.trace_id) {
      conditions.push('trace_id = $trace_id');
      params.trace_id = filters.trace_id;
    }
    if (filters.user_id) {
      conditions.push('user_id = $user_id');
      params.user_id = filters.user_id;
    }
    if (filters.app_name) {
      conditions.push('app_name = $app_name');
      params.app_name = filters.app_name;
    }
    if (filters.parent_event_id) {
      conditions.push('parent_event_id = $parent_event_id');
      params.parent_event_id = filters.parent_event_id;
    }

    // Tag filters (OR condition)
    if (filters.tags && filters.tags.length > 0) {
      conditions.push('tags CONTAINSANY $tags');
      params.tags = filters.tags;
    }

    // Tag filters (AND condition)
    if (filters.tags_all && filters.tags_all.length > 0) {
      conditions.push('tags CONTAINSALL $tags_all');
      params.tags_all = filters.tags_all;
    }

    // Time range
    if (filters.timestamp_gte) {
      conditions.push('timestamp >= $timestamp_gte');
      params.timestamp_gte = filters.timestamp_gte;
    }
    if (filters.timestamp_lte) {
      conditions.push('timestamp <= $timestamp_lte');
      params.timestamp_lte = filters.timestamp_lte;
    }

    // Duration filters
    if (filters.duration_min_ms) {
      conditions.push('duration_ms >= $duration_min_ms');
      params.duration_min_ms = filters.duration_min_ms;
    }
    if (filters.duration_max_ms) {
      conditions.push('duration_ms <= $duration_max_ms');
      params.duration_max_ms = filters.duration_max_ms;
    }

    // Build WHERE clause
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    const sortBy = body.sort_by || 'timestamp';
    const sortOrder = body.sort_order?.toUpperCase() || 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Add pagination
    if (body.offset) {
      query += ` START ${body.offset}`;
    }
    query += ` LIMIT ${body.limit || 50}`;

    logWithCapture(`Executing query: ${query}`);
    logWithCapture(`Params: ${JSON.stringify(params)}`);

    const result = await db.query(query, params);
    const events = result[0] || [];

    logWithCapture(`Found ${events.length} events`);

    res.status(200).json({
      success: true,
      events,
      total_count: events.length,
      server_logs: serverLogs
    });

  } catch (error: any) {
    logWithCapture(`Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      server_logs: serverLogs
    });
  }
}
```

### 2.2 Add Convenience Query Methods

Add to `ReflectionsClient` class:

```typescript
async getEventsBySession(
  session_id: string,
  options: { limit?: number } = {}
): Promise<QueryResult> {
  return this.queryEvents({
    session_id,
    limit: options.limit,
    sort_by: 'timestamp',
    sort_order: 'asc'
  });
}

async getEventsByTrace(trace_id: string): Promise<QueryResult> {
  return this.queryEvents({
    trace_id,
    sort_by: 'timestamp',
    sort_order: 'asc'
  });
}

async getEventsByType(
  event_type: string,
  options: { limit?: number; session_id?: string } = {}
): Promise<QueryResult> {
  return this.queryEvents({
    event_type,
    session_id: options.session_id,
    limit: options.limit
  });
}

async getEventById(event_id: string): Promise<InsightsEvent | null> {
  // Query by event_id (need to add this filter to query_advanced)
  const result = await this.queryEvents({ limit: 1 });
  const event = result.events.find(e => e.event_id === event_id);
  return event || null;
}
```

### 2.3 Update ReflectionsClient to Use Advanced Endpoint

Update `endpoint` default to:
```typescript
endpoint: config.endpoint || "/api/insights/query_advanced"
```

### 2.4 Verification
```typescript
// Test advanced filters
const result = await client.queryEvents({
  event_type: 'llm_invocation',
  tags: ['error'],
  timestamp_gte: Date.now() - 86400000, // Last 24h
  duration_min_ms: 5000, // Slow operations
  limit: 100
});

console.log(`Found ${result.total_count} slow LLM errors in last 24h`);
```

---

## Phase 3: Analysis Operations (Week 3)

### 3.1 Add Analysis Types

Add to `/packages/ts_common/src/types/reflections.ts`:

```typescript
export interface SessionAnalysis {
  session_id: string;
  start_time: number;
  end_time: number;
  duration_ms: number;
  total_events: number;
  event_types: Record<string, number>;
  traces: string[];
  trace_count: number;
  llm_invocations: number;
  total_tokens: number;
  avg_llm_latency_ms?: number;
  slow_operations: number;
  error_count: number;
  error_types: Record<string, number>;
  max_chain_depth: number;
  avg_chain_depth: number;
  user_inputs: number;
  executions: number;
}

export interface TraceAnalysis {
  trace_id: string;
  start_time: number;
  end_time: number;
  duration_ms: number;
  root_event: InsightsEvent;
  event_count: number;
  event_chain: InsightsEvent[];
  chain_depth: number;
  llm_invocations: number;
  total_tokens: number;
  total_latency_ms: number;
  has_errors: boolean;
  error_events: InsightsEvent[];
  bottleneck_events: InsightsEvent[];
}

export interface EventChainNode {
  event: InsightsEvent;
  children: EventChainNode[];
  depth: number;
}
```

### 3.2 Implement Analysis Methods

Add to `ReflectionsClient`:

```typescript
async analyzeSession(session_id: string): Promise<SessionAnalysis> {
  // Fetch all session events
  const result = await this.getEventsBySession(session_id, { limit: 10000 });
  const events = result.events;

  if (events.length === 0) {
    throw new Error(`No events found for session ${session_id}`);
  }

  // Calculate time range
  const timestamps = events.map(e => e.timestamp);
  const start_time = Math.min(...timestamps);
  const end_time = Math.max(...timestamps);

  // Count event types
  const event_types: Record<string, number> = {};
  for (const event of events) {
    event_types[event.event_type] = (event_types[event.event_type] || 0) + 1;
  }

  // Extract unique traces
  const traces = [...new Set(events.filter(e => e.trace_id).map(e => e.trace_id!))];

  // LLM metrics
  const llmEvents = events.filter(e => e.event_type === 'llm_invocation');
  const total_tokens = llmEvents.reduce((sum, e) => {
    return sum + (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0);
  }, 0);
  const avg_llm_latency = llmEvents.length > 0
    ? llmEvents.reduce((sum, e) => sum + (e.payload.latency_ms || 0), 0) / llmEvents.length
    : undefined;

  // Error analysis
  const errorEvents = events.filter(e => e.tags?.includes('error'));
  const error_types: Record<string, number> = {};
  for (const event of errorEvents) {
    const type = event.event_type;
    error_types[type] = (error_types[type] || 0) + 1;
  }

  // Chain depth analysis
  const traceDepths: number[] = [];
  for (const trace_id of traces) {
    const traceEvents = events.filter(e => e.trace_id === trace_id);
    const depth = this.calculateChainDepth(traceEvents);
    traceDepths.push(depth);
  }
  const max_chain_depth = traceDepths.length > 0 ? Math.max(...traceDepths) : 0;
  const avg_chain_depth = traceDepths.length > 0
    ? traceDepths.reduce((a, b) => a + b, 0) / traceDepths.length
    : 0;

  return {
    session_id,
    start_time,
    end_time,
    duration_ms: end_time - start_time,
    total_events: events.length,
    event_types,
    traces,
    trace_count: traces.length,
    llm_invocations: llmEvents.length,
    total_tokens,
    avg_llm_latency_ms: avg_llm_latency,
    slow_operations: events.filter(e => e.tags?.includes('slow')).length,
    error_count: errorEvents.length,
    error_types,
    max_chain_depth,
    avg_chain_depth,
    user_inputs: event_types['user_input'] || 0,
    executions: event_types['execution'] || 0,
  };
}

async analyzeTrace(trace_id: string): Promise<TraceAnalysis> {
  // Fetch trace events
  const result = await this.getEventsByTrace(trace_id);
  const events = result.events;

  if (events.length === 0) {
    throw new Error(`No events found for trace ${trace_id}`);
  }

  // Find root event
  const root_event = events.find(e => !e.parent_event_id) || events[0];

  // Build event chain
  const event_chain = this.buildOrderedChain(events);
  const chain_depth = this.calculateChainDepth(events);

  // Time range
  const timestamps = events.map(e => e.timestamp);
  const start_time = Math.min(...timestamps);
  const end_time = Math.max(...timestamps);

  // LLM metrics
  const llmEvents = events.filter(e => e.event_type === 'llm_invocation');
  const total_tokens = llmEvents.reduce((sum, e) => {
    return sum + (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0);
  }, 0);
  const total_latency = llmEvents.reduce((sum, e) => sum + (e.payload.latency_ms || 0), 0);

  // Error analysis
  const error_events = events.filter(e => e.tags?.includes('error'));

  // Find bottlenecks (top 3 slowest)
  const eventsWithDuration = events.filter(e => e.duration_ms);
  eventsWithDuration.sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0));
  const bottleneck_events = eventsWithDuration.slice(0, 3);

  return {
    trace_id,
    start_time,
    end_time,
    duration_ms: end_time - start_time,
    root_event,
    event_count: events.length,
    event_chain,
    chain_depth,
    llm_invocations: llmEvents.length,
    total_tokens,
    total_latency_ms: total_latency,
    has_errors: error_events.length > 0,
    error_events,
    bottleneck_events,
  };
}

// Helper: Calculate chain depth
private calculateChainDepth(events: InsightsEvent[]): number {
  const eventMap = new Map(events.map(e => [e.event_id, e]));
  let maxDepth = 0;

  for (const event of events) {
    let depth = 0;
    let current = event;
    const visited = new Set<string>();

    while (current.parent_event_id && !visited.has(current.event_id)) {
      visited.add(current.event_id);
      current = eventMap.get(current.parent_event_id)!;
      if (current) depth++;
      else break;
    }

    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}

// Helper: Build ordered chain
private buildOrderedChain(events: InsightsEvent[]): InsightsEvent[] {
  // Find root
  const root = events.find(e => !e.parent_event_id) || events[0];
  const result: InsightsEvent[] = [root];
  const eventMap = new Map(events.map(e => [e.event_id, e]));

  let current = root;
  while (current) {
    const child = events.find(e => e.parent_event_id === current.event_id);
    if (child && !result.includes(child)) {
      result.push(child);
      current = child;
    } else {
      break;
    }
  }

  return result;
}
```

### 3.3 Verification
```typescript
// Test session analysis
const analysis = await client.analyzeSession('ses_abc123');
console.log(`Session duration: ${analysis.duration_ms}ms`);
console.log(`Total events: ${analysis.total_events}`);
console.log(`LLM invocations: ${analysis.llm_invocations}`);
console.log(`Total tokens: ${analysis.total_tokens}`);

// Test trace analysis
const trace = await client.analyzeTrace('trc_xyz789');
console.log(`Trace duration: ${trace.duration_ms}ms`);
console.log(`Chain depth: ${trace.chain_depth}`);
console.log(`Has errors: ${trace.has_errors}`);
```

---

## Phase 4: LLM & Performance Analytics (Week 4)

### 4.1 Add Analytics Types

Add to `/packages/ts_common/src/types/reflections.ts`:

```typescript
export interface LLMAnalytics {
  time_range: { start: number; end: number };
  total_invocations: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  avg_latency_ms: number;
  median_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  by_model: Record<string, {
    invocations: number;
    tokens: number;
    avg_latency_ms: number;
    error_rate: number;
  }>;
  by_provider: Record<string, {
    invocations: number;
    tokens: number;
    avg_latency_ms: number;
  }>;
  error_count: number;
  error_rate: number;
  slow_invocations: number;
  slow_rate: number;
}

export interface PerformanceMetrics {
  time_range: { start: number; end: number };
  total_operations: number;
  avg_duration_ms: number;
  median_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  slow_operations: InsightsEvent[];
  slow_rate: number;
  by_event_type: Record<string, {
    count: number;
    avg_duration_ms: number;
    p95_duration_ms: number;
    error_rate: number;
  }>;
  total_errors: number;
  error_rate: number;
}

export interface ErrorAnalysis {
  time_range: { start: number; end: number };
  total_errors: number;
  error_rate: number;
  by_event_type: Record<string, number>;
  recent_errors: InsightsEvent[];
}
```

### 4.2 Implement Analytics Methods

Add to `ReflectionsClient`:

```typescript
async analyzeLLMUsage(
  time_range: { start: number; end: number },
  filter?: Partial<QueryFilter>
): Promise<LLMAnalytics> {
  // Query LLM invocation events
  const result = await this.queryEvents({
    ...filter,
    event_type: 'llm_invocation',
    timestamp_gte: time_range.start,
    timestamp_lte: time_range.end,
    limit: 10000
  });

  const events = result.events;

  if (events.length === 0) {
    return this.emptyLLMAnalytics(time_range);
  }

  // Aggregate tokens
  let total_prompt_tokens = 0;
  let total_completion_tokens = 0;
  for (const event of events) {
    total_prompt_tokens += event.payload.prompt_tokens || 0;
    total_completion_tokens += event.payload.completion_tokens || 0;
  }
  const total_tokens = total_prompt_tokens + total_completion_tokens;

  // Calculate latency metrics
  const latencies = events
    .map(e => e.payload.latency_ms)
    .filter(l => l !== undefined)
    .sort((a, b) => a - b);

  const avg_latency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const median_latency = this.calculatePercentile(latencies, 0.5);
  const p95_latency = this.calculatePercentile(latencies, 0.95);
  const p99_latency = this.calculatePercentile(latencies, 0.99);

  // Breakdown by model
  const by_model: Record<string, any> = {};
  for (const event of events) {
    const model = event.payload.model || 'unknown';
    if (!by_model[model]) {
      by_model[model] = {
        invocations: 0,
        tokens: 0,
        latencies: [],
        errors: 0
      };
    }
    by_model[model].invocations++;
    by_model[model].tokens += (event.payload.prompt_tokens || 0) + (event.payload.completion_tokens || 0);
    if (event.payload.latency_ms) {
      by_model[model].latencies.push(event.payload.latency_ms);
    }
    if (event.tags?.includes('error')) {
      by_model[model].errors++;
    }
  }

  // Calculate avg and error rate for each model
  for (const model in by_model) {
    const data = by_model[model];
    data.avg_latency_ms = data.latencies.length > 0
      ? data.latencies.reduce((a: number, b: number) => a + b, 0) / data.latencies.length
      : 0;
    data.error_rate = data.invocations > 0 ? data.errors / data.invocations : 0;
    delete data.latencies;
    delete data.errors;
  }

  // Breakdown by provider
  const by_provider: Record<string, any> = {};
  for (const event of events) {
    const provider = event.payload.provider || 'unknown';
    if (!by_provider[provider]) {
      by_provider[provider] = {
        invocations: 0,
        tokens: 0,
        latencies: []
      };
    }
    by_provider[provider].invocations++;
    by_provider[provider].tokens += (event.payload.prompt_tokens || 0) + (event.payload.completion_tokens || 0);
    if (event.payload.latency_ms) {
      by_provider[provider].latencies.push(event.payload.latency_ms);
    }
  }

  for (const provider in by_provider) {
    const data = by_provider[provider];
    data.avg_latency_ms = data.latencies.length > 0
      ? data.latencies.reduce((a: number, b: number) => a + b, 0) / data.latencies.length
      : 0;
    delete data.latencies;
  }

  // Error analysis
  const error_count = events.filter(e => e.tags?.includes('error')).length;
  const error_rate = events.length > 0 ? error_count / events.length : 0;

  // Slow operations
  const slow_threshold = this.config.slow_llm_threshold_ms;
  const slow_invocations = events.filter(e => (e.payload.latency_ms || 0) > slow_threshold).length;
  const slow_rate = events.length > 0 ? slow_invocations / events.length : 0;

  // Estimate cost (simplified - $0.01 per 1K tokens as baseline)
  const estimated_cost_usd = (total_tokens / 1000) * 0.01;

  return {
    time_range,
    total_invocations: events.length,
    total_prompt_tokens,
    total_completion_tokens,
    total_tokens,
    estimated_cost_usd,
    avg_latency_ms: avg_latency,
    median_latency_ms: median_latency,
    p95_latency_ms: p95_latency,
    p99_latency_ms: p99_latency,
    by_model,
    by_provider,
    error_count,
    error_rate,
    slow_invocations,
    slow_rate
  };
}

async analyzePerformance(
  time_range: { start: number; end: number },
  filter?: Partial<QueryFilter>
): Promise<PerformanceMetrics> {
  // Query events with duration
  const result = await this.queryEvents({
    ...filter,
    timestamp_gte: time_range.start,
    timestamp_lte: time_range.end,
    limit: 10000
  });

  const events = result.events.filter(e => e.duration_ms !== undefined);

  if (events.length === 0) {
    return this.emptyPerformanceMetrics(time_range);
  }

  // Calculate duration metrics
  const durations = events.map(e => e.duration_ms!).sort((a, b) => a - b);
  const avg_duration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const median_duration = this.calculatePercentile(durations, 0.5);
  const p95_duration = this.calculatePercentile(durations, 0.95);
  const p99_duration = this.calculatePercentile(durations, 0.99);

  // Slow operations
  const slow_threshold = this.config.slow_operation_threshold_ms;
  const slow_operations = events.filter(e => e.duration_ms! > slow_threshold);
  const slow_rate = events.length > 0 ? slow_operations.length / events.length : 0;

  // Breakdown by event type
  const by_event_type: Record<string, any> = {};
  for (const event of events) {
    const type = event.event_type;
    if (!by_event_type[type]) {
      by_event_type[type] = {
        count: 0,
        durations: [],
        errors: 0
      };
    }
    by_event_type[type].count++;
    by_event_type[type].durations.push(event.duration_ms!);
    if (event.tags?.includes('error')) {
      by_event_type[type].errors++;
    }
  }

  for (const type in by_event_type) {
    const data = by_event_type[type];
    const sortedDurations = data.durations.sort((a: number, b: number) => a - b);
    data.avg_duration_ms = sortedDurations.reduce((a: number, b: number) => a + b, 0) / sortedDurations.length;
    data.p95_duration_ms = this.calculatePercentile(sortedDurations, 0.95);
    data.error_rate = data.count > 0 ? data.errors / data.count : 0;
    delete data.durations;
    delete data.errors;
  }

  // Error analysis
  const total_errors = result.events.filter(e => e.tags?.includes('error')).length;
  const error_rate = result.events.length > 0 ? total_errors / result.events.length : 0;

  return {
    time_range,
    total_operations: events.length,
    avg_duration_ms: avg_duration,
    median_duration_ms: median_duration,
    p95_duration_ms: p95_duration,
    p99_duration_ms: p99_duration,
    slow_operations,
    slow_rate,
    by_event_type,
    total_errors,
    error_rate
  };
}

async analyzeErrors(
  time_range: { start: number; end: number },
  filter?: Partial<QueryFilter>
): Promise<ErrorAnalysis> {
  // Query events with error tag
  const result = await this.queryEvents({
    ...filter,
    tags: ['error'],
    timestamp_gte: time_range.start,
    timestamp_lte: time_range.end,
    limit: 10000
  });

  const error_events = result.events;
  const total_errors = error_events.length;

  // Get total events for error rate
  const totalResult = await this.queryEvents({
    ...filter,
    timestamp_gte: time_range.start,
    timestamp_lte: time_range.end,
    limit: 1
  });
  const error_rate = totalResult.total_count > 0 ? total_errors / totalResult.total_count : 0;

  // Breakdown by event type
  const by_event_type: Record<string, number> = {};
  for (const event of error_events) {
    by_event_type[event.event_type] = (by_event_type[event.event_type] || 0) + 1;
  }

  // Get recent errors (last 10)
  const recent_errors = error_events
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return {
    time_range,
    total_errors,
    error_rate,
    by_event_type,
    recent_errors
  };
}

// Helper: Calculate percentile
private calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(sorted.length * percentile) - 1;
  return sorted[Math.max(0, index)];
}

// Helpers for empty results
private emptyLLMAnalytics(time_range: { start: number; end: number }): LLMAnalytics {
  return {
    time_range,
    total_invocations: 0,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
    avg_latency_ms: 0,
    median_latency_ms: 0,
    p95_latency_ms: 0,
    p99_latency_ms: 0,
    by_model: {},
    by_provider: {},
    error_count: 0,
    error_rate: 0,
    slow_invocations: 0,
    slow_rate: 0
  };
}

private emptyPerformanceMetrics(time_range: { start: number; end: number }): PerformanceMetrics {
  return {
    time_range,
    total_operations: 0,
    avg_duration_ms: 0,
    median_duration_ms: 0,
    p95_duration_ms: 0,
    p99_duration_ms: 0,
    slow_operations: [],
    slow_rate: 0,
    by_event_type: {},
    total_errors: 0,
    error_rate: 0
  };
}
```

### 4.3 Verification
```typescript
// Test LLM analytics
const now = Date.now();
const yesterday = now - 86400000;

const llmAnalytics = await client.analyzeLLMUsage(
  { start: yesterday, end: now },
  { app_name: 'cortex' }
);

console.log(`Total LLM calls: ${llmAnalytics.total_invocations}`);
console.log(`Total tokens: ${llmAnalytics.total_tokens}`);
console.log(`Estimated cost: $${llmAnalytics.estimated_cost_usd.toFixed(2)}`);
console.log(`P95 latency: ${llmAnalytics.p95_latency_ms}ms`);
console.log(`Error rate: ${(llmAnalytics.error_rate * 100).toFixed(2)}%`);

// Test performance analytics
const perfMetrics = await client.analyzePerformance(
  { start: yesterday, end: now }
);

console.log(`Total operations: ${perfMetrics.total_operations}`);
console.log(`P95 duration: ${perfMetrics.p95_duration_ms}ms`);
console.log(`Slow operations: ${perfMetrics.slow_operations.length}`);

// Test error analysis
const errorAnalysis = await client.analyzeErrors(
  { start: yesterday, end: now }
);

console.log(`Total errors: ${errorAnalysis.total_errors}`);
console.log(`Error rate: ${(errorAnalysis.error_rate * 100).toFixed(2)}%`);
console.log(`Top error types:`, Object.entries(errorAnalysis.by_event_type)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5));
```

---

## Integration with InsightsClient

### Complementary Usage Pattern

```typescript
import { createClient as createInsightsClient } from 'tidyscripts_common/apis/insights';
import { createClient as createReflectionsClient } from 'tidyscripts_common/apis/reflections';

// Write events (InsightsClient)
const insights = createInsightsClient({
  app_name: 'my_app',
  app_version: '1.0.0',
  user_id: 'user_123'
});

await insights.addUserInput({ input_mode: 'voice', input_length: 100 });
await insights.addLLMInvocation({
  model: 'gpt-4',
  provider: 'openai',
  prompt_tokens: 500,
  completion_tokens: 300,
  latency_ms: 1200,
  status: 'success'
});

// Query and analyze (ReflectionsClient)
const reflections = createReflectionsClient({
  enable_cache: true,
  verbose: true
});

const session_id = insights.getSessionId();
const analysis = await reflections.analyzeSession(session_id);

console.log(`Session: ${analysis.total_events} events, ${analysis.llm_invocations} LLM calls`);
```

---

## Critical Files Summary

**New Files to Create:**
1. `/packages/ts_common/src/types/reflections.ts` - All type definitions
2. `/packages/ts_common/src/apis/reflections.ts` - ReflectionsClient class
3. `/apps/ts_next_app/pages/api/insights/query_advanced.ts` - Enhanced query endpoint

**Files to Update:**
1. `/packages/ts_common/src/apis/index.ts` - Add reflections export
2. `/packages/ts_common/src/index.ts` - Add reflections to main exports

**Reference Files:**
1. `/packages/ts_common/src/apis/insights.ts` - Pattern reference
2. `/packages/ts_common/src/apis/cache.ts` - Cache utilities
3. `/apps/ts_next_app/pages/api/insights/query.ts` - Query endpoint pattern

---

## Testing Strategy

### Unit Tests
```typescript
describe('ReflectionsClient', () => {
  it('should query events with filters');
  it('should cache query results');
  it('should analyze sessions correctly');
  it('should analyze traces and build event chains');
  it('should calculate LLM analytics with percentiles');
  it('should identify slow operations');
  it('should handle errors gracefully in silent mode');
});
```

### Integration Tests
- Test with real SurrealDB data
- Test cache hit/miss scenarios
- Test concurrent queries
- Test with large datasets (10k+ events)

### Manual Verification Checklist
- [ ] Query events by session_id
- [ ] Query events with tags filter
- [ ] Query events with time range
- [ ] Analyze session with LLM invocations
- [ ] Analyze trace with event chain
- [ ] Calculate LLM token usage and costs
- [ ] Identify slow operations correctly
- [ ] Error analysis groups errors correctly
- [ ] Cache invalidation works
- [ ] Silent failure mode works

---

## Success Criteria

**Phase 1:**
- ✅ Can create ReflectionsClient instance
- ✅ Can query events with basic filters
- ✅ Cache is working (hit/miss detection)

**Phase 2:**
- ✅ Advanced filters work (tags, time range, duration)
- ✅ Pagination and sorting work
- ✅ Convenience methods work (getEventsBySession, etc.)

**Phase 3:**
- ✅ Session analysis calculates correct metrics
- ✅ Trace analysis builds correct event chains
- ✅ Chain depth calculation is accurate

**Phase 4:**
- ✅ LLM analytics shows correct token usage and costs
- ✅ Percentile calculations are accurate (p50, p95, p99)
- ✅ Performance metrics identify slow operations
- ✅ Error analysis groups errors correctly

---

## Next Steps After Core Implementation

**Optional Future Enhancements (not in core scope):**
- Aggregation methods (getEventTypeCounts, getTimeSeriesData)
- Export functionality (JSON, CSV, Markdown)
- Demo application in laboratory
- Real-time monitoring with WebSocket support
- Advanced visualizations (charts, graphs)

---

## Meditation App Integration ✅ COMPLETE

### Status: ✅ Fully Integrated

The ReflectionsClient has been fully integrated into the meditation app with comprehensive testing and exploration capabilities.

### Components Created

**1. ReflectionsStateView** (`components/ReflectionsStateView.tsx`)
- Live cache metrics display (hits, misses, total queries, hit rate)
- Cache TTL information
- Clear cache button
- Cache invalidation pattern input
- Polled every 200ms (matches existing meditation app pattern)

**2. ReflectionsExplorer** (`components/ReflectionsExplorer.tsx`)
- Interactive testing UI for all 19 ReflectionsClient methods
- Organized into 3 sections:
  - Core Query Methods (5)
  - Exploration & Discovery Methods (11)
  - Cache Management (3)
- Uses MethodExecutor for each method
- Custom result renderers for complex data types

**3. MethodExecutor** (`components/MethodExecutor.tsx`)
- Reusable component for executing any ReflectionsClient method
- Dynamic parameter form generation
- Loading states and error handling
- Execution timing display
- Cache hit indicator
- Expandable/collapsible UI

**4. ReflectionsTestSuite** (`components/ReflectionsTestSuite.tsx`)
- Autonomous test suite (mirrors DatabaseTestSuite pattern)
- Validates all 19 methods automatically
- Progress tracking and result display
- Sequential test execution
- Pass/fail status with timing

**5. Visualization Components** (`components/visualizations/`)
- **EventTypeStatsView.tsx** - Sortable table for EventTypeStats[]
- **PayloadSchemaView.tsx** - Display PayloadSchemaInspection with field details
- **TraceInspectionView.tsx** - Visual event chain tree with parent-child relationships
- **SessionInspectionView.tsx** - Session breakdown with event type charts
- **DatabaseStatsView.tsx** - Dashboard-style database overview

**6. Test Scenarios** (`lib/reflectionsTestScenarios.ts`)
- Test definitions for all 19 methods
- Validation logic and assertions
- Follows existing testScenarios.ts pattern

### Integration Points

**Modified Files:**
1. **page.tsx** - Added:
   - ReflectionsStateView (persistent, between ClientStateView and DatabaseTestSuite)
   - ReflectionsTestSuite (persistent, after DatabaseTestSuite)
   - "Reflections Explorer" tab in navigation
   - Tab content for ReflectionsExplorer
   - Cache management handlers (handleClearCache, handleInvalidatePattern)

### Testing Approach

**Interactive Testing (19 methods):**
1. queryEvents - Flexible filtering
2. getEventsBySession - Session-specific events
3. getEventsByTrace - Trace-specific events
4. getEventsByType - Type-specific events
5. getEventById - Single event retrieval
6. getEventTypes - List all types
7. getEventTypeStats - Statistics per type
8. inspectPayloadSchema - Schema analysis
9. getSessions - List session IDs
10. getTraces - List trace IDs
11. inspectSession - Session details
12. inspectTrace - Trace chain analysis
13. getAllTags - List all tags
14. getTimeRange - Time range info
15. getDatabaseStats - Database overview
16. sampleEvents - Random event sampling
17. getCacheStats - Cache performance
18. clearCache - Clear all cache
19. invalidateCache - Pattern-based invalidation

**Autonomous Testing:**
- ReflectionsTestSuite runs all 19 tests sequentially
- Each test validates result structure and data integrity
- Progress tracking and pass/fail indicators
- Timing information for each test

**Cache Verification:**
- First query: cache miss
- Second query: cache hit (faster execution)
- Cache metrics update in real-time (200ms polling)
- Clear cache functionality validated

### Usage Workflow

1. **Generate Test Data:**
   - Use Event Generator to create events
   - Run DatabaseTestSuite to populate database
   - Events are now queryable via ReflectionsClient

2. **Explore Data:**
   - Click "Reflections Explorer" tab
   - Expand any method section
   - Fill in parameters (defaults provided)
   - Click "Execute" to run query
   - View results (JSON or custom visualization)

3. **Test All Methods:**
   - Click "Run All Tests" in ReflectionsTestSuite
   - Watch 19 tests execute sequentially
   - View pass/fail results with timing
   - Verify all methods work correctly

4. **Monitor Cache:**
   - ReflectionsStateView shows live metrics
   - Hit rate increases with repeated queries
   - Clear cache to reset metrics
   - Invalidate specific patterns as needed

### Files Created (9 total)

**Components (7):**
- `apps/ts_next_app/app/laboratory/meditation/components/ReflectionsStateView.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/ReflectionsExplorer.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/MethodExecutor.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/ReflectionsTestSuite.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/visualizations/EventTypeStatsView.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/visualizations/PayloadSchemaView.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/visualizations/TraceInspectionView.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/visualizations/SessionInspectionView.tsx`
- `apps/ts_next_app/app/laboratory/meditation/components/visualizations/DatabaseStatsView.tsx`

**Library (1):**
- `apps/ts_next_app/app/laboratory/meditation/lib/reflectionsTestScenarios.ts`

**Modified (1):**
- `apps/ts_next_app/app/laboratory/meditation/page.tsx`

### Key Achievements

- ✅ Complete UI for testing all 19 ReflectionsClient methods
- ✅ Interactive parameter forms with validation
- ✅ Custom visualizations for complex data types
- ✅ Autonomous test suite (100% method coverage)
- ✅ Real-time cache metrics monitoring
- ✅ Follows meditation app patterns (tabs, polling, autonomous tests)
- ✅ Ready to explore real event data
- ✅ Provides foundation for future analytics development

### Next Steps

With the meditation app integration complete, we can now:
1. Generate real event data using the Event Generator
2. Explore data patterns using the 11 exploration methods
3. Use insights to guide Phase 2-4 analytics implementation
4. Build dashboards and visualizations based on actual usage patterns

---

## Notes

- **CQRS Pattern**: Clean separation between write (InsightsClient) and read (ReflectionsClient)
- **Cache Strategy**: Aggressive caching with short TTL for performance
- **Silent Failure**: Optional graceful degradation to match InsightsClient pattern
- **Consistency**: Mirrors InsightsClient patterns for familiarity
- **Performance**: Leverages existing cache utilities and SurrealDB indexes
- **Meditation App**: Complete testing/exploration infrastructure for all 19 methods
