import common from "../../../packages/ts_common/dist/index";
import * as core from "./core";
import * as sessions from "./sessions";
import * as errors from "./errors";
import * as traces from "./traces";
import * as fs from "fs/promises";
import * as path from "path";

const log = common.logger.get_logger({ id: 'reflections.export' });

const EXPORTER_VERSION = "1.0.0";
const DEFAULT_OUTPUT_DIR = "./session_exports";

/**
 * Export options
 */
export interface ExportOptions {
  include_metadata?: boolean;      // Default: true
  include_summary?: boolean;       // Default: true
  include_timeline?: boolean;      // Default: true
  include_events_by_type?: boolean; // Default: true
  include_traces?: boolean;        // Default: true
  include_errors?: boolean;        // Default: true
  pretty_print?: boolean;          // Default: true (2-space indent)
  compress?: boolean;              // Default: false (minified JSON)
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  app_name: string;
  app_version?: string;
  user_id: string;
  session_tags: string[];
  start_time: string;              // ISO 8601
  end_time: string;                // ISO 8601
  duration_ms: number;
  event_count: number;
  export_timestamp: string;        // ISO 8601
  exporter_version: string;
}

/**
 * Session summary statistics
 */
export interface SessionSummary {
  event_types: Record<string, number>;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  llm_invocations: number;
  error_count: number;
  trace_count: number;
  avg_llm_latency_ms?: number;
  total_cost_estimate_usd?: number;
}

/**
 * Trace information
 */
export interface TraceInfo {
  trace_id: string;
  event_count: number;
  duration_ms: number;
  events: any[];
}

/**
 * Error information
 */
export interface ErrorInfo {
  event_id: string;
  timestamp: number;
  error_type?: string;
  error_message?: string;
  context: any;
}

/**
 * Complete session export structure
 */
export interface SessionExport {
  session_id: string;
  metadata: SessionMetadata;
  summary: SessionSummary;
  timeline: any[];
  events_by_type: Record<string, any[]>;
  traces: TraceInfo[];
  errors: ErrorInfo[];
}

/**
 * Build metadata section
 */
async function build_metadata(session_id: string, events: any[]): Promise<SessionMetadata> {
  log(`Building metadata for session: ${session_id}`);

  if (events.length === 0) {
    return {
      app_name: 'unknown',
      user_id: 'unknown',
      session_tags: [],
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_ms: 0,
      event_count: 0,
      export_timestamp: new Date().toISOString(),
      exporter_version: EXPORTER_VERSION
    };
  }

  // Sort events by timestamp to find start and end times
  const sortedEvents = [...events].sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  const startTime = new Date(firstEvent.timestamp);
  const endTime = new Date(lastEvent.timestamp);
  const durationMs = endTime.getTime() - startTime.getTime();

  // Extract session tags from session_tags events (take the last one — cumulative)
  const tagEvents = events.filter((e: any) => e.event_type === 'session_tags');
  const lastTagEvent = tagEvents[tagEvents.length - 1];
  const session_tags: string[] = lastTagEvent?.payload?.tags || [];

  return {
    app_name: firstEvent.app_name || 'unknown',
    app_version: firstEvent.payload?.app_version || firstEvent.payload?.version,
    user_id: firstEvent.user_id || 'unknown',
    session_tags,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_ms: durationMs,
    event_count: events.length,
    export_timestamp: new Date().toISOString(),
    exporter_version: EXPORTER_VERSION
  };
}

/**
 * Build summary section
 */
async function build_summary(events: any[]): Promise<SessionSummary> {
  log(`Building summary for ${events.length} events`);

  // Count event types
  const event_types: Record<string, number> = {};
  events.forEach((e: any) => {
    event_types[e.event_type] = (event_types[e.event_type] || 0) + 1;
  });

  // Extract LLM invocations
  const llmEvents = events.filter((e: any) => e.event_type === 'llm_invocation');

  // Calculate token totals
  let total_prompt_tokens = 0;
  let total_completion_tokens = 0;
  let total_llm_latency_ms = 0;
  let llm_latency_count = 0;

  llmEvents.forEach((e: any) => {
    total_prompt_tokens += e.payload?.prompt_tokens || 0;
    total_completion_tokens += e.payload?.completion_tokens || 0;

    if (e.duration_ms) {
      total_llm_latency_ms += e.duration_ms;
      llm_latency_count++;
    }
  });

  const total_tokens = total_prompt_tokens + total_completion_tokens;

  // Calculate average LLM latency
  const avg_llm_latency_ms = llm_latency_count > 0
    ? Math.round(total_llm_latency_ms / llm_latency_count)
    : undefined;

  // Calculate cost estimate
  const total_cost_estimate_usd = calculate_cost_estimate(llmEvents);

  // Count errors
  const errorEvents = events.filter((e: any) =>
    e.tags?.includes('error') || e.payload?.status === 'error'
  );

  // Count unique traces
  const uniqueTraces = new Set(events.map((e: any) => e.trace_id).filter(Boolean));

  return {
    event_types,
    total_tokens,
    total_prompt_tokens,
    total_completion_tokens,
    llm_invocations: llmEvents.length,
    error_count: errorEvents.length,
    trace_count: uniqueTraces.size,
    avg_llm_latency_ms,
    total_cost_estimate_usd
  };
}

