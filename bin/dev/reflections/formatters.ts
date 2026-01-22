/**
 * Pretty printing and visualization helpers for REPL display
 */

/**
 * Format event for REPL display
 */
export function formatEvent(event: any): string {
  const timestamp = new Date(event.timestamp).toLocaleString();
  return `
Event: ${event.event_id}
Type: ${event.event_type}
Session: ${event.session_id}
Time: ${timestamp}
User: ${event.user_id || 'N/A'}
App: ${event.app_name} (${event.app_version})
${event.tags?.length ? `Tags: ${event.tags.join(', ')}` : ''}
${event.duration_ms ? `Duration: ${event.duration_ms}ms` : ''}
Payload: ${JSON.stringify(event.payload, null, 2)}
`.trim();
}

/**
 * Format session summary for display
 */
export function formatSessionSummary(summary: any): string {
  return `
Session: ${summary.session_id}
Events: ${summary.event_count}
Duration: ${summary.duration_ms}ms
Errors: ${summary.errors_count}
LLM Calls: ${summary.llm_invocations}
Total Tokens: ${summary.total_tokens}
Executions: ${summary.executions_count}
Traces: ${summary.traces?.length || 0}

Event Types:
${Object.entries(summary.event_types || {})
  .map(([type, count]) => `  ${type}: ${count}`)
  .join('\n')}
`.trim();
}

/**
 * Format error with context
 */
export function formatError(error: any, context?: any[]): string {
  const timestamp = new Date(error.timestamp).toLocaleString();
  let output = `
ERROR EVENT
===========
Event ID: ${error.event_id}
Type: ${error.event_type}
Session: ${error.session_id}
Time: ${timestamp}
Message: ${error.payload?.error || error.payload?.error_message || 'N/A'}
Status: ${error.payload?.status || 'N/A'}

Payload:
${JSON.stringify(error.payload, null, 2)}
`.trim();

  if (context && context.length > 0) {
    output += '\n\nCONTEXT EVENTS:\n';
    context.forEach((evt, idx) => {
      output += `\n${idx + 1}. [${evt.event_type}] ${new Date(evt.timestamp).toLocaleString()}`;
    });
  }

  return output;
}

/**
 * Format trace tree
 */
export function formatTraceTree(trace: any): string {
  let output = `
Trace: ${trace.trace_id}
Events: ${trace.event_count}
Duration: ${trace.duration_ms}ms
Sessions: ${trace.sessions?.length || 0}
`.trim();

  if (trace.events && trace.events.length > 0) {
    output += '\n\nEvent Chain:\n';
    trace.events.forEach((evt: any, idx: number) => {
      const indent = '  '.repeat(evt.depth || 0);
      output += `\n${indent}${idx + 1}. [${evt.event_type}] ${evt.event_id.substring(0, 8)}`;
    });
  }

  return output;
}

/**
 * Format performance metrics
 */
export function formatPerformanceMetrics(metrics: any): string {
  return `
PERFORMANCE METRICS
===================
Total Invocations: ${metrics.total_invocations}
Total Tokens: ${metrics.total_tokens}
Prompt Tokens: ${metrics.total_prompt_tokens}
Completion Tokens: ${metrics.total_completion_tokens}

By Model:
${Object.entries(metrics.by_model || {})
  .map(([model, stats]: [string, any]) =>
    `  ${model}: ${stats.count} calls, ${stats.total_tokens} tokens`)
  .join('\n')}

By Provider:
${Object.entries(metrics.by_provider || {})
  .map(([provider, stats]: [string, any]) =>
    `  ${provider}: ${stats.count} calls, ${stats.total_tokens} tokens`)
  .join('\n')}
`.trim();
}

/**
 * Format table (for stats)
 */
export function formatTable(rows: any[], columns: string[]): string {
  if (rows.length === 0) {
    return 'No data';
  }

  // Calculate column widths
  const columnWidths = columns.map(col =>
    Math.max(col.length, ...rows.map(row => String(row[col] || '').length))
  );

  // Build header
  const headerRow = columns.map((col, i) => col.padEnd(columnWidths[i])).join(' | ');
  const separator = columnWidths.map(w => '-'.repeat(w)).join('-+-');

  // Build data rows
  const dataRows = rows.map(row =>
    columns.map((col, i) => String(row[col] || '').padEnd(columnWidths[i])).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * Format error summary list
 */
export function formatErrorList(errors: any[]): string {
  if (errors.length === 0) {
    return 'No errors found';
  }

  return errors.map((error, idx) => {
    const timestamp = new Date(error.timestamp).toLocaleString();
    const message = error.error_message || error.payload?.error || 'Unknown error';
    return `${idx + 1}. [${error.event_type}] ${timestamp}\n   ${message}\n   Session: ${error.session_id}`;
  }).join('\n\n');
}

/**
 * Format session list
 */
export function formatSessionList(sessions: any[]): string {
  if (sessions.length === 0) {
    return 'No sessions found';
  }

  return formatTable(
    sessions.map(s => ({
      session_id: s.session_id.substring(0, 12) + '...',
      app: s.app_name,
      events: s.event_count,
      duration: `${s.duration_ms}ms`,
      errors: s.error_count || 0
    })),
    ['session_id', 'app', 'events', 'duration', 'errors']
  );
}
