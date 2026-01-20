#!/usr/bin/env node

/**
 * Fix Payload Schema - Update payload and client_info fields to FLEXIBLE
 * This allows nested objects to be stored without explicit schema definition
 */

import Surreal from 'surrealdb';

async function fixSchema() {
  console.log('Fixing payload schema to allow nested data...\n');

  const url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL;
  const user = process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER;
  const password = process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD;

  console.log(`URL: ${url}`);
  console.log(`User: ${user}`);
  console.log(`Namespace: production`);
  console.log(`Database: insights_events\n`);

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

    console.log('✅ Connected!\n');

    // Remove old payload field definition
    console.log('Removing old payload field definition...');
    await db.query('REMOVE FIELD payload ON insights_events');
    console.log('✅ Old payload field removed\n');

    // Define payload field as FLEXIBLE
    console.log('Creating new FLEXIBLE payload field...');
    await db.query('DEFINE FIELD payload ON insights_events FLEXIBLE TYPE object');
    console.log('✅ Payload field is now FLEXIBLE (allows nested data)\n');

    // Remove old client_info field definitions
    console.log('Removing old client_info field definitions...');
    await db.query('REMOVE FIELD client_info.user_agent ON insights_events');
    await db.query('REMOVE FIELD client_info.viewport_size ON insights_events');
    await db.query('REMOVE FIELD client_info ON insights_events');
    console.log('✅ Old client_info fields removed\n');

    // Define client_info field as FLEXIBLE
    console.log('Creating new FLEXIBLE client_info field...');
    await db.query('DEFINE FIELD client_info ON insights_events FLEXIBLE TYPE option<object>');
    console.log('✅ Client_info field is now FLEXIBLE\n');

    // Verify the schema
    console.log('Verifying updated schema...');
    const tableInfo = await db.query('INFO FOR TABLE insights_events');
    console.log('\nTable info:');
    console.log(JSON.stringify(tableInfo, null, 2));

    await db.close();
    console.log('\n✅ Schema fix complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Run the Database Test Suite in Meditation app');
    console.log('   2. Check that payload data is now visible in query results');
    console.log('   3. New events will have payload data persisted correctly\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Schema fix failed:');
    console.error(error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

fixSchema();
