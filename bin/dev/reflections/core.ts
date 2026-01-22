import common from "../../../packages/ts_common/dist/index";
import node from "../../../packages/ts_node/dist/index";

const log = common.logger.get_logger({ id: 'reflections.core' });

// Cached database connection
let DB: any = null;

/**
 * Get or create SurrealDB connection for direct access
 * Bypasses the ReflectionsClient fetch-based approach
 */
export async function getDB() {
  if (DB) {
    log("Using cached SurrealDB connection");
    return DB;
  }

  log("Creating new SurrealDB connection");

  // Use environment variables or defaults
  const surrealUrl = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL || 'ws://localhost:8000/rpc';
  const surrealUser = process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER || 'root';
  const surrealPw = process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD || 'root';
  const surrealNamespace = 'production';
  const surrealDatabase = 'insights_events';

  DB = await node.apis.surreal.connect_to_surreal({
    url: surrealUrl,
    namespace: surrealNamespace,
    database: surrealDatabase,
    auth: {
      username: surrealUser,
      password: surrealPw,
    },
  });

  log(`Connected to SurrealDB: ${surrealUrl}/${surrealNamespace}/${surrealDatabase}`);

  return DB;
}

/**
 * Close database connection
 */
export async function closeDB() {
  if (DB) {
    log("Closing SurrealDB connection");
    try {
      await DB.close();
      DB = null;
      log("Database connection closed");
    } catch (error: any) {
      log(`Error closing database: ${error.message}`);
    }
  }
}

/**
 * Reset database connection
 */
export async function resetDB() {
  await closeDB();
  return getDB();
}

/**
 * Query events with filters
 */
export async function queryEvents(filters: {
  event_type?: string;
  session_id?: string;
  trace_id?: string;
  app_name?: string;
  user_id?: string;
  tags?: string[];
  start_time?: string;
  end_time?: string;
  limit?: number;
  order_by?: string;
}) {
  const db = await getDB();

  let query = 'SELECT * FROM insights_events';
  const conditions = [];
  const params: any = {};

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
  if (filters.app_name) {
    conditions.push('app_name = $app_name');
    params.app_name = filters.app_name;
  }
  if (filters.user_id) {
    conditions.push('user_id = $user_id');
    params.user_id = filters.user_id;
  }
  if (filters.tags && filters.tags.length > 0) {
    // Check if any of the tags match
    conditions.push('$tags ALLINSIDE tags');
    params.tags = filters.tags;
  }
  if (filters.start_time) {
    conditions.push('timestamp >= $start_time');
    params.start_time = filters.start_time;
  }
  if (filters.end_time) {
    conditions.push('timestamp <= $end_time');
    params.end_time = filters.end_time;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ` ORDER BY ${filters.order_by || 'timestamp DESC'}`;
  query += ' LIMIT $limit';
  params.limit = filters.limit || 50;

  const result = await db.query(query, params);

  return {
    events: result[0] || [],
    count: result[0]?.length || 0
  };
}

/**
 * Get event by ID
 */
export async function getEventById(event_id: string) {
  const db = await getDB();

  const query = 'SELECT * FROM insights_events WHERE event_id = $event_id LIMIT 1';
  const result = await db.query(query, { event_id });

  return result[0]?.[0] || null;
}

/**
 * Get events by session
 */
export async function getEventsBySession(session_id: string, options: { limit?: number } = {}) {
  return queryEvents({
    session_id,
    limit: options.limit || 1000,
    order_by: 'timestamp ASC'
  });
}

/**
 * Get events by trace
 */
export async function getEventsByTrace(trace_id: string, options: { limit?: number } = {}) {
  return queryEvents({
    trace_id,
    limit: options.limit || 1000,
    order_by: 'timestamp ASC'
  });
}

/**
 * Get events by type
 */
export async function getEventsByType(event_type: string, options: { app_name?: string; limit?: number; order_by?: string } = {}) {
  return queryEvents({
    event_type,
    app_name: options.app_name,
    limit: options.limit || 100,
    order_by: options.order_by || 'timestamp DESC'
  });
}

/**
 * Get events by user
 */
export async function getEventsByUser(user_id: string, options: { limit?: number } = {}) {
  return queryEvents({
    user_id,
    limit: options.limit || 100,
    order_by: 'timestamp DESC'
  });
}

/**
 * Inspect session (get metadata)
 */
export async function inspectSession(session_id: string) {
  const result = await getEventsBySession(session_id);
  const events = result.events;

  if (events.length === 0) {
    return {
      session_id,
      event_count: 0,
      duration_ms: 0,
      event_types: {},
      traces: [],
      first_timestamp: null,
      last_timestamp: null
    };
  }

  // Calculate metadata
  const timestamps = events.map((e: any) => new Date(e.timestamp).getTime());
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);
  const durationMs = lastTimestamp - firstTimestamp;

  // Group by event type
  const eventTypes: Record<string, number> = {};
  events.forEach((e: any) => {
    eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
  });

  // Extract unique trace IDs
  const traces = [...new Set(events.map((e: any) => e.trace_id).filter(Boolean))];

  return {
    session_id,
    event_count: events.length,
    duration_ms: durationMs,
    event_types: eventTypes,
    traces,
    first_timestamp: new Date(firstTimestamp).toISOString(),
    last_timestamp: new Date(lastTimestamp).toISOString(),
    app_name: events[0]?.app_name,
    user_id: events[0]?.user_id
  };
}

/**
 * Inspect trace (get metadata)
 */
export async function inspectTrace(trace_id: string) {
  const result = await getEventsByTrace(trace_id);
  const events = result.events;

  if (events.length === 0) {
    return {
      trace_id,
      event_count: 0,
      duration_ms: 0,
      sessions: [],
      first_timestamp: null,
      last_timestamp: null
    };
  }

  // Calculate metadata
  const timestamps = events.map((e: any) => new Date(e.timestamp).getTime());
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);
  const durationMs = lastTimestamp - firstTimestamp;

  // Extract unique session IDs
  const sessions = [...new Set(events.map((e: any) => e.session_id).filter(Boolean))];

  return {
    trace_id,
    event_count: events.length,
    duration_ms: durationMs,
    sessions,
    first_timestamp: new Date(firstTimestamp).toISOString(),
    last_timestamp: new Date(lastTimestamp).toISOString()
  };
}

/**
 * Get database stats
 */
export async function getDatabaseStats() {
  const db = await getDB();

  // Count total events
  const countQuery = 'SELECT count() as count FROM insights_events GROUP ALL';
  const countResult = await db.query(countQuery);
  const totalEvents = countResult[0]?.[0]?.count || 0;

  // Get all events and count unique sessions/traces in application code
  // (SurrealDB's array::distinct requires array aggregation which is complex)
  const allQuery = 'SELECT session_id, trace_id FROM insights_events';
  const allResult = await db.query(allQuery);
  const events = allResult[0] || [];

  const uniqueSessions = new Set(events.map((e: any) => e.session_id)).size;
  const uniqueTraces = new Set(events.map((e: any) => e.trace_id).filter((t: any) => t)).size;

  return {
    total_events: totalEvents,
    total_sessions: uniqueSessions,
    total_traces: uniqueTraces
  };
}

/**
 * Get connection stats
 */
export function getConnectionStats() {
  return {
    connected: DB !== null,
    url: process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL || 'ws://localhost:8000/rpc',
    namespace: 'production',
    database: 'insights_events'
  };
}
