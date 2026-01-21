/**
 * Quick test script for ReflectionsClient Phase 1.5 exploration utilities
 *
 * Run with: npx ts-node packages/ts_common/src/apis/test_reflections_exploration.ts
 */

import { createClient } from './reflections';

async function testExplorationUtilities() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ReflectionsClient Phase 1.5 - Exploration Utilities Test ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const client = createClient({
    endpoint: '/api/insights/query',
    enable_cache: false, // Disable cache for testing
    verbose: true,
  });

  try {
    // Test 1: Get Event Types
    console.log('Test 1: Getting event types...');
    const types = await client.getEventTypes();
    console.log(`✓ Found ${types.length} event types:`, types);
    console.log('');

    // Test 2: Get Event Type Stats
    console.log('Test 2: Getting event type statistics...');
    const stats = await client.getEventTypeStats();
    console.log(`✓ Event type stats (${stats.length} types):`);
    stats.slice(0, 3).forEach(s => {
      console.log(`  - ${s.event_type}: ${s.count} events, payload keys: ${s.sample_payload_keys.join(', ')}`);
    });
    console.log('');

    // Test 3: Get Sessions
    console.log('Test 3: Getting sessions...');
    const sessions = await client.getSessions(5);
    console.log(`✓ Found ${sessions.length} sessions:`, sessions.slice(0, 3));
    console.log('');

    // Test 4: Get Traces
    console.log('Test 4: Getting traces...');
    const traces = await client.getTraces(5);
    console.log(`✓ Found ${traces.length} traces:`, traces.slice(0, 3));
    console.log('');

    // Test 5: Get All Tags
    console.log('Test 5: Getting all tags...');
    const tags = await client.getAllTags();
    console.log(`✓ Found ${tags.length} tags:`, tags);
    console.log('');

    // Test 6: Get Time Range
    console.log('Test 6: Getting time range...');
    const timeRange = await client.getTimeRange();
    console.log(`✓ Time range:`);
    console.log(`  - Earliest: ${new Date(timeRange.earliest).toISOString()}`);
    console.log(`  - Latest: ${new Date(timeRange.latest).toISOString()}`);
    console.log(`  - Span: ${timeRange.span_days.toFixed(2)} days`);
    console.log(`  - Total events: ${timeRange.total_events}`);
    console.log('');

    // Test 7: Get Database Stats
    console.log('Test 7: Getting database stats...');
    const dbStats = await client.getDatabaseStats();
    console.log(`✓ Database stats:`);
    console.log(`  - Total events: ${dbStats.total_events}`);
    console.log(`  - Event types: ${dbStats.event_types.length}`);
    console.log(`  - Sessions: ${dbStats.sessions.length}`);
    console.log(`  - Traces: ${dbStats.traces.length}`);
    console.log(`  - Apps: ${dbStats.apps.join(', ')}`);
    console.log(`  - Users: ${dbStats.users.length}`);
    console.log('');

    // Test 8: Inspect Payload Schema (if we have event types)
    if (types.length > 0) {
      console.log(`Test 8: Inspecting payload schema for '${types[0]}'...`);
      const schema = await client.inspectPayloadSchema(types[0]);
      console.log(`✓ Payload schema:`);
      console.log(`  - Total events: ${schema.total_events}`);
      console.log(`  - Common fields: ${schema.common_fields.join(', ')}`);
      console.log(`  - Optional fields: ${schema.optional_fields.join(', ')}`);
      console.log(`  - Field details: ${schema.fields.length} fields`);
      console.log('');
    }

    // Test 9: Inspect Session (if we have sessions)
    if (sessions.length > 0) {
      console.log(`Test 9: Inspecting session '${sessions[0]}'...`);
      const sessionInspection = await client.inspectSession(sessions[0]);
      console.log(`✓ Session inspection:`);
      console.log(`  - Events: ${sessionInspection.event_count}`);
      console.log(`  - Duration: ${sessionInspection.duration_ms}ms`);
      console.log(`  - Event types:`, Object.keys(sessionInspection.event_types).join(', '));
      console.log(`  - Traces: ${sessionInspection.traces.length}`);
      console.log('');
    }

    // Test 10: Inspect Trace (if we have traces)
    if (traces.length > 0) {
      console.log(`Test 10: Inspecting trace '${traces[0]}'...`);
      const traceInspection = await client.inspectTrace(traces[0]);
      console.log(`✓ Trace inspection:`);
      console.log(`  - Events: ${traceInspection.event_count}`);
      console.log(`  - Has root: ${traceInspection.has_root}`);
      console.log(`  - Chain depth: ${traceInspection.chain_structure.depth}`);
      console.log(`  - Branches: ${traceInspection.chain_structure.branches}`);
      console.log(`  - Leaf count: ${traceInspection.chain_structure.leaf_count}`);
      console.log('');
    }

    // Test 11: Sample Events
    if (types.length > 0) {
      console.log(`Test 11: Sampling events of type '${types[0]}'...`);
      const samples = await client.sampleEvents(types[0], 2);
      console.log(`✓ Sampled ${samples.length} events`);
      samples.forEach((e, i) => {
        console.log(`  Event ${i + 1}: ${e.event_id}, session: ${e.session_id}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ All exploration utilities tests passed!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('✗ Test failed:', error);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testExplorationUtilities()
    .then(() => {
      console.log('Tests complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests failed:', error);
      process.exit(1);
    });
}

export { testExplorationUtilities };
