#!/usr/bin/env ts-node
/**
 * Run filtered sync on a specific path
 *
 * Usage: ts-node run_filtered_sync.ts [path]
 * Example: ts-node run_filtered_sync.ts packages/ts_web/src/apis
 */

import { fullSync } from './sync';

const pathFilter = process.argv[2];

if (!pathFilter) {
  console.error('Usage: ts-node run_filtered_sync.ts <path>');
  console.error('Example: ts-node run_filtered_sync.ts packages/ts_web/src/apis');
  process.exit(1);
}

fullSync(pathFilter)
  .then(() => {
    console.log('\n✅ Filtered sync completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Filtered sync failed:', error);
    process.exit(1);
  });
