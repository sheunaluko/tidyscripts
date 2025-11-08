#!/usr/bin/env node
/**
 * Clear all introspection data from database
 */

import { connect } from './database.js';

async function clearDatabase() {
  const db = await connect();

  console.log('🗑️  Removing database tables...\n');

  // Remove all node tables
  await db.query('REMOVE TABLE IF EXISTS function_node');
  await db.query('REMOVE TABLE IF EXISTS module_node');
  await db.query('REMOVE TABLE IF EXISTS class_node');
  await db.query('REMOVE TABLE IF EXISTS interface_node');
  await db.query('REMOVE TABLE IF EXISTS type_alias_node');

  // Remove edge tables
  await db.query('REMOVE TABLE IF EXISTS CONTAINS');
  await db.query('REMOVE TABLE IF EXISTS USES');
  await db.query('REMOVE TABLE IF EXISTS IMPORTS');

  // Remove metadata table
  await db.query('REMOVE TABLE IF EXISTS file_metadata');

  console.log('✅ All tables removed successfully!');
  console.log('ℹ️  Embedding cache preserved');
  process.exit(0);
}

clearDatabase().catch(e => {
  console.error('❌ Error clearing database:', e);
  process.exit(1);
});