/**
 * Build timeline section (chronologically sorted events)
 */
function build_timeline(events: any[]): any[] {
  log(`Building timeline for ${events.length} events`);

  // Sort by timestamp
  const timeline = [...events].sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Format events for timeline
  return timeline.map((evt: any) => ({
    timestamp: new Date(evt.timestamp).getTime(),
    event_id: evt.event_id,
    event_type: evt.event_type,
    payload: evt.payload,
    tags: evt.tags,
    ...(evt.duration_ms && { duration_ms: evt.duration_ms })
  }));
}

/**
 * Build events_by_type section (grouped by event_type)
 */
function build_events_by_type(events: any[]): Record<string, any[]> {
  log(`Building events_by_type for ${events.length} events`);

  const grouped: Record<string, any[]> = {};

  events.forEach((evt: any) => {
    const eventType = evt.event_type;
    if (!grouped[eventType]) {
      grouped[eventType] = [];
    }
    grouped[eventType].push(evt);
  });

  // Sort each group by timestamp
  Object.keys(grouped).forEach(eventType => {
    grouped[eventType].sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  });

  return grouped;
}

/**
 * Build traces section
 */
async function build_traces(session_id: string, events: any[]): Promise<TraceInfo[]> {
  log(`Building traces for session: ${session_id}`);

  // Extract unique trace IDs
  const traceIds = [...new Set(events.map((e: any) => e.trace_id).filter(Boolean))];

  if (traceIds.length === 0) {
    return [];
  }

  // Build trace info for each trace
  const traceInfos: TraceInfo[] = [];

  for (const trace_id of traceIds) {
    const traceEvents = events.filter((e: any) => e.trace_id === trace_id);

    if (traceEvents.length === 0) continue;

    // Calculate duration
    const timestamps = traceEvents.map((e: any) => new Date(e.timestamp).getTime());
    const duration_ms = Math.max(...timestamps) - Math.min(...timestamps);

    traceInfos.push({
      trace_id,
      event_count: traceEvents.length,
      duration_ms,
      events: traceEvents.sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    });
  }

  // Sort traces by event count (descending)
  traceInfos.sort((a, b) => b.event_count - a.event_count);

  return traceInfos;
}

/**
 * Build errors section
 */
function build_errors(events: any[]): ErrorInfo[] {
  log(`Building errors section`);

  const errorEvents = events.filter((e: any) =>
    e.tags?.includes('error') || e.payload?.status === 'error'
  );

  return errorEvents.map((evt: any) => ({
    event_id: evt.event_id,
    timestamp: new Date(evt.timestamp).getTime(),
    error_type: evt.event_type,
    error_message: evt.payload?.error || evt.payload?.error_message,
    context: evt.payload
  }));
}

/**
 * Calculate cost estimate from LLM events
 * Uses GPT-4 pricing as baseline: $0.03/1K prompt tokens, $0.06/1K completion tokens
 */
function calculate_cost_estimate(llm_events: any[]): number | undefined {
  if (llm_events.length === 0) {
    return undefined;
  }

  let total_cost = 0;

  llm_events.forEach((evt: any) => {
    const prompt_tokens = evt.payload?.prompt_tokens || 0;
    const completion_tokens = evt.payload?.completion_tokens || 0;
    const model = evt.payload?.model || '';

    // Pricing (simplified - using GPT-4 as baseline)
    let prompt_price_per_1k = 0.03;
    let completion_price_per_1k = 0.06;

    // Adjust for different models if detected
    if (model.includes('gpt-3.5') || model.includes('turbo')) {
      prompt_price_per_1k = 0.001;
      completion_price_per_1k = 0.002;
    } else if (model.includes('claude')) {
      prompt_price_per_1k = 0.015;
      completion_price_per_1k = 0.075;
    }

    const prompt_cost = (prompt_tokens / 1000) * prompt_price_per_1k;
    const completion_cost = (completion_tokens / 1000) * completion_price_per_1k;

    total_cost += prompt_cost + completion_cost;
  });

  return parseFloat(total_cost.toFixed(6));
}

/**
 * Export a session to JSON format
 * Returns JSON string with complete session data
 */
