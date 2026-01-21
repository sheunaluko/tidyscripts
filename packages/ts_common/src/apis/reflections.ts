/**
 * ReflectionsClient - Query and analysis system for Insights events
 *
 * Provides read-side operations for the Insights event tracking system.
 * Complements InsightsClient (write-side) in a CQRS architecture.
 */

import * as logger from "../logger";
import { is_browser } from "../util/index";
import { MemoryCache, ICache } from "./cache";
import { InsightsEvent } from "../types/insights";
import {
  QueryFilter,
  QueryResult,
  SessionAnalysis,
  TraceAnalysis,
  LLMAnalytics,
  PerformanceMetrics,
  ErrorAnalysis,
  ReflectionsConfig,
  EventTypeStats,
  PayloadSchemaInspection,
  PayloadFieldInfo,
  SessionInspection,
  TraceInspection,
  TimeRangeInfo,
  DatabaseStats,
} from "../types/reflections";

const log = logger.get_logger({ id: "reflections" });

/**
 * ReflectionsClient class - Query and analytics for Insights events
 */
export class ReflectionsClient {
  private config: Required<ReflectionsConfig>;
  private cache?: MemoryCache;
  private enabled: boolean = true;

  constructor(config: ReflectionsConfig = {}) {
    // Set defaults (mirror InsightsClient pattern)
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
    log(`Endpoint: ${this.config.endpoint}`);
    log(`Cache: ${this.config.enable_cache ? "enabled" : "disabled"}`);
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Query events with flexible filtering
   * Core method that all other queries build upon
   */
  async queryEvents(filter: QueryFilter = {}): Promise<QueryResult> {
    if (!this.enabled) {
      return {
        events: [],
        total_count: 0,
        query_time_ms: 0,
        from_cache: false,
      };
    }

    // Generate cache key from filter
    const cacheKey = JSON.stringify(filter);

    // Check cache
    if (this.cache) {
      try {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          log(`Cache HIT: ${cacheKey.substring(0, 50)}...`);
          return { ...cached, from_cache: true };
        }
      } catch (error) {
        log(`Cache error (continuing): ${error}`);
      }
    }

    // Execute query
    const startTime = Date.now();
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filter),
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
        server_logs: data.server_logs,
      };

      // Store in cache
      if (this.cache) {
        try {
          await this.cache.set(cacheKey, result);
        } catch (error) {
          log(`Cache set error (continuing): ${error}`);
        }
      }

      log(`Query completed: ${result.total_count} events in ${queryTime}ms`);
      return result;
    } catch (error: any) {
      log(`Query failed: ${error.message}`);
      if (this.config.silent_failure) {
        return {
          events: [],
          total_count: 0,
          query_time_ms: 0,
          from_cache: false,
        };
      }
      throw error;
    }
  }

  /**
   * Get all events for a session
   */
  async getEventsBySession(
    session_id: string,
    options: { limit?: number } = {}
  ): Promise<QueryResult> {
    return this.queryEvents({
      session_id,
      limit: options.limit,
      sort_by: "timestamp",
      sort_order: "asc",
    });
  }

  /**
   * Get all events for a trace
   */
  async getEventsByTrace(trace_id: string): Promise<QueryResult> {
    return this.queryEvents({
      trace_id,
      sort_by: "timestamp",
      sort_order: "asc",
    });
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    event_type: string,
    options: { limit?: number; session_id?: string } = {}
  ): Promise<QueryResult> {
    return this.queryEvents({
      event_type,
      session_id: options.session_id,
      limit: options.limit,
    });
  }

  /**
   * Get single event by ID
   */
  async getEventById(event_id: string): Promise<InsightsEvent | null> {
    // Note: This is a simple implementation
    // In Phase 2 we'll add proper event_id filtering to query_advanced
    const result = await this.queryEvents({ limit: 10000 });
    const event = result.events.find((e) => e.event_id === event_id);
    return event || null;
  }

  // ============================================================================
  // ANALYSIS OPERATIONS (Phase 3 - Stubs for now)
  // ============================================================================

  /**
   * Analyze a complete session
   * Full implementation in Phase 3
   */
  async analyzeSession(session_id: string): Promise<SessionAnalysis> {
    throw new Error("analyzeSession not yet implemented (Phase 3)");
  }

  /**
   * Analyze a trace (event chain)
   * Full implementation in Phase 3
   */
  async analyzeTrace(trace_id: string): Promise<TraceAnalysis> {
    throw new Error("analyzeTrace not yet implemented (Phase 3)");
  }

  // ============================================================================
  // LLM & PERFORMANCE ANALYTICS (Phase 4 - Stubs for now)
  // ============================================================================

  /**
   * Analyze LLM usage across time range
   * Full implementation in Phase 4
   */
  async analyzeLLMUsage(
    time_range: { start: number; end: number },
    filter?: Partial<QueryFilter>
  ): Promise<LLMAnalytics> {
    throw new Error("analyzeLLMUsage not yet implemented (Phase 4)");
  }

  /**
   * Analyze performance metrics
   * Full implementation in Phase 4
   */
  async analyzePerformance(
    time_range: { start: number; end: number },
    filter?: Partial<QueryFilter>
  ): Promise<PerformanceMetrics> {
    throw new Error("analyzePerformance not yet implemented (Phase 4)");
  }

  /**
   * Analyze errors
   * Full implementation in Phase 4
   */
  async analyzeErrors(
    time_range: { start: number; end: number },
    filter?: Partial<QueryFilter>
  ): Promise<ErrorAnalysis> {
    throw new Error("analyzeErrors not yet implemented (Phase 4)");
  }

  // ============================================================================
  // DATA EXPLORATION METHODS (Phase 1.5)
  // ============================================================================

  /**
   * Get all unique event types in the database
   */
  async getEventTypes(): Promise<string[]> {
    const result = await this.queryEvents({ limit: 10000 });
    const types = new Set(result.events.map((e) => e.event_type));
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
  async inspectPayloadSchema(
    event_type: string
  ): Promise<PayloadSchemaInspection> {
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
      common_fields: fields
        .filter((f) => f.occurrences >= commonThreshold)
        .map((f) => f.field_name),
      optional_fields: fields
        .filter((f) => f.occurrences < commonThreshold)
        .map((f) => f.field_name),
    };
  }

  /**
   * Get list of all session IDs
   */
  async getSessions(limit: number = 100): Promise<string[]> {
    const result = await this.queryEvents({ limit: 10000 });
    const sessions = new Set(result.events.map((e) => e.session_id));
    return Array.from(sessions).slice(0, limit);
  }

  /**
   * Get list of all trace IDs
   */
  async getTraces(limit: number = 100): Promise<string[]> {
    const result = await this.queryEvents({ limit: 10000 });
    const traces = new Set(
      result.events.filter((e) => e.trace_id).map((e) => e.trace_id!)
    );
    return Array.from(traces).slice(0, limit);
  }

  /**
   * Inspect a specific session
   */
  async inspectSession(session_id: string): Promise<SessionInspection> {
    const result = await this.getEventsBySession(session_id, {
      limit: 10000,
    });
    const events = result.events;

    if (events.length === 0) {
      throw new Error(`No events found for session ${session_id}`);
    }

    // Count event types
    const event_types: Record<string, number> = {};
    for (const event of events) {
      event_types[event.event_type] =
        (event_types[event.event_type] || 0) + 1;
    }

    // Extract traces
    const traces = [
      ...new Set(events.filter((e) => e.trace_id).map((e) => e.trace_id!)),
    ];

    // Time range
    const timestamps = events.map((e) => e.timestamp);
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
    const root_event = events.find((e) => !e.parent_event_id);
    const has_root = !!root_event;

    // Calculate chain structure
    const eventMap = new Map(events.map((e) => [e.event_id, e]));
    const childrenCount = new Map<string, number>();

    for (const event of events) {
      if (event.parent_event_id) {
        childrenCount.set(
          event.parent_event_id,
          (childrenCount.get(event.parent_event_id) || 0) + 1
        );
      }
    }

    const branches = root_event
      ? childrenCount.get(root_event.event_id) || 0
      : 0;
    const leaf_count = events.filter((e) => !childrenCount.has(e.event_id))
      .length;

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
    const timestamps = events.map((e) => e.timestamp);
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
        event.tags.forEach((tag) => tags.add(tag));
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

    const timestamps = result.events.map((e) => e.timestamp);
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

    const event_types = [...new Set(events.map((e) => e.event_type))];
    const sessions = [...new Set(events.map((e) => e.session_id))];
    const traces = [
      ...new Set(events.filter((e) => e.trace_id).map((e) => e.trace_id!)),
    ];
    const apps = [...new Set(events.map((e) => e.app_name))];
    const users = [...new Set(events.map((e) => e.user_id))];

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
  async sampleEvents(
    event_type: string,
    limit: number = 10
  ): Promise<InsightsEvent[]> {
    const result = await this.queryEvents({ event_type, limit });
    return result.events;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Invalidate cache for specific key pattern
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (!this.cache) return;

    if (pattern) {
      // Clear specific keys
      const keys = await this.cache.keys();
      for (const key of keys) {
        if (key.includes(pattern)) {
          await this.cache.delete(key);
        }
      }
      log(`Cache invalidated: ${pattern}`);
    } else {
      // Clear all
      await this.cache.clear();
      log(`Cache invalidated: all`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    if (!this.cache) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.cache.getStats(),
    };
  }

  /**
   * Enable/disable client
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    log(`ReflectionsClient ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ReflectionsConfig> {
    return { ...this.config };
  }
}

/**
 * Singleton instance for default client
 */
let defaultClient: ReflectionsClient | null = null;

/**
 * Create a new ReflectionsClient
 */
export function createClient(config?: ReflectionsConfig): ReflectionsClient {
  return new ReflectionsClient(config);
}

/**
 * Get or create the default client
 */
export function getDefaultClient(): ReflectionsClient {
  if (!defaultClient) {
    throw new Error(
      "Default ReflectionsClient not initialized. Call createClient() first or set defaultClient."
    );
  }
  return defaultClient;
}

/**
 * Set the default client
 */
export function setDefaultClient(client: ReflectionsClient): void {
  defaultClient = client;
  log("Default ReflectionsClient set");
}

/**
 * Export all types for convenience
 */
export * from "../types/reflections";
