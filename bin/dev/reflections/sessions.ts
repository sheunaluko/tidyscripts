import common from "../../../packages/ts_common/dist/index";
import * as core from "./core";

const log = common.logger.get_logger({ id: 'reflections.sessions' });

/**
 * Get most recent session for an app
 */
export async function get_most_recent_session_for_app(app_name: string) {
  log(`Finding most recent session for app: ${app_name}`);

  // Query events for this app, sorted by timestamp desc, limit 1
  const result = await core.queryEvents({
    app_name,
    limit: 1,
    order_by: 'timestamp DESC'
  });

  if (!result.events || result.events.length === 0) {
    log(`No sessions found for app: ${app_name}`);
    return null;
  }

  const latestEvent = result.events[0];
  const session_id = latestEvent.session_id;

  // Get full session inspection
  const session = await core.inspectSession(session_id);

  log(`Found session: ${session_id} with ${session.event_count} events`);

  return {
    session_id,
    app_name,
    latest_event: latestEvent,
    session_details: session
  };
}

/**
 * Get recent sessions (last N)
 */
export async function get_recent_sessions(limit: number = 10) {
  log(`Getting ${limit} most recent sessions`);

  // Query recent events and extract unique sessions
  const result = await core.queryEvents({
    limit: limit * 5,  // Get more events to ensure we have enough unique sessions
    order_by: 'timestamp DESC'
  });

  // Extract unique session IDs
  const sessionIds = new Set<string>();
  result.events.forEach((evt: any) => {
    if (sessionIds.size < limit) {
      sessionIds.add(evt.session_id);
    }
  });

  // Get details for each session
  const sessions = await Promise.all(
    Array.from(sessionIds).map(async (session_id) => {
      const session = await core.inspectSession(session_id);
      return session;
    })
  );

  log(`Found ${sessions.length} recent sessions`);

  return sessions;
}

/**
 * Get all sessions for a user
 */
export async function get_user_sessions(user_id: string, limit: number = 20) {
  log(`Getting sessions for user: ${user_id}`);

  // Query events for this user
  const result = await core.getEventsByUser(user_id, { limit });

  // Extract unique session IDs
  const sessionIds = new Set<string>();
  result.events.forEach((evt: any) => {
    sessionIds.add(evt.session_id);
  });

  // Get details for each session
  const sessions = await Promise.all(
    Array.from(sessionIds).map(async (session_id) => {
      const session = await core.inspectSession(session_id);
      return session;
    })
  );

  log(`Found ${sessions.length} sessions for user: ${user_id}`);

  return sessions;
}

/**
 * Deep session inspection
 */
export async function inspect_session(session_id: string) {
  log(`Inspecting session: ${session_id}`);

  const inspection = await core.inspectSession(session_id);
  const events = await core.getEventsBySession(session_id);

  return {
    ...inspection,
    events: events.events
  };
}

/**
 * Get session timeline (events in order)
 */
export async function get_session_timeline(session_id: string) {
  log(`Getting timeline for session: ${session_id}`);

  const result = await core.getEventsBySession(session_id);

  // Sort by timestamp
  const timeline = result.events.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    session_id,
    event_count: timeline.length,
    timeline
  };
}

/**
 * Find sessions with errors
 */
export async function find_sessions_with_errors(app_name?: string, limit: number = 10) {
  log(`Finding sessions with errors${app_name ? ` for app: ${app_name}` : ''}`);

  // Query error events
  const result = await core.queryEvents({
    app_name,
    tags: ['error'],
    limit: limit * 3,  // Get more to ensure enough unique sessions
    order_by: 'timestamp DESC'
  });

  // Extract unique session IDs
  const sessionIds = new Set<string>();
  result.events.forEach((evt: any) => {
    if (sessionIds.size < limit) {
      sessionIds.add(evt.session_id);
    }
  });

  // Get details for each session
  const sessions = await Promise.all(
    Array.from(sessionIds).map(async (session_id) => {
      const session = await core.inspectSession(session_id);
      const errors = result.events.filter((e: any) => e.session_id === session_id);
      return {
        ...session,
        error_count: errors.length,
        errors
      };
    })
  );

  log(`Found ${sessions.length} sessions with errors`);

  return sessions;
}

/**
 * Get session summary (events by type, duration, errors, etc.)
 */
export async function summarize_session(session_id: string) {
  log(`Summarizing session: ${session_id}`);

  // Get full session details
  const inspection = await core.inspectSession(session_id);
  const events = await core.getEventsBySession(session_id);

  // Extract errors
  const errors = events.events.filter((e: any) =>
    e.tags?.includes('error') || e.payload?.status === 'error'
  );

  // Extract LLM invocations
  const llmCalls = events.events.filter((e: any) => e.event_type === 'llm_invocation');
  const totalTokens = llmCalls.reduce((sum: number, e: any) =>
    sum + (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0), 0
  );

  // Extract executions
  const executions = events.events.filter((e: any) => e.event_type === 'execution');

  // Get first and last events
  const sortedEvents = [...events.events].sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    session_id,
    event_count: inspection.event_count,
    duration_ms: inspection.duration_ms,
    event_types: inspection.event_types,
    traces: inspection.traces,
    errors_count: errors.length,
    errors,
    llm_invocations: llmCalls.length,
    total_tokens: totalTokens,
    executions_count: executions.length,
    executions,
    first_event: sortedEvents[0],
    last_event: sortedEvents[sortedEvents.length - 1],
    app_name: sortedEvents[0]?.app_name,
    user_id: sortedEvents[0]?.user_id
  };
}
