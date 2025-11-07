/**
 * Validation Script for Tidyscripts Introspection System
 *
 * Run this script to validate the database after sync.
 */

import {
  connect,
  disconnect,
  getTableCounts,
  getCacheStats,
  isSchemaInitialized,
} from './database';
import { getConfigSummary } from './config';
import { logger } from './logger';

/**
 * Run validation checks
 */
async function validate() {
  logger.startTimer('validation');
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║   Tidyscripts Introspection System - Validation         ║');
  logger.info('╚══════════════════════════════════════════════════════════╝');

  // Display configuration
  const configSummary = getConfigSummary();
  logger.info('Configuration:', { summary: configSummary });

  let db;

  try {
    // Connect
    logger.info('Connecting to database...');
    db = await connect();

    // Check schema
    logger.info('Checking schema initialization...');
    const schemaExists = await isSchemaInitialized(db);
    logger.info('Schema initialized:', { initialized: schemaExists });

    if (!schemaExists) {
      logger.warn('Schema not initialized. Run fullSync() first.');
      return;
    }

    // Get table counts
    const counts = await getTableCounts(db);
    const totalNodes =
      counts.functions +
      counts.classes +
      counts.modules +
      counts.interfaces +
      counts.type_aliases;

    logger.info('Table Counts:', {
      functions: counts.functions,
      classes: counts.classes,
      modules: counts.modules,
      interfaces: counts.interfaces,
      type_aliases: counts.type_aliases,
      embeddings: counts.embeddings,
      files: counts.files,
      totalNodes,
    });

    // Get cache statistics
    const cacheStats = await getCacheStats(db);
    const hitRate = cacheStats.total_entries > 0 && cacheStats.total_usage > 0
      ? ((cacheStats.total_usage - cacheStats.total_entries) / cacheStats.total_usage * 100).toFixed(2)
      : '0.00';

    logger.info('Embedding Cache Statistics:', {
      entries: cacheStats.total_entries,
      totalUsage: cacheStats.total_usage,
      maxUsage: cacheStats.max_usage,
      minUsage: cacheStats.min_usage,
      avgUsage: cacheStats.avg_usage?.toFixed(2) || 'N/A',
      hitRate: `${hitRate}%`,
    });

    // Sample queries
    logger.info('Fetching sample data...');

    // Get sample functions
    const sampleFunctions = await db.query<[any[]]>('SELECT * FROM function_node LIMIT 3');
    const funcResults = sampleFunctions?.[0]?.result;
    if (funcResults && funcResults.length > 0) {
      logger.info('Sample Functions:', {
        count: funcResults.length,
        samples: funcResults.map(f => ({
          name: f.name,
          filePath: f.filePath,
          docstring: f.docstring?.slice(0, 80) + '...',
        })),
      });
    }

    // Get sample classes
    const sampleClasses = await db.query<[any[]]>('SELECT * FROM class_node LIMIT 3');
    const classResults = sampleClasses?.[0]?.result;
    if (classResults && classResults.length > 0) {
      logger.info('Sample Classes:', {
        count: classResults.length,
        samples: classResults.map(c => ({
          name: c.name,
          filePath: c.filePath,
          docstring: c.docstring?.slice(0, 80) + '...',
        })),
      });
    }

    // Check for nodes without docstrings
    const noDocstrings = await db.query<[{ count: number }[]]>(
      'SELECT count() FROM function_node WHERE docstring = "" OR docstring IS NULL'
    );
    const noDocCount = noDocstrings?.[0]?.result?.[0]?.count || 0;
    logger.info('Functions without docstrings:', { count: noDocCount });

    // Validation checks
    logger.info('╔══════════════════════════════════════════════════════════╗');
    logger.info('║   Validation Results                                    ║');
    logger.info('╚══════════════════════════════════════════════════════════╝');

    const checks = [
      {
        name: 'Schema initialized',
        pass: schemaExists,
      },
      {
        name: 'Nodes exist in database',
        pass: totalNodes > 0,
      },
      {
        name: 'Embeddings cached',
        pass: counts.embeddings > 0,
      },
      {
        name: 'Files tracked',
        pass: counts.files > 0,
      },
      {
        name: 'Cache has usage > 1',
        pass: (cacheStats.max_usage || 0) > 1,
      },
    ];

    let allPassed = true;
    const checkResults: Record<string, string> = {};
    for (const check of checks) {
      const status = check.pass ? 'PASS' : 'FAIL';
      checkResults[check.name] = status;
      if (!check.pass) allPassed = false;

      if (check.pass) {
        logger.success(`${check.name}: ${status}`);
      } else {
        logger.failure(`${check.name}: ${status}`);
      }
    }

    const duration = logger.endTimer('validation');
    logger.logTiming('Validation', duration);

    if (allPassed) {
      logger.success('All checks passed!');
    } else {
      logger.warn('Some checks failed', { results: checkResults });
    }
  } catch (error) {
    logger.error('Validation failed', error as Error);
    throw error;
  } finally {
    if (db) {
      await disconnect(db);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  validate().catch(error => {
    logger.error('Validation error', error as Error);
    process.exit(1);
  });
}

export { validate };
