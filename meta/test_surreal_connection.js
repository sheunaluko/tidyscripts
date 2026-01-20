#!/usr/bin/env node

/**
 * Test SurrealDB Connection
 * Tests connection to the tidyscripts backend using environment variables
 */

import Surreal from 'surrealdb';

async function testConnection() {
  console.log('Testing SurrealDB connection...\n');

  const url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL;
  const user = process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER;
  const password = process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD;

  console.log(`URL: ${url}`);
  console.log(`User: ${user}`);
  console.log(`Password: ${password ? '***' : 'NOT SET'}\n`);

  if (!url || !user || !password) {
    console.error('❌ Missing environment variables!');
    console.error('Required: SURREAL_TIDYSCRIPTS_BACKEND_{URL,USER,PASSWORD}');
    process.exit(1);
  }

  const db = new Surreal();

  try {
    console.log('Connecting to SurrealDB...');
    await db.connect(url, {
      namespace: 'production',
      database: 'insights_events',
      auth: {
        username: user,
        password: password,
      },
    });

    console.log('✅ Successfully connected to SurrealDB!\n');

    // Test query - get info about the database
    console.log('Testing query: SELECT * FROM insights_events LIMIT 5...');
    const result = await db.query('SELECT * FROM insights_events LIMIT 5');
    console.log('Query result:');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n✅ Found ${result[0]?.length || 0} events`);

    // Check if insights_events table exists
    console.log('\nChecking for insights_events table...');
    const tableCheck = await db.query('INFO FOR TABLE insights_events');
    console.log('Table info:');
    console.log(JSON.stringify(tableCheck, null, 2));

    await db.close();
    console.log('\n✅ Connection test complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error(error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
