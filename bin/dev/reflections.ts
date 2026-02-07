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
import * as path from "path";

// Import sub-modules
import * as core from "./reflections/core";
import * as sessions from "./reflections/sessions";
import * as errors from "./reflections/errors";
import * as traces from "./reflections/traces";
import * as performance from "./reflections/performance";
import * as formatters from "./reflections/formatters";
import * as exportUtil from "./reflections/export";

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
  formatters,
  exportUtil
};

// Convenience exports (most commonly used functions)
export const {
  get_most_recent_session_for_app,
  get_recent_sessions,
  inspect_session,
  find_sessions_with_errors,
  find_sessions_by_tags,
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

export const {
  export_session_to_json,
  export_session_to_file,
  export_sessions_batch,
  export_session_to_jsonl,
  get_export_filename
} = exportUtil;

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

/**
 * Quick export workflow - find most recent session for app and export it
 */
export async function quick_export_latest_session(
  app_name: string,
  output_path?: string
): Promise<string> {
  log(`Quick export latest session for app: ${app_name}`);

  const session = await sessions.get_most_recent_session_for_app(app_name);
  if (!session) {
    log(`No sessions found for app: ${app_name}`);
    throw new Error(`No sessions found for app: ${app_name}`);
  }

  const filepath = await exportUtil.export_session_to_file(
    session.session_id,
    output_path
  );

  log(`Exported session ${session.session_id} to ${filepath}`);
  return filepath;
}

/**
 * Quick export workflow - find most recent session(s) with given tags and export
 */
export async function quick_export_by_tag(
  tags: string[],
  output_path?: string,
  app_name?: string,
  last: number = 1
): Promise<string | string[]> {
  log(`Quick export by tags: [${tags.join(', ')}]${app_name ? ` (app: ${app_name})` : ''} (last: ${last})`);

  const results = await sessions.find_sessions_by_tags(tags, { app_name, limit: last });
  if (!results || results.length === 0) {
    throw new Error(`No sessions found with tags: [${tags.join(', ')}]${app_name ? ` for app: ${app_name}` : ''}`);
  }

  if (last === 1) {
    const session = results[0];
    const filepath = await exportUtil.export_session_to_file(
      session.session_id,
      output_path
    );
    log(`Exported session ${session.session_id} (tags: ${session.session_tags?.join(', ')}) to ${filepath}`);
    return filepath;
  }

  // Multi-export: use batch export into the output_path's directory
  const session_ids = results.map((s: any) => s.session_id);
  const output_dir = output_path ? path.dirname(output_path) : undefined;
  const filepaths = await exportUtil.export_sessions_batch(
    session_ids,
    output_dir,
    undefined,
    { app_name, tags }
  );
  log(`Exported ${filepaths.length} sessions with tags: [${tags.join(', ')}]`);
  return filepaths;
}

/**
 * Quick export workflow - export N most recent sessions for an app (tagless)
 */
export async function quick_export_latest_sessions(
  app_name: string,
  output_dir?: string,
  last: number = 3
): Promise<string[]> {
  log(`Quick export latest ${last} sessions for app: ${app_name}`);

  const recentSessions = await sessions.get_recent_sessions(last * 2);
  // Filter to the target app
  const appSessions = recentSessions
    .filter((s: any) => s.app_name === app_name || s.events?.[0]?.app_name === app_name)
    .slice(0, last);

  if (appSessions.length === 0) {
    throw new Error(`No sessions found for app: ${app_name}`);
  }

  const session_ids = appSessions.map((s: any) => s.session_id);
  const filepaths = await exportUtil.export_sessions_batch(
    session_ids,
    output_dir,
    undefined,
    { app_name }
  );
  log(`Exported ${filepaths.length} sessions for app: ${app_name}`);
  return filepaths;
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


export var export_last_session_for_app = quick_export_latest_session ; //alias 



log("Reflections REPL utilities loaded");
