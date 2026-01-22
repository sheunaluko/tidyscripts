import common from "../../../packages/ts_common/dist/index";
import * as core from "./core";

const log = common.logger.get_logger({ id: 'reflections.performance' });

/**
 * Get LLM token usage summary
 */
export async function get_token_usage(session_id?: string, app_name?: string) {
  let events;

  if (session_id) {
    log(`Analyzing token usage for session: ${session_id}`);
    const result = await core.getEventsBySession(session_id);
    events = result.events.filter((e: any) => e.event_type === 'llm_invocation');
  } else if (app_name) {
    log(`Analyzing token usage for app: ${app_name}`);
    const result = await core.getEventsByType('llm_invocation', { app_name });
    events = result.events;
  } else {
    log(`Analyzing all LLM token usage`);
    const result = await core.getEventsByType('llm_invocation', { limit: 200 });
    events = result.events;
  }

  // Aggregate token stats
  const stats = {
    total_invocations: events.length,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    by_model: {} as Record<string, any>,
    by_provider: {} as Record<string, any>
  };

  events.forEach((event: any) => {
    const p = event.payload;
    const promptTokens = p.prompt_tokens || 0;
    const completionTokens = p.completion_tokens || 0;

    stats.total_prompt_tokens += promptTokens;
    stats.total_completion_tokens += completionTokens;
    stats.total_tokens += promptTokens + completionTokens;

    // Group by model
    const model = p.model || 'unknown';
    if (!stats.by_model[model]) {
      stats.by_model[model] = {
        count: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
    }
    stats.by_model[model].count++;
    stats.by_model[model].prompt_tokens += promptTokens;
    stats.by_model[model].completion_tokens += completionTokens;
    stats.by_model[model].total_tokens += promptTokens + completionTokens;

    // Group by provider
    const provider = p.provider || 'unknown';
    if (!stats.by_provider[provider]) {
      stats.by_provider[provider] = {
        count: 0,
        total_tokens: 0
      };
    }
    stats.by_provider[provider].count++;
    stats.by_provider[provider].total_tokens += promptTokens + completionTokens;
  });

  log(`Analyzed ${stats.total_invocations} LLM invocations`);

  return stats;
}

/**
 * Find high token events
 */
export async function find_high_token_events(threshold: number = 10000, limit: number = 20) {
  log(`Finding LLM invocations with > ${threshold} tokens`);

  const result = await core.getEventsByType('llm_invocation', { limit: 200 });

  // Filter and calculate total tokens
  const highTokenEvents = result.events
    .map((e: any) => ({
      ...e,
      total_tokens: (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0)
    }))
    .filter((e: any) => e.total_tokens > threshold)
    .sort((a: any, b: any) => b.total_tokens - a.total_tokens)
    .slice(0, limit);

  log(`Found ${highTokenEvents.length} high token events`);

  return highTokenEvents.map((e: any) => ({
    event_id: e.event_id,
    session_id: e.session_id,
    timestamp: e.timestamp,
    model: e.payload.model,
    provider: e.payload.provider,
    prompt_tokens: e.payload.prompt_tokens,
    completion_tokens: e.payload.completion_tokens,
    total_tokens: e.total_tokens,
    context: e.payload.context
  }));
}

/**
 * Find slow executions
 */
export async function find_slow_executions(threshold_ms: number = 1000, limit: number = 20) {
  log(`Finding executions slower than ${threshold_ms}ms`);

  const result = await core.getEventsByType('execution', { limit: 200 });

  // Filter by duration
  const slowExecutions = result.events
    .filter((e: any) => e.duration_ms && e.duration_ms > threshold_ms)
    .sort((a: any, b: any) => b.duration_ms - a.duration_ms)
    .slice(0, limit);

  log(`Found ${slowExecutions.length} slow executions`);

  return slowExecutions.map((e: any) => ({
    event_id: e.event_id,
    session_id: e.session_id,
    timestamp: e.timestamp,
    duration_ms: e.duration_ms,
    operation: e.payload.operation || e.payload.function_name,
    status: e.payload.status,
    app_name: e.app_name
  }));
}

/**
 * Get LLM invocation stats
 */
export async function get_llm_stats(app_name?: string) {
  log(`Getting LLM stats${app_name ? ` for app: ${app_name}` : ''}`);

  const result = await core.getEventsByType('llm_invocation', {
    app_name,
    limit: 500
  });

  // Calculate statistics
  const durations: number[] = [];
  const promptTokens: number[] = [];
  const completionTokens: number[] = [];
  const totalTokens: number[] = [];

  result.events.forEach((e: any) => {
    if (e.duration_ms) durations.push(e.duration_ms);
    if (e.payload.prompt_tokens) promptTokens.push(e.payload.prompt_tokens);
    if (e.payload.completion_tokens) completionTokens.push(e.payload.completion_tokens);
    const total = (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0);
    if (total > 0) totalTokens.push(total);
  });

  // Helper functions
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  };

  const stats = {
    total_invocations: result.events.length,
    duration_stats: {
      avg: Math.round(avg(durations)),
      median: Math.round(median(durations)),
      p95: Math.round(percentile(durations, 95)),
      p99: Math.round(percentile(durations, 99)),
      max: durations.length > 0 ? Math.max(...durations) : 0
    },
    token_stats: {
      avg_prompt: Math.round(avg(promptTokens)),
      avg_completion: Math.round(avg(completionTokens)),
      avg_total: Math.round(avg(totalTokens)),
      median_total: Math.round(median(totalTokens)),
      p95_total: Math.round(percentile(totalTokens, 95)),
      p99_total: Math.round(percentile(totalTokens, 99)),
      max_total: totalTokens.length > 0 ? Math.max(...totalTokens) : 0
    }
  };

  log(`Calculated stats for ${stats.total_invocations} invocations`);

  return stats;
}

