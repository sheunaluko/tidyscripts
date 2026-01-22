/**
 * Test script for Reflections REPL utilities
 */

import * as reflections from "./reflections";
import common from "../../packages/ts_common/dist/index";

const log = common.logger.get_logger({ id: 'reflections.test' });

export async function run_tests() {
  log("Starting Reflections utilities test...");

  try {
    // Test 1: Initialize
    log("\n=== Test 1: Initialize ===");
    const { client, stats } = await reflections.init();
    log(`✓ Initialized: ${stats.total_events} events, ${stats.total_sessions} sessions`);

    // Test 2: Get recent sessions
    log("\n=== Test 2: Get Recent Sessions ===");
    const recentSessions = await reflections.get_recent_sessions(3);
    log(`✓ Found ${recentSessions.length} recent sessions`);
    if (recentSessions.length > 0) {
      log(`  First session: ${recentSessions[0].session_id}`);
    }

    // Test 3: Get most recent session for app (if cortex exists)
    log("\n=== Test 3: Get Most Recent Session for App ===");
    try {
      const cortexSession = await reflections.get_most_recent_session_for_app('cortex');
      if (cortexSession) {
        log(`✓ Found cortex session: ${cortexSession.session_id}`);
      } else {
        log(`  No cortex sessions found (this is OK)`);
      }
    } catch (e) {
      log(`  Error finding cortex session: ${e}`);
    }

    // Test 4: Find recent errors
    log("\n=== Test 4: Find Recent Errors ===");
    const recentErrors = await reflections.get_recent_errors(24);
    log(`✓ Found ${recentErrors.length} errors in last 24 hours`);

    // Test 5: Get traces
    log("\n=== Test 5: Get Traces ===");
    const traces = await reflections.get_traces(3);
    log(`✓ Found ${traces.length} traces`);

    // Test 6: Get token usage
    log("\n=== Test 6: Get Token Usage ===");
    const tokenStats = await reflections.get_token_usage();
    log(`✓ Token usage: ${tokenStats.total_tokens} tokens across ${tokenStats.total_invocations} invocations`);

    // Test 7: Test formatters
    log("\n=== Test 7: Test Formatters ===");
    if (recentSessions.length > 0) {
      const summary = await reflections.summarize_session(recentSessions[0].session_id);
      const formatted = reflections.formatSessionSummary(summary);
      log(`✓ Formatted session summary (${formatted.length} chars)`);
    }

    // Test 8: Client stats
    log("\n=== Test 8: Client Stats ===");
    const clientStats = reflections.core.getClientStats();
    log(`✓ Client stats: ${JSON.stringify(clientStats)}`);

    log("\n=== All Tests Passed! ===");
    return {
      success: true,
      stats,
      recentSessions,
      recentErrors,
      traces,
      tokenStats
    };

  } catch (error) {
    log(`\n❌ Test failed: ${error}`);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  run_tests()
    .then(result => {
      console.log("\n✓ Test completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("\n❌ Test failed:", error);
      process.exit(1);
    });
}
