import common from "../../../packages/ts_common/dist/index";
import * as core from "./core";

const log = common.logger.get_logger({ id: 'reflections.traces' });

/**
 * Get all traces
 */
export async function get_traces(limit: number = 20) {
  log(`Getting ${limit} traces`);

  // Query events with trace_id, group by trace_id
  const result = await core.queryEvents({
    limit: limit * 10,  // Get more events to find unique traces
    order_by: 'timestamp DESC'
  });

  // Extract unique trace IDs
  const traceIds = new Set<string>();
  result.events.forEach((evt: any) => {
    if (evt.trace_id && traceIds.size < limit) {
      traceIds.add(evt.trace_id);
    }
  });

  // Get details for each trace
  const traces = await Promise.all(
    Array.from(traceIds).map(async (trace_id) => {
      const trace = await core.inspectTrace(trace_id);
      return trace;
    })
  );

  log(`Found ${traces.length} traces`);

  return traces;
}

/**
 * Inspect trace chain
 */
export async function inspect_trace(trace_id: string) {
  log(`Inspecting trace: ${trace_id}`);

  const trace = await core.inspectTrace(trace_id);
  const events = await core.getEventsByTrace(trace_id);

  return {
    ...trace,
    events: events.events
  };
}

/**
 * Get trace events
 */
export async function get_trace_events(trace_id: string) {
  log(`Getting events for trace: ${trace_id}`);

  const result = await core.getEventsByTrace(trace_id);

  // Sort by timestamp
  const sortedEvents = result.events.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    trace_id,
    event_count: sortedEvents.length,
    events: sortedEvents
  };
}

/**
 * Find traces with errors
 */
export async function find_traces_with_errors(limit: number = 10) {
  log(`Finding traces with errors`);

  // Query error events
  const result = await core.queryEvents({
    tags: ['error'],
    limit: limit * 5,
    order_by: 'timestamp DESC'
  });

  // Extract unique trace IDs
  const traceIds = new Set<string>();
  result.events.forEach((evt: any) => {
    if (evt.trace_id && traceIds.size < limit) {
      traceIds.add(evt.trace_id);
    }
  });

  // Get details for each trace
  const traces = await Promise.all(
    Array.from(traceIds).map(async (trace_id) => {
      const trace = await core.inspectTrace(trace_id);
      const errors = result.events.filter((e: any) => e.trace_id === trace_id);
      return {
        ...trace,
        error_count: errors.length,
        errors
      };
    })
  );

  log(`Found ${traces.length} traces with errors`);

  return traces;
}

/**
 * Visualize trace chain (ASCII tree)
 */
