/**
 * Reflections REPL Utility System
 *
 * Comprehensive REPL utilities for debugging and exploring Insights logs
 * using ReflectionsClient.
 *
 * Usage:
 *   const r = await dev.reflections.init();
 *   const session = await dev.reflections.get_most_recent_session_for_app('cortex');
 *   const errors = await dev.reflections.find_errors({ app_name: 'cortex' });
 */

import common from "../../packages/ts_common/dist/index";

// Import sub-modules
import * as core from "./reflections/core";
import * as sessions from "./reflections/sessions";
import * as errors from "./reflections/errors";
import * as traces from "./reflections/traces";
import * as performance from "./reflections/performance";
import * as formatters from "./reflections/formatters";

const log = common.logger.get_logger({ id: 'reflections' });

/**
 * Initialize Reflections REPL utilities
 * Returns database connection and stats
 */
export async function init() {
  log("Initializing Reflections REPL utilities...");

  const db = await core.getDB();
  const stats = await core.getDatabaseStats();

  log(`Connected to Insights DB: ${stats.total_events} events, ${stats.total_sessions} sessions`);

  return { db, stats };
}

/**
 * Quick test function to verify all utilities are working
 */
export async function main_test() {
  log("Running Reflections REPL test...");

  try {
    // Test DB connection
    const db = await core.getDB();
    const stats = await core.getDatabaseStats();
    log(`✓ DB connected: ${stats.total_events} events`);

    // Test session discovery
    const recentSessions = await sessions.get_recent_sessions(3);
    log(`✓ Found ${recentSessions.length} recent sessions`);

    // Test error finding
    const recentErrors = await errors.get_recent_errors(24);
    log(`✓ Found ${recentErrors.length} errors in last 24 hours`);

    // Test traces
    const recentTraces = await traces.get_traces(3);
    log(`✓ Found ${recentTraces.length} traces`);

    // Test performance
    const tokenStats = await performance.get_token_usage();
    log(`✓ Token usage: ${tokenStats.total_tokens} tokens across ${tokenStats.total_invocations} invocations`);

    log("All tests passed!");

    return {
      stats,
      recentSessions,
      recentErrors,
      recentTraces,
      tokenStats
    };
  } catch (error) {
    log(`Test failed: ${error}`);
    throw error;
  }
}

// Re-export all utilities organized by category
export {
  core,
  sessions,
  errors,
  traces,
  performance,
  formatters
};

// Convenience exports (most commonly used functions)
export const {
  get_most_recent_session_for_app,
  get_recent_sessions,
  inspect_session,
  find_sessions_with_errors,
  summarize_session,
  get_session_timeline,
  get_user_sessions
} = sessions;

export const {
  find_errors,
  get_session_errors,
  get_error_context,
  get_recent_errors,
  group_errors_by_message,
  get_errors_by_type,
  search_errors,
  get_error_stats
} = errors;

export const {
  get_traces,
  inspect_trace,
  visualize_trace,
  find_traces_with_errors,
  get_longest_traces,
  get_trace_timeline,
  compare_traces
} = traces;

export const {
  get_token_usage,
  find_high_token_events,
  analyze_token_spikes,
  get_session_performance,
  get_llm_stats,
  find_slow_executions,
  compare_session_performance,
  get_token_usage_over_time
} = performance;

export const {
  formatEvent,
  formatSessionSummary,
  formatError,
  formatTraceTree,
  formatPerformanceMetrics,
  formatTable,
  formatErrorList,
  formatSessionList
} = formatters;

// Quick helpers for common workflows
export async function quick_session_debug(app_name: string) {
  log(`Quick session debug for app: ${app_name}`);

  const session = await sessions.get_most_recent_session_for_app(app_name);
  if (!session) {
    log(`No sessions found for app: ${app_name}`);
    return null;
  }

  const summary = await sessions.summarize_session(session.session_id);
  const sessionErrors = await errors.get_session_errors(session.session_id);
  const perf = await performance.get_session_performance(session.session_id);

  return {
    session_id: session.session_id,
    summary,
    errors: sessionErrors,
    performance: perf
  };
}

export async function quick_error_investigation(error_event_id: string) {
  log(`Quick error investigation for event: ${error_event_id}`);

  const context = await errors.get_error_context(error_event_id, 5);
  if (!context) {
    log(`Error event not found: ${error_event_id}`);
    return null;
  }

  const sessionSummary = await sessions.summarize_session(context.session_id);

  return {
    error: context.error,
    before: context.before,
    after: context.after,
    session_summary: sessionSummary
  };
}

export async function quick_token_analysis(session_id?: string, app_name?: string) {
  log(`Quick token analysis${session_id ? ` for session: ${session_id}` : app_name ? ` for app: ${app_name}` : ''}`);

  const usage = await performance.get_token_usage(session_id, app_name);

  let spikes = null;
  if (session_id) {
    spikes = await performance.analyze_token_spikes(session_id);
  }

  return {
    usage,
    spikes
  };
}

// Helper to display formatted output in REPL
export function display(data: any, format?: 'json' | 'summary' | 'table') {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else if (format === 'summary' && data.session_id) {
    console.log(formatters.formatSessionSummary(data));
  } else if (format === 'table' && Array.isArray(data)) {
    console.log(formatters.formatTable(data, Object.keys(data[0] || {})));
  } else {
    console.log(data);
  }
}

log("Reflections REPL utilities loaded");
