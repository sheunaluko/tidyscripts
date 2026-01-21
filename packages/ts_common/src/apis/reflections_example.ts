/**
 * ReflectionsClient Usage Examples
 *
 * Demonstrates how to use ReflectionsClient for querying and analyzing
 * Insights events.
 */

import { createClient, setDefaultClient, getDefaultClient } from './reflections';

// ============================================================================
// Example 1: Basic Setup
// ============================================================================

export async function example1_basic_setup() {
  console.log('\n=== Example 1: Basic Setup ===\n');

  // Create a client with default settings
  const client = createClient();

  console.log('Created ReflectionsClient with config:', client.getConfig());

  // Or create with custom settings
  const customClient = createClient({
    enable_cache: true,
    cache_ttl_ms: 120000, // 2 minutes
    verbose: true,
    silent_failure: true,
    slow_llm_threshold_ms: 3000, // 3 seconds
  });

  console.log('Created custom client with config:', customClient.getConfig());
}

// ============================================================================
// Example 2: Query Events by Session
// ============================================================================

export async function example2_query_by_session(session_id: string) {
  console.log('\n=== Example 2: Query Events by Session ===\n');

  const client = createClient({ enable_cache: true });

  try {
    // Query all events for a session
    const result = await client.getEventsBySession(session_id, { limit: 100 });

    console.log(`Found ${result.total_count} events for session ${session_id}`);
    console.log(`Query time: ${result.query_time_ms}ms`);
    console.log(`From cache: ${result.from_cache}`);

    if (result.events.length > 0) {
      console.log('\nFirst event:');
      console.log(JSON.stringify(result.events[0], null, 2));
    }

    // Query again - should hit cache
    const cachedResult = await client.getEventsBySession(session_id, { limit: 100 });
    console.log(`\nSecond query from cache: ${cachedResult.from_cache}`);
    console.log(`Query time: ${cachedResult.query_time_ms}ms`);

    // Get cache stats
    const cacheStats = client.getCacheStats();
    console.log('\nCache stats:', cacheStats);
  } catch (error) {
    console.error('Error querying session:', error);
  }
}

// ============================================================================
// Example 3: Query Events by Type
// ============================================================================

