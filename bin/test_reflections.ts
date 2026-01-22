#!/usr/bin/env ts-node

import * as dev from "./dev/index";
import common from "../packages/ts_common/dist/index";

const log = common.logger.get_logger({ id: 'reflections.test' });

async function main() {
  log("Testing Reflections REPL utilities...\n");

  try {
    // Test main_test function
    const result = await dev.reflections.main_test();

    log("\n=== Test Results ===");
    log(`Database Stats: ${result.stats.total_events} events, ${result.stats.total_sessions} sessions`);
    log(`Recent Sessions: ${result.recentSessions.length}`);
    log(`Recent Errors: ${result.recentErrors.length}`);
    log(`Recent Traces: ${result.recentTraces.length}`);
    log(`Token Stats: ${result.tokenStats.total_invocations} invocations, ${result.tokenStats.total_tokens} tokens`);

    log("\n✓ All tests passed!");

  } catch (error: any) {
    log(`\n❌ Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
