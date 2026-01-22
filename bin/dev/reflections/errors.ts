import common from "../../../packages/ts_common/dist/index";
import * as core from "./core";

const log = common.logger.get_logger({ id: 'reflections.errors' });

/**
 * Find all error events
 */
export async function find_errors(filter?: { app_name?: string, limit?: number }) {
  log(`Finding errors${filter?.app_name ? ` for app: ${filter.app_name}` : ''}`);

  // Query events with 'error' tag
  const result = await core.queryEvents({
    app_name: filter?.app_name,
    tags: ['error'],
    limit: filter?.limit || 50,
    order_by: 'timestamp DESC'
  });

  log(`Found ${result.events.length} error events`);

  return result.events.map((event: any) => ({
    event_id: event.event_id,
    event_type: event.event_type,
    session_id: event.session_id,
    timestamp: event.timestamp,
    error_message: event.payload?.error || event.payload?.error_message,
    status: event.payload?.status,
    app_name: event.app_name,
    user_id: event.user_id,
    payload: event.payload
  }));
}

/**
 * Get errors by type
 */
export async function get_errors_by_type(event_type: string, limit: number = 50) {
  log(`Finding errors for event type: ${event_type}`);

  const result = await core.getEventsByType(event_type, {
    limit,
    order_by: 'timestamp DESC'
  });

  // Filter for actual errors (with error tag or error status)
  const errors = result.events.filter((e: any) =>
    e.tags?.includes('error') || e.payload?.status === 'error'
  );

  log(`Found ${errors.length} error events of type: ${event_type}`);

  return errors;
}

/**
 * Find errors in session
 */
export async function get_session_errors(session_id: string) {
  log(`Finding errors in session: ${session_id}`);

  const result = await core.getEventsBySession(session_id);

  // Filter for errors
  const errors = result.events.filter((e: any) =>
    e.tags?.includes('error') || e.payload?.status === 'error'
  );

  log(`Found ${errors.length} errors in session`);

  return errors;
}

/**
 * Get error context (surrounding events)
 */
export async function get_error_context(event_id: string, context_size: number = 5) {
  log(`Getting context for error event: ${event_id}`);

  // Get the error event
  const errorEvent = await core.getEventById(event_id);

  if (!errorEvent) {
    log(`Error event not found: ${event_id}`);
    return null;
  }

  // Get surrounding events from the same session
  const sessionEvents = await core.getEventsBySession(errorEvent.session_id);

  // Sort by timestamp
  const sortedEvents = sessionEvents.events.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find the error event index
  const errorIndex = sortedEvents.findIndex((e: any) => e.event_id === event_id);

  if (errorIndex === -1) {
    return { error: errorEvent, before: [], after: [] };
  }

  // Get context before and after
  const before = sortedEvents.slice(
    Math.max(0, errorIndex - context_size),
    errorIndex
  );

  const after = sortedEvents.slice(
    errorIndex + 1,
    Math.min(sortedEvents.length, errorIndex + 1 + context_size)
  );

  log(`Found ${before.length} events before and ${after.length} events after`);

  return {
    error: errorEvent,
    before,
    after,
    session_id: errorEvent.session_id
  };
}

/**
 * Group errors by message
 */
export async function group_errors_by_message(limit: number = 100) {
  log(`Grouping errors by message`);

  const result = await core.queryEvents({
    tags: ['error'],
    limit,
    order_by: 'timestamp DESC'
  });

  // Group by error message
  const groups: Record<string, any[]> = {};

  result.events.forEach((event: any) => {
    const message = event.payload?.error || event.payload?.error_message || 'Unknown error';
    if (!groups[message]) {
      groups[message] = [];
    }
    groups[message].push(event);
  });

  // Convert to array and sort by count
  const groupedErrors = Object.entries(groups)
    .map(([message, events]) => ({
      message,
      count: events.length,
      events,
      first_occurrence: events[events.length - 1].timestamp,
      last_occurrence: events[0].timestamp
    }))
    .sort((a, b) => b.count - a.count);

  log(`Grouped into ${groupedErrors.length} unique error messages`);

  return groupedErrors;
}

/**
 * Get recent errors (last N hours)
 */
export async function get_recent_errors(hours: number = 24, app_name?: string) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  log(`Finding errors from the last ${hours} hours${app_name ? ` for app: ${app_name}` : ''}`);

  const result = await core.queryEvents({
    app_name,
    tags: ['error'],
    start_time: startTime,
    limit: 100,
    order_by: 'timestamp DESC'
  });

  log(`Found ${result.events.length} errors in the last ${hours} hours`);

  return result.events.map((event: any) => ({
    event_id: event.event_id,
    event_type: event.event_type,
    session_id: event.session_id,
    timestamp: event.timestamp,
    error_message: event.payload?.error || event.payload?.error_message,
    status: event.payload?.status,
    app_name: event.app_name,
    user_id: event.user_id
  }));
}

/**
 * Find errors with specific keyword in message
 */
export async function search_errors(keyword: string, limit: number = 50) {
  log(`Searching for errors containing: ${keyword}`);

  const result = await core.queryEvents({
    tags: ['error'],
    limit: 200,  // Get more to filter
    order_by: 'timestamp DESC'
  });

  // Filter by keyword
  const matchingErrors = result.events
    .filter((e: any) => {
      const message = e.payload?.error || e.payload?.error_message || '';
      return message.toLowerCase().includes(keyword.toLowerCase());
    })
    .slice(0, limit);

  log(`Found ${matchingErrors.length} errors matching: ${keyword}`);

  return matchingErrors;
}

/**
 * Get error statistics
 */
export async function get_error_stats(app_name?: string, hours: number = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  log(`Getting error statistics${app_name ? ` for app: ${app_name}` : ''}`);

  const result = await core.queryEvents({
    app_name,
    tags: ['error'],
    start_time: startTime,
    limit: 500,
    order_by: 'timestamp DESC'
  });

  // Aggregate stats
  const stats = {
    total_errors: result.events.length,
    by_type: {} as Record<string, number>,
    by_session: {} as Record<string, number>,
    by_hour: {} as Record<string, number>,
    unique_sessions: new Set<string>()
  };

  result.events.forEach((event: any) => {
    // By type
    stats.by_type[event.event_type] = (stats.by_type[event.event_type] || 0) + 1;

    // By session
    stats.by_session[event.session_id] = (stats.by_session[event.session_id] || 0) + 1;
    stats.unique_sessions.add(event.session_id);

    // By hour
    const hour = new Date(event.timestamp).toISOString().substring(0, 13);
    stats.by_hour[hour] = (stats.by_hour[hour] || 0) + 1;
  });

  return {
    ...stats,
    unique_sessions_count: stats.unique_sessions.size,
    unique_sessions: undefined  // Remove set from output
  };
}
