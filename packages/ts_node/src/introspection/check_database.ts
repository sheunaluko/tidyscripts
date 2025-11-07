#!/usr/bin/env node
/**
 * Quick script to check database contents
 */

import { connect, getTableCounts, disconnect } from './database';

async function checkDatabase() {
  console.log('Connecting to database...');
  const db = await connect();

  console.log('\n📊 Table Counts:');
  const counts = await getTableCounts(db);
  console.log(JSON.stringify(counts, null, 2));

  // Query function_node table directly
  console.log('\n🔍 Querying function_node table...');
  const [functionNodes] = await db.query('SELECT * FROM function_node LIMIT 10');
  const fnArray = Array.isArray(functionNodes) ? functionNodes : [];
  console.log(`Found ${fnArray.length} function nodes (showing first 10):`);
  if (fnArray.length > 0) {
    fnArray.forEach((node: any) => {
      console.log(`  - ${node.name} (${node.filePath})`);
    });
  }

  // Query file_metadata table
  console.log('\n📁 Querying file_metadata table...');
  const [files] = await db.query('SELECT * FROM file_metadata');
  const filesArray = Array.isArray(files) ? files : [];
  console.log(`Found ${filesArray.length} files:`);
  if (filesArray.length > 0) {
    filesArray.forEach((file: any) => {
      console.log(`  - ${file.filePath} (${file.nodeIds?.length || 0} nodes)`);
    });
  }

  await disconnect(db);
  console.log('\n✅ Done');
}

checkDatabase().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