export async function example3_query_by_type() {
  console.log('\n=== Example 3: Query Events by Type ===\n');

  const client = createClient();

  try {
    // Query all LLM invocation events
    const llmResult = await client.getEventsByType('llm_invocation', { limit: 50 });

    console.log(`Found ${llmResult.total_count} LLM invocation events`);

    // Calculate some basic stats
    let totalTokens = 0;
    let totalLatency = 0;
    let errorCount = 0;

    for (const event of llmResult.events) {
      totalTokens += (event.payload.prompt_tokens || 0) + (event.payload.completion_tokens || 0);
      totalLatency += event.payload.latency_ms || 0;
      if (event.tags?.includes('error')) errorCount++;
    }

    console.log(`\nBasic Stats:`);
    console.log(`  Total tokens: ${totalTokens}`);
    console.log(`  Avg latency: ${(totalLatency / llmResult.events.length).toFixed(2)}ms`);
    console.log(`  Error count: ${errorCount}`);
    console.log(`  Error rate: ${((errorCount / llmResult.events.length) * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('Error querying by type:', error);
  }
}

// ============================================================================
// Example 4: Query Events by Trace
// ============================================================================

export async function example4_query_by_trace(trace_id: string) {
  console.log('\n=== Example 4: Query Events by Trace ===\n');

  const client = createClient();

  try {
    // Query all events in a trace (event chain)
    const result = await client.getEventsByTrace(trace_id);

    console.log(`Found ${result.total_count} events in trace ${trace_id}`);

    // Display the event chain
    console.log('\nEvent Chain:');
    for (const event of result.events) {
      console.log(`  ${event.timestamp} - ${event.event_type} (${event.event_id})`);
      if (event.parent_event_id) {
        console.log(`    ↳ Parent: ${event.parent_event_id}`);
      }
    }
  } catch (error) {
    console.error('Error querying trace:', error);
  }
}

// ============================================================================
// Example 5: Advanced Query with Filters
// ============================================================================

export async function example5_advanced_query() {
  console.log('\n=== Example 5: Advanced Query with Filters ===\n');

  const client = createClient();

  try {
    // Query with multiple filters
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;

    const result = await client.queryEvents({
      event_type: 'llm_invocation',
      timestamp_gte: yesterday,
      timestamp_lte: now,
      tags: ['error'], // Events with error tag
      limit: 20,
      sort_by: 'timestamp',
      sort_order: 'desc'
    });

    console.log(`Found ${result.total_count} LLM errors in last 24 hours`);

    if (result.events.length > 0) {
      console.log('\nRecent LLM errors:');
      for (const event of result.events.slice(0, 5)) {
        const timestamp = new Date(event.timestamp).toISOString();
        const model = event.payload.model || 'unknown';
        const error = event.payload.error || 'No error message';
        console.log(`  ${timestamp} - ${model}: ${error.substring(0, 80)}`);
      }
    }
  } catch (error) {
    console.error('Error in advanced query:', error);
  }
}

// ============================================================================
// Example 6: Cache Management
// ============================================================================

export async function example6_cache_management(session_id: string) {
  console.log('\n=== Example 6: Cache Management ===\n');

  const client = createClient({ enable_cache: true, verbose: true });

  try {
    // First query - cache miss
    console.log('First query (should miss cache)...');
    const result1 = await client.getEventsBySession(session_id);
    console.log(`From cache: ${result1.from_cache}`);

    // Second query - cache hit
    console.log('\nSecond query (should hit cache)...');
    const result2 = await client.getEventsBySession(session_id);
    console.log(`From cache: ${result2.from_cache}`);

    // Invalidate cache for this session
    console.log('\nInvalidating cache for session...');
    await client.invalidateCache(session_id);

    // Third query - cache miss again
    console.log('\nThird query (should miss cache after invalidation)...');
    const result3 = await client.getEventsBySession(session_id);
    console.log(`From cache: ${result3.from_cache}`);

    // Get cache statistics
    console.log('\nCache statistics:');
    const stats = client.getCacheStats();
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error in cache management:', error);
  }
}

// ============================================================================
// Example 7: Silent Failure Mode
// ============================================================================

export async function example7_silent_failure() {
  console.log('\n=== Example 7: Silent Failure Mode ===\n');

  // Client with silent failure enabled
  const client = createClient({
    silent_failure: true,
    endpoint: '/invalid/endpoint' // This will fail
  });

  try {
    // This will fail but not throw
    const result = await client.queryEvents({ session_id: 'test' });

    console.log('Silent failure result:');
    console.log(`  Events: ${result.events.length}`);
    console.log(`  Total count: ${result.total_count}`);
    console.log('No exception thrown - silent failure worked!');
  } catch (error) {
    console.error('Should not reach here with silent_failure enabled');
  }
}

// ============================================================================
// Example 8: Using Default Client (Singleton Pattern)
// ============================================================================

export async function example8_default_client() {
  console.log('\n=== Example 8: Default Client (Singleton) ===\n');

  // Set up default client
  const client = createClient({
    enable_cache: true,
    verbose: true
  });
  setDefaultClient(client);

  console.log('Set default ReflectionsClient');

  // Use default client anywhere in your app
  const defaultClient = getDefaultClient();
  console.log('Retrieved default client');

  try {
    const result = await defaultClient.queryEvents({ limit: 10 });
    console.log(`Default client queried ${result.total_count} events`);
  } catch (error) {
    console.error('Error with default client:', error);
  }
}

// ============================================================================
// Example 9: Integration with InsightsClient
// ============================================================================

export async function example9_integration_with_insights() {
  console.log('\n=== Example 9: Integration with InsightsClient ===\n');

  // This example shows how ReflectionsClient works alongside InsightsClient
  // Note: This requires InsightsClient to be set up

  console.log('1. InsightsClient writes events (capture side)');
  console.log('2. ReflectionsClient reads events (analysis side)');
  console.log('3. Both share the same session_id for correlation');

  // Example code (commented out - requires actual InsightsClient)
  /*
  import { createClient as createInsightsClient } from './insights';

  // Write side
  const insights = createInsightsClient({
    app_name: 'my_app',
    app_version: '1.0.0',
    user_id: 'user_123'
  });

  await insights.addEvent('user_action', { action: 'click' });

  // Read side
  const reflections = createClient();
  const session_id = insights.getSessionId();
  const analysis = await reflections.getEventsBySession(session_id);

  console.log(`Session has ${analysis.total_count} events`);
  */
}

// ============================================================================
// Example 10: Data Exploration - Event Types
// ============================================================================

export async function example10_explore_event_types() {
  console.log('\n=== Example 10: Explore Event Types ===\n');

  const client = createClient();

  try {
    // Get all event types
    const types = await client.getEventTypes();
    console.log(`Found ${types.length} event types:`, types);

    // Get detailed stats for each type
    const stats = await client.getEventTypeStats();
    console.log('\nEvent Type Statistics:');
    for (const stat of stats) {
      console.log(`  ${stat.event_type}: ${stat.count} events`);
      console.log(`    First seen: ${new Date(stat.first_seen).toISOString()}`);
      console.log(`    Last seen: ${new Date(stat.last_seen).toISOString()}`);
      console.log(`    Has duration: ${stat.has_duration}`);
      console.log(`    Has tags: ${stat.has_tags}`);
      console.log(`    Payload keys: ${stat.sample_payload_keys.join(', ')}`);
    }
  } catch (error) {
    console.error('Error exploring event types:', error);
  }
}

// ============================================================================
// Example 11: Data Exploration - Payload Schema
// ============================================================================

export async function example11_inspect_payload_schema() {
  console.log('\n=== Example 11: Inspect Payload Schema ===\n');

  const client = createClient();

  try {
    // First get event types to know what to inspect
    const types = await client.getEventTypes();

    if (types.length === 0) {
      console.log('No events in database yet');
      return;
    }

    // Inspect payload structure for first event type
    const eventType = types[0];
    const schema = await client.inspectPayloadSchema(eventType);

    console.log(`Event Type: ${schema.event_type}`);
    console.log(`Total Events: ${schema.total_events}`);
    console.log(`\nCommon Fields (>90%): ${schema.common_fields.join(', ')}`);
    console.log(`Optional Fields (<90%): ${schema.optional_fields.join(', ')}`);

    console.log('\nField Details:');
    for (const field of schema.fields.slice(0, 5)) {
      console.log(`  ${field.field_name}:`);
      console.log(`    Occurrences: ${field.occurrences}`);
      console.log(`    Types: ${field.value_types.join(', ')}`);
      console.log(`    Sample values: ${JSON.stringify(field.sample_values.slice(0, 3))}`);
    }
  } catch (error) {
    console.error('Error inspecting payload schema:', error);
  }
}

// ============================================================================
// Example 12: Data Exploration - Sessions & Traces
// ============================================================================

export async function example12_explore_sessions_traces() {
  console.log('\n=== Example 12: Explore Sessions & Traces ===\n');

  const client = createClient();

  try {
    // Get all sessions
    const sessions = await client.getSessions(10);
    console.log(`Found ${sessions.length} sessions:`, sessions);

    // Inspect first session
    if (sessions.length > 0) {
      const sessionInspection = await client.inspectSession(sessions[0]);
      console.log(`\nSession ${sessionInspection.session_id}:`);
      console.log(`  Events: ${sessionInspection.event_count}`);
      console.log(`  Duration: ${sessionInspection.duration_ms}ms`);
      console.log(`  Event types:`, sessionInspection.event_types);
      console.log(`  Traces: ${sessionInspection.traces.length}`);
    }

    // Get all traces
    const traces = await client.getTraces(10);
    console.log(`\nFound ${traces.length} traces:`, traces);

    // Inspect first trace
    if (traces.length > 0) {
      const traceInspection = await client.inspectTrace(traces[0]);
      console.log(`\nTrace ${traceInspection.trace_id}:`);
      console.log(`  Events: ${traceInspection.event_count}`);
      console.log(`  Has root: ${traceInspection.has_root}`);
      console.log(`  Chain depth: ${traceInspection.chain_structure.depth}`);
      console.log(`  Branches: ${traceInspection.chain_structure.branches}`);
      console.log(`  Leaf count: ${traceInspection.chain_structure.leaf_count}`);
    }
  } catch (error) {
    console.error('Error exploring sessions/traces:', error);
  }
}

// ============================================================================
// Example 13: Database Overview
// ============================================================================

export async function example13_database_overview() {
  console.log('\n=== Example 13: Database Overview ===\n');

  const client = createClient();

  try {
    const stats = await client.getDatabaseStats();

    console.log('Database Statistics:');
    console.log(`  Total events: ${stats.total_events}`);
    console.log(`  Event types: ${stats.event_types.length}`);
    console.log(`  Sessions: ${stats.sessions.length}`);
    console.log(`  Traces: ${stats.traces.length}`);
    console.log(`  Apps: ${stats.apps.join(', ')}`);
    console.log(`  Users: ${stats.users.length}`);
    console.log(`\nTime Range:`);
    console.log(`  Earliest: ${new Date(stats.time_range.earliest).toISOString()}`);
    console.log(`  Latest: ${new Date(stats.time_range.latest).toISOString()}`);
    console.log(`  Span: ${stats.time_range.span_days.toFixed(2)} days`);

    // Get all tags
    const tags = await client.getAllTags();
    console.log(`\nTags in use: ${tags.join(', ')}`);
  } catch (error) {
    console.error('Error getting database overview:', error);
  }
}

// ============================================================================
// Example 14: Sample Events
// ============================================================================

export async function example14_sample_events() {
  console.log('\n=== Example 14: Sample Events ===\n');

  const client = createClient();

  try {
    const types = await client.getEventTypes();

    if (types.length === 0) {
      console.log('No events in database yet');
      return;
    }

    // Sample first event type
    const eventType = types[0];
    const samples = await client.sampleEvents(eventType, 3);

    console.log(`Sample ${eventType} events (${samples.length}):`);
    for (const event of samples) {
      console.log(`\nEvent ${event.event_id}:`);
      console.log(`  Timestamp: ${new Date(event.timestamp).toISOString()}`);
      console.log(`  Session: ${event.session_id}`);
      console.log(`  Trace: ${event.trace_id || 'none'}`);
      console.log(`  Payload:`, JSON.stringify(event.payload, null, 2));
    }
  } catch (error) {
    console.error('Error sampling events:', error);
  }
}

// ============================================================================
// Run All Examples
// ============================================================================

export async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║    ReflectionsClient Usage Examples (Phases 1 & 1.5)        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await example1_basic_setup();

  // Note: These examples require a running API endpoint with data
  // Uncomment when testing with real data:

  // await example2_query_by_session('ses_example123');
  // await example3_query_by_type();
  // await example4_query_by_trace('trc_example123');
  // await example5_advanced_query();
  // await example6_cache_management('ses_example123');
  await example7_silent_failure();
  await example8_default_client();
  await example9_integration_with_insights();

  console.log('\n--- Phase 1.5: Data Exploration Examples ---');
  // These examples work with any data in the database
  // await example10_explore_event_types();
  // await example11_inspect_payload_schema();
  // await example12_explore_sessions_traces();
  // await example13_database_overview();
  // await example14_sample_events();

  console.log('\n✓ Examples completed!');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