/**
 * Analyze token spikes (sudden increases)
 */
export async function analyze_token_spikes(session_id: string) {
  log(`Analyzing token spikes for session: ${session_id}`);

  const result = await core.getEventsBySession(session_id);
  const llmEvents = result.events
    .filter((e: any) => e.event_type === 'llm_invocation')
    .sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  if (llmEvents.length === 0) {
    return { spikes: [], average_tokens: 0 };
  }

  // Calculate average tokens per invocation
  const totalTokens = llmEvents.reduce((sum: number, e: any) =>
    sum + (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0), 0
  );
  const avgTokens = totalTokens / llmEvents.length;

  // Find spikes (2x or more above average)
  const threshold = avgTokens * 2;
  const spikes = llmEvents
    .map((e: any) => ({
      event_id: e.event_id,
      timestamp: e.timestamp,
      model: e.payload.model,
      prompt_tokens: e.payload.prompt_tokens || 0,
      completion_tokens: e.payload.completion_tokens || 0,
      total_tokens: (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0),
      context: e.payload.context
    }))
    .filter((e: any) => e.total_tokens > threshold)
    .sort((a: any, b: any) => b.total_tokens - a.total_tokens);

  log(`Found ${spikes.length} token spikes (threshold: ${threshold.toFixed(0)} tokens)`);

  return {
    spikes,
    average_tokens: avgTokens,
    threshold,
    total_invocations: llmEvents.length
  };
}

/**
 * Get performance summary for session
 */
