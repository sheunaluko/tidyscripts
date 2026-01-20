#!/usr/bin/env node

/**
 * Initialize Insights Schema
 * Creates the insights_events table and indexes in production/insights_events database
 */

import Surreal from 'surrealdb';
import fs from 'fs';

async function initSchema() {
  console.log('Initializing Insights Schema...\n');

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

    // Define the table as SCHEMAFULL
    console.log('Creating insights_events table...');
    await db.query('DEFINE TABLE insights_events SCHEMAFULL');
    console.log('✅ Table created\n');

    // Define base fields
    console.log('Defining base fields...');
    await db.query('DEFINE FIELD event_id ON insights_events TYPE string ASSERT $value != NONE');
    await db.query('DEFINE FIELD event_type ON insights_events TYPE string ASSERT $value != NONE');
    await db.query('DEFINE FIELD app_name ON insights_events TYPE string ASSERT $value != NONE');
    await db.query('DEFINE FIELD app_version ON insights_events TYPE string ASSERT $value != NONE');
    await db.query('DEFINE FIELD user_id ON insights_events TYPE string ASSERT $value != NONE');
    await db.query('DEFINE FIELD session_id ON insights_events TYPE string ASSERT $value != NONE');
    await db.query('DEFINE FIELD timestamp ON insights_events TYPE datetime ASSERT $value != NONE');
    console.log('✅ Base fields defined\n');

    // Define event chain fields
    console.log('Defining event chain fields...');
    await db.query('DEFINE FIELD parent_event_id ON insights_events TYPE option<string>');
    await db.query('DEFINE FIELD trace_id ON insights_events TYPE option<string>');
    console.log('✅ Event chain fields defined\n');

    // Define flexible payload
    console.log('Defining payload field...');
    await db.query('DEFINE FIELD payload ON insights_events TYPE object ASSERT $value != NONE');
    console.log('✅ Payload field defined\n');

    // Define metadata fields
    console.log('Defining metadata fields...');
    await db.query('DEFINE FIELD tags ON insights_events TYPE option<array>');
    await db.query('DEFINE FIELD duration_ms ON insights_events TYPE option<int>');
    await db.query('DEFINE FIELD client_info ON insights_events TYPE option<object>');
    await db.query('DEFINE FIELD client_info.user_agent ON insights_events TYPE option<string>');
    await db.query('DEFINE FIELD client_info.viewport_size ON insights_events TYPE option<string>');
    console.log('✅ Metadata fields defined\n');

    // Create indexes
    console.log('Creating indexes...');
    await db.query('DEFINE INDEX idx_app_user_time ON insights_events FIELDS app_name, user_id, timestamp');
    console.log('  ✅ idx_app_user_time');

    await db.query('DEFINE INDEX idx_event_type ON insights_events FIELDS event_type, app_name');
    console.log('  ✅ idx_event_type');

    await db.query('DEFINE INDEX idx_session ON insights_events FIELDS session_id, timestamp');
    console.log('  ✅ idx_session');

    await db.query('DEFINE INDEX idx_trace ON insights_events FIELDS trace_id, timestamp');
    console.log('  ✅ idx_trace');

    await db.query('DEFINE INDEX idx_tags ON insights_events FIELDS tags');
    console.log('  ✅ idx_tags');

    console.log('✅ All indexes created\n');

    // Verify the schema
    console.log('Verifying schema...');
    const tableInfo = await db.query('INFO FOR TABLE insights_events');
    console.log('Table info:');
    console.log(JSON.stringify(tableInfo, null, 2));

    await db.close();
    console.log('\n✅ Schema initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Schema initialization failed:');
    console.error(error.message);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

initSchema();