export async function export_session_to_json(
  session_id: string,
  options?: ExportOptions
): Promise<string> {
  log(`Exporting session to JSON: ${session_id}`);

  // Merge with defaults
  const opts: ExportOptions = {
    include_metadata: true,
    include_summary: true,
    include_timeline: true,
    include_events_by_type: true,
    include_traces: true,
    include_errors: true,
    pretty_print: true,
    compress: false,
    ...options
  };

  // Get all events for the session
  const result = await core.getEventsBySession(session_id, { limit: 10000 });
  const events = result.events;

  if (events.length === 0) {
    log(`Warning: No events found for session ${session_id}`);
  }

  // Build export structure
  const exportData: any = {
    session_id
  };

  // Build sections in parallel
  const [metadata, summary, timeline, events_by_type, tracesData, errorsData] = await Promise.all([
    opts.include_metadata ? build_metadata(session_id, events) : Promise.resolve(null),
    opts.include_summary ? build_summary(events) : Promise.resolve(null),
    opts.include_timeline ? Promise.resolve(build_timeline(events)) : Promise.resolve(null),
    opts.include_events_by_type ? Promise.resolve(build_events_by_type(events)) : Promise.resolve(null),
    opts.include_traces ? build_traces(session_id, events) : Promise.resolve(null),
    opts.include_errors ? Promise.resolve(build_errors(events)) : Promise.resolve(null)
  ]);

  // Assemble export
  if (metadata) exportData.metadata = metadata;
  if (summary) exportData.summary = summary;
  if (timeline) exportData.timeline = timeline;
  if (events_by_type) exportData.events_by_type = events_by_type;
  if (tracesData) exportData.traces = tracesData;
  if (errorsData) exportData.errors = errorsData;

  // Serialize to JSON
  const indent = opts.pretty_print && !opts.compress ? 2 : 0;
  const json = JSON.stringify(exportData, null, indent);

  log(`Exported session ${session_id} to JSON (${json.length} bytes)`);

  return json;
}

/**
 * Generate export filename for a session
 */
export function get_export_filename(
  session_id: string,
  format: 'json' | 'jsonl' = 'json',
  opts?: { app_name?: string; tags?: string[] }
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', 'T').slice(0, 15);

  if (opts?.app_name) {
    const parts = ['session', opts.app_name];
    if (opts.tags && opts.tags.length > 0) {
      parts.push(...opts.tags.map(t => t.replace(/[^a-zA-Z0-9_-]/g, '_')));
    }
    parts.push(timestamp);
    return `${parts.join('_')}.${format}`;
  }

  const cleanSessionId = session_id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `session_${cleanSessionId}_${timestamp}.${format}`;
}

/**
 * Export session and write to file
 * Returns file path where session was written
 */
export async function export_session_to_file(
  session_id: string,
  output_path?: string,
  options?: ExportOptions
): Promise<string> {
  log(`Exporting session to file: ${session_id}`);

  // Generate JSON export
  const json = await export_session_to_json(session_id, options);

  // Determine output path
  let filepath: string;
  if (output_path) {
    // Use provided path
    filepath = output_path;
  } else {
    // Generate default path
    const filename = get_export_filename(session_id, 'json');
    filepath = path.join(DEFAULT_OUTPUT_DIR, filename);
  }

  // Ensure directory exists
  const dir = path.dirname(filepath);
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(filepath, json, 'utf-8');

  log(`Wrote session export to: ${filepath}`);

  return filepath;
}

/**
 * Export multiple sessions to separate files
 * Returns array of file paths
 */
export async function export_sessions_batch(
  session_ids: string[],
  output_dir?: string,
  options?: ExportOptions,
  naming?: { app_name?: string; tags?: string[] }
): Promise<string[]> {
  log(`Batch exporting ${session_ids.length} sessions`);

  const dir = output_dir || DEFAULT_OUTPUT_DIR;

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Export each session
  const filepaths: string[] = [];

  for (let i = 0; i < session_ids.length; i++) {
    const session_id = session_ids[i];
    let filename = get_export_filename(session_id, 'json', naming);
    // Disambiguate when batch exporting multiple sessions (same-second timestamps)
    if (session_ids.length > 1) {
      filename = filename.replace(/\.json$/, `_${i + 1}.json`);
    }
    const filepath = path.join(dir, filename);

    try {
      const json = await export_session_to_json(session_id, options);
      await fs.writeFile(filepath, json, 'utf-8');
      filepaths.push(filepath);
      log(`Exported session ${session_id} to ${filepath}`);
    } catch (error: any) {
      log(`Error exporting session ${session_id}: ${error.message}`);
      // Continue with other sessions
    }
  }

  log(`Batch export complete: ${filepaths.length}/${session_ids.length} successful`);

  return filepaths;
}

/**
 * Export session to JSONL format (one event per line)
 * More efficient for large sessions
 */
export async function export_session_to_jsonl(
  session_id: string,
  output_path?: string
): Promise<string> {
  log(`Exporting session to JSONL: ${session_id}`);

  // Get all events for the session
  const result = await core.getEventsBySession(session_id, { limit: 10000 });
  const events = result.events;

  // Sort by timestamp
  const sortedEvents = [...events].sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Convert to JSONL (one JSON object per line)
  const lines = sortedEvents.map((evt: any) => JSON.stringify(evt));
  const jsonl = lines.join('\n');

  // Determine output path
  let filepath: string;
  if (output_path) {
    filepath = output_path;
  } else {
    const filename = get_export_filename(session_id, 'jsonl');
    filepath = path.join(DEFAULT_OUTPUT_DIR, filename);
  }

  // Ensure directory exists
  const dir = path.dirname(filepath);
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(filepath, jsonl, 'utf-8');

  log(`Wrote JSONL export to: ${filepath} (${events.length} events)`);

  return filepath;
}
