#!/usr/bin/env node
/**
 * Test count query to see what structure is returned
 */

import { connect, disconnect } from './database';

async function testCountQuery() {
  const db = await connect();

  console.log('Testing count query...\n');

  const result = await db.query('SELECT count() FROM function_node');
  console.log('Full result:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\nresult[0]:');
  console.log(JSON.stringify(result[0], null, 2));

  if (result[0] && result[0][0]) {
    console.log('\nresult[0][0]:');
    console.log(JSON.stringify(result[0][0], null, 2));
  }

  await disconnect(db);
}

testCountQuery().catch(console.error);
