/**
 * ReflectionsClient Type Definitions
 *
 * Query and analysis types for the Insights event system.
 * Extends InsightsEvent types with analytical interfaces.
 */

import { InsightsEvent } from './insights';

// ============================================================================
// QUERY TYPES
// ============================================================================

/**
 * Query filter options for events
 */
export interface QueryFilter {
  event_type?: string;
  session_id?: string;
  trace_id?: string;
  user_id?: string;
  app_name?: string;
  app_version?: string;
  tags?: string[];           // Events with ANY of these tags
  tags_all?: string[];       // Events with ALL of these tags
  parent_event_id?: string;

  // Time range
  timestamp_gte?: number;    // Greater than or equal
  timestamp_lte?: number;    // Less than or equal

  // Advanced filters
  duration_min_ms?: number;
  duration_max_ms?: number;
  has_error?: boolean;       // Filter by error tag or error in payload

  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  sort_by?: 'timestamp' | 'duration_ms' | 'event_type';
  sort_order?: 'asc' | 'desc';
}

/**
 * Query result with metadata
 */
export interface QueryResult {
  events: InsightsEvent[];
  total_count: number;
  query_time_ms: number;
  from_cache: boolean;
  server_logs?: string[];
}

// ============================================================================
// ANALYSIS TYPES (Phase 3)
// ============================================================================

/**
 * Session analysis result
 */
export interface SessionAnalysis {
  session_id: string;
  start_time: number;
  end_time: number;
  duration_ms: number;

  // Event statistics
  total_events: number;
  event_types: Record<string, number>;

  // Trace information
  traces: string[];
  trace_count: number;

  // LLM usage
  llm_invocations: number;
  total_tokens: number;
  total_cost_estimate?: number;

  // Performance
  avg_llm_latency_ms?: number;
  slow_operations: number;  // Events with 'slow' tag

  // Errors
  error_count: number;
  error_types: Record<string, number>;

  // Event chain depth
  max_chain_depth: number;
  avg_chain_depth: number;

  // User interaction
  user_inputs: number;
  executions: number;
}

/**
 * Trace analysis result
 */
export interface TraceAnalysis {
  trace_id: string;
  start_time: number;
  end_time: number;
  duration_ms: number;

  // Event chain
  root_event: InsightsEvent;
  event_count: number;
  event_chain: InsightsEvent[]; // Ordered by parent-child relationships
  chain_depth: number;

  // LLM usage in this trace
  llm_invocations: number;
  total_tokens: number;
  total_latency_ms: number;

  // Status
  has_errors: boolean;
  error_events: InsightsEvent[];

  // Performance
  bottleneck_events: InsightsEvent[]; // Slowest operations
}

/**
 * Event chain node (for building tree structures)
 */
export interface EventChainNode {
  event: InsightsEvent;
  children: EventChainNode[];
  depth: number;
}

// ============================================================================
// LLM & PERFORMANCE ANALYTICS TYPES (Phase 4)
// ============================================================================

/**
 * LLM usage analytics
 */
export interface LLMAnalytics {
  time_range: { start: number; end: number };

  // Aggregates
  total_invocations: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;

  // Cost estimation (assuming GPT-4 pricing as baseline)
  estimated_cost_usd: number;

  // Performance
  avg_latency_ms: number;
  median_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;

  // Breakdown by model
  by_model: Record<string, {
    invocations: number;
    tokens: number;
    avg_latency_ms: number;
    error_rate: number;
  }>;

  // Breakdown by provider
  by_provider: Record<string, {
    invocations: number;
    tokens: number;
    avg_latency_ms: number;
  }>;

  // Error analysis
  error_count: number;
  error_rate: number;

  // Slow queries
  slow_invocations: number; // > threshold
  slow_rate: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  time_range: { start: number; end: number };

  // Overall metrics
  total_operations: number;
  avg_duration_ms: number;
  median_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;

  // Slow operations (> threshold)
  slow_operations: InsightsEvent[];
  slow_rate: number;

  // By operation type
  by_event_type: Record<string, {
    count: number;
    avg_duration_ms: number;
    p95_duration_ms: number;
    error_rate: number;
  }>;

  // Error rates
  total_errors: number;
  error_rate: number;
}

/**
 * Error analysis
 */
export interface ErrorAnalysis {
  time_range: { start: number; end: number };

  // Overall error stats
  total_errors: number;
  error_rate: number;

  // Error breakdown
  by_event_type: Record<string, number>;

  // Recent errors
  recent_errors: InsightsEvent[];
}

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
    branches: number; // How many children the root has
    leaf_count: number; // Events with no children
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

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for ReflectionsClient
 */
export interface ReflectionsConfig {
  endpoint?: string;                    // Default: '/api/insights/query'
  enable_cache?: boolean;               // Default: true
  cache_ttl_ms?: number;               // Default: 60000 (1 minute)
  cache_namespace?: string;            // Default: 'reflections'
  silent_failure?: boolean;            // Default: false
  verbose?: boolean;                   // Default: false

  // Performance thresholds
  slow_llm_threshold_ms?: number;      // Default: 5000
  slow_operation_threshold_ms?: number; // Default: 10000
}