export async function get_session_performance(session_id: string) {
  log(`Getting performance summary for session: ${session_id}`);

  const result = await core.getEventsBySession(session_id);

  // Extract LLM invocations
  const llmEvents = result.events.filter((e: any) => e.event_type === 'llm_invocation');
  const totalTokens = llmEvents.reduce((sum: number, e: any) =>
    sum + (e.payload.prompt_tokens || 0) + (e.payload.completion_tokens || 0), 0
  );
  const avgTokens = llmEvents.length > 0 ? totalTokens / llmEvents.length : 0;

  const llmDurations = llmEvents.filter((e: any) => e.duration_ms).map((e: any) => e.duration_ms);
  const avgLLMDuration = llmDurations.length > 0
    ? llmDurations.reduce((a: number, b: number) => a + b, 0) / llmDurations.length
    : 0;

  // Extract executions
  const executions = result.events.filter((e: any) => e.event_type === 'execution');
  const executionDurations = executions.filter((e: any) => e.duration_ms).map((e: any) => e.duration_ms);
  const avgExecutionDuration = executionDurations.length > 0
    ? executionDurations.reduce((a: number, b: number) => a + b, 0) / executionDurations.length
    : 0;

  // Session duration
  const timestamps = result.events
    .map((e: any) => new Date(e.timestamp).getTime())
    .sort((a: number, b: number) => a - b);
  const sessionDuration = timestamps.length > 1
    ? timestamps[timestamps.length - 1] - timestamps[0]
    : 0;

  return {
    session_id,
    duration_ms: sessionDuration,
    llm_performance: {
      total_invocations: llmEvents.length,
      total_tokens: totalTokens,
      avg_tokens_per_call: Math.round(avgTokens),
      avg_duration_ms: Math.round(avgLLMDuration),
      total_llm_time_ms: llmDurations.reduce((a: number, b: number) => a + b, 0)
    },
    execution_performance: {
      total_executions: executions.length,
      avg_duration_ms: Math.round(avgExecutionDuration),
      total_execution_time_ms: executionDurations.reduce((a: number, b: number) => a + b, 0),
      slowest_execution_ms: executionDurations.length > 0 ? Math.max(...executionDurations) : 0
    }
  };
}

/**
 * Compare performance across sessions
 */
export async function compare_session_performance(session_ids: string[]) {
  log(`Comparing performance across ${session_ids.length} sessions`);

  const performances = await Promise.all(
    session_ids.map(session_id => get_session_performance(session_id))
  );

  return {
    sessions: performances,
    comparison: {
      avg_tokens: Math.round(
        performances.reduce((sum, p) => sum + p.llm_performance.avg_tokens_per_call, 0) / performances.length
      ),
      avg_llm_duration: Math.round(
        performances.reduce((sum, p) => sum + p.llm_performance.avg_duration_ms, 0) / performances.length
      ),
      total_tokens: performances.reduce((sum, p) => sum + p.llm_performance.total_tokens, 0)
    }
  };
}

/**
 * Get token usage over time
 */
export async function get_token_usage_over_time(app_name?: string, hours: number = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  log(`Getting token usage over last ${hours} hours${app_name ? ` for app: ${app_name}` : ''}`);

  const result = await core.getEventsByType('llm_invocation', {
    app_name,
    limit: 1000
  });

  // Filter by start_time
  const filteredEvents = result.events.filter((e: any) => e.timestamp >= startTime);

  // Group by hour
  const byHour: Record<string, any> = {};

  filteredEvents.forEach((event: any) => {
    const hour = new Date(event.timestamp).toISOString().substring(0, 13);
    if (!byHour[hour]) {
      byHour[hour] = {
        hour,
        count: 0,
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0
      };
    }
    byHour[hour].count++;
    byHour[hour].prompt_tokens += event.payload.prompt_tokens || 0;
    byHour[hour].completion_tokens += event.payload.completion_tokens || 0;
    byHour[hour].total_tokens += (event.payload.prompt_tokens || 0) + (event.payload.completion_tokens || 0);
  });

  // Convert to sorted array
  const timeline = Object.values(byHour).sort((a: any, b: any) => a.hour.localeCompare(b.hour));

  log(`Analyzed ${filteredEvents.length} invocations across ${timeline.length} hours`);

  return {
    timeline,
    total_invocations: filteredEvents.length,
    total_tokens: timeline.reduce((sum: number, h: any) => sum + h.total_tokens, 0)
  };
}
