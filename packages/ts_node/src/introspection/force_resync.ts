#!/usr/bin/env ts-node
/**
 * Force resync by clearing file metadata
 */

import { connect, disconnect } from './database';

async function forceResync() {
  console.log('🔄 Clearing file metadata to force resync...\n');

  const db = await connect();

  // Clear all file metadata
  await db.query('DELETE file_metadata');

  console.log('✅ File metadata cleared. All files will re-sync on next run.\n');

  await disconnect(db);
}

forceResync().catch(console.error);
