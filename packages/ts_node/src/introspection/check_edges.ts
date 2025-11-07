#!/usr/bin/env node
/**
 * Check if edge tables have any data
 */

import { connect, disconnect } from './database';

async function checkEdges() {
  const db = await connect();

  console.log('📊 Checking edge tables...\n');

  // Check CONTAINS edges
  const [contains] = await db.query('SELECT * FROM CONTAINS LIMIT 5');
  const containsArray = Array.isArray(contains) ? contains : [];
  console.log(`CONTAINS: ${containsArray.length} edges (showing first 5)`);
  if (containsArray.length > 0) {
    containsArray.forEach((edge: any) => {
      console.log(`  ${edge.in} -> ${edge.out}`);
    });
  } else {
    console.log('  ⚠️  No CONTAINS relationships found!');
  }

  // Check USES edges
  const [uses] = await db.query('SELECT * FROM USES LIMIT 5');
  const usesArray = Array.isArray(uses) ? uses : [];
  console.log(`\nUSES: ${usesArray.length} edges (showing first 5)`);
  if (usesArray.length > 0) {
    usesArray.forEach((edge: any) => {
      console.log(`  ${edge.in} -> ${edge.out}`);
    });
  } else {
    console.log('  ⚠️  No USES relationships found!');
  }

  // Check IMPORTS edges
  const [imports] = await db.query('SELECT * FROM IMPORTS LIMIT 5');
  const importsArray = Array.isArray(imports) ? imports : [];
  console.log(`\nIMPORTS: ${importsArray.length} edges (showing first 5)`);
  if (importsArray.length > 0) {
    importsArray.forEach((edge: any) => {
      console.log(`  ${edge.in} -> ${edge.out}`);
    });
  } else {
    console.log('  ⚠️  No IMPORTS relationships found!');
  }

  await disconnect(db);
}

checkEdges().catch(console.error);