export async function visualize_trace(trace_id: string) {
  log(`Visualizing trace: ${trace_id}`);

  const trace = await core.inspectTrace(trace_id);
  const events = await core.getEventsByTrace(trace_id);

  // Sort by timestamp
  const sortedEvents = events.events.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Build tree structure based on parent_event_id
  const eventMap = new Map<string, any>();
  sortedEvents.forEach((evt: any) => {
    eventMap.set(evt.event_id, { ...evt, children: [] });
  });

  // Link children to parents
  const roots: any[] = [];
  sortedEvents.forEach((evt: any) => {
    const node = eventMap.get(evt.event_id);
    if (evt.parent_event_id && eventMap.has(evt.parent_event_id)) {
      const parent = eventMap.get(evt.parent_event_id);
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Build ASCII tree
  const lines: string[] = [];
  lines.push(`Trace: ${trace_id}`);
  lines.push(`Events: ${trace.event_count} | Duration: ${trace.duration_ms}ms`);
  lines.push('');

  function renderNode(node: any, prefix: string = '', isLast: boolean = true) {
    const connector = isLast ? '└─ ' : '├─ ';
    const timestamp = new Date(node.timestamp).toLocaleTimeString();
    const duration = node.duration_ms ? ` (${node.duration_ms}ms)` : '';
    const errorFlag = node.tags?.includes('error') ? ' ❌' : '';

    lines.push(`${prefix}${connector}[${node.event_type}] ${timestamp}${duration}${errorFlag}`);

    const childPrefix = prefix + (isLast ? '   ' : '│  ');
    node.children.forEach((child: any, idx: number) => {
      renderNode(child, childPrefix, idx === node.children.length - 1);
    });
  }

  roots.forEach((root, idx) => {
    renderNode(root, '', idx === roots.length - 1);
  });

  const visualization = lines.join('\n');
  log(`Generated trace visualization`);

  return {
    trace_id,
    trace_info: trace,
    visualization
  };
}

/**
 * Get longest traces (by event count or duration)
 */
export async function get_longest_traces(limit: number = 10, by: 'events' | 'duration' = 'events') {
  log(`Finding longest traces by ${by}`);

  // Get many traces
  const allTraces = await get_traces(50);

  // Sort by criteria
  const sorted = allTraces.sort((a, b) => {
    if (by === 'events') {
      return b.event_count - a.event_count;
    } else {
      return b.duration_ms - a.duration_ms;
    }
  });

  const longest = sorted.slice(0, limit);

  log(`Found ${longest.length} longest traces`);

  return longest;
}

/**
 * Get trace timeline with all events
 */
export async function get_trace_timeline(trace_id: string) {
  log(`Getting timeline for trace: ${trace_id}`);

  const events = await core.getEventsByTrace(trace_id);

  // Sort by timestamp
  const timeline = events.events.sort((a: any, b: any) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate intervals
  const withIntervals = timeline.map((evt: any, idx: number) => {
    if (idx === 0) {
      return { ...evt, interval_ms: 0 };
    }
    const prevTime = new Date(timeline[idx - 1].timestamp).getTime();
    const currTime = new Date(evt.timestamp).getTime();
    return {
      ...evt,
      interval_ms: currTime - prevTime
    };
  });

  return {
    trace_id,
    event_count: withIntervals.length,
    total_duration_ms: withIntervals[withIntervals.length - 1]
      ? new Date(withIntervals[withIntervals.length - 1].timestamp).getTime() -
        new Date(withIntervals[0].timestamp).getTime()
      : 0,
    timeline: withIntervals
  };
}

/**
 * Compare two traces
 */
export async function compare_traces(trace_id1: string, trace_id2: string) {
  log(`Comparing traces: ${trace_id1} vs ${trace_id2}`);

  const [trace1, trace2] = await Promise.all([
    core.inspectTrace(trace_id1),
    core.inspectTrace(trace_id2)
  ]);

  const [events1, events2] = await Promise.all([
    core.getEventsByTrace(trace_id1),
    core.getEventsByTrace(trace_id2)
  ]);

  // Compare event types
  const types1 = new Set(events1.events.map((e: any) => e.event_type));
  const types2 = new Set(events2.events.map((e: any) => e.event_type));
  const commonTypes = new Set([...types1].filter(t => types2.has(t)));
  const uniqueToTrace1 = new Set([...types1].filter(t => !types2.has(t)));
  const uniqueToTrace2 = new Set([...types2].filter(t => !types1.has(t)));

  return {
    trace1: {
      trace_id: trace_id1,
      event_count: trace1.event_count,
      duration_ms: trace1.duration_ms,
      event_types: Array.from(types1)
    },
    trace2: {
      trace_id: trace_id2,
      event_count: trace2.event_count,
      duration_ms: trace2.duration_ms,
      event_types: Array.from(types2)
    },
    comparison: {
      common_event_types: Array.from(commonTypes),
      unique_to_trace1: Array.from(uniqueToTrace1),
      unique_to_trace2: Array.from(uniqueToTrace2),
      event_count_diff: trace1.event_count - trace2.event_count,
      duration_diff_ms: trace1.duration_ms - trace2.duration_ms
    }
  };
}
