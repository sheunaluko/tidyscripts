/**
 * SurrealDB Database Operations for Generic Hierarchical Embedder
 *
 * Handles connection and database operations for storing embedded directory structures.
 */

import * as common from "tidyscripts_common"
import Surreal from 'surrealdb'
import { loadSurrealConfig } from './config'

const log = common.logger.get_logger({id: "ghe_database"})

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Cached database connection (singleton)
 */
let _cachedDb: Surreal | null = null;

/**
 * Get SurrealDB connection (cached singleton pattern)
 *
 * Returns a cached connection if available, otherwise creates a new one.
 * The connection is configured for the Generic Hierarchical Embedder (GHE) database.
 *
 * Database structure:
 * - Namespace: "tidyscripts"
 * - Database: "GHE"
 *
 * @returns Connected Surreal instance
 * @throws Error if connection fails or configuration is invalid
 *
 * @example
 * const db = await get_database();
 * const result = await db.query('SELECT * FROM project');
 */
export async function get_database(): Promise<Surreal> {
    // Return cached connection if available
    if (_cachedDb) {
        log('Using cached database connection');
        return _cachedDb;
    }

    log('Creating new database connection');

    // Load configuration from environment
    const config = loadSurrealConfig();
    const db = new Surreal();

    try {
        log(`Connecting to SurrealDB at ${config.url}`);
        await db.connect(config.url);

        // Sign in if credentials provided
        if (config.user && config.password) {
            log(`Signing in as user: ${config.user}`);
            await db.signin({
                username: config.user,
                password: config.password,
            });
        } else {
            log('No credentials provided, connecting without authentication');
        }

        // Select namespace and database
        log(`Using namespace: ${config.namespace}, database: ${config.database}`);
        await db.use({
            namespace: config.namespace,
            database: config.database,
        });

        log('Successfully connected to SurrealDB');

        // Cache the connection
        _cachedDb = db;

        return db;

    } catch (error) {
        log(`ERROR: Failed to connect to SurrealDB: ${error}`);
        throw new Error(`Failed to connect to SurrealDB: ${error}`);
    }
}

/**
 * Disconnect from SurrealDB and clear cache
 *
 * Call this when shutting down to cleanly close the connection.
 *
 * @example
 * await disconnect_database();
 */
export async function disconnect_database(): Promise<void> {
    if (_cachedDb) {
        try {
            log('Disconnecting from SurrealDB');
            await _cachedDb.close();
            _cachedDb = null;
            log('Disconnected successfully');
        } catch (error) {
            log(`ERROR: Failed to disconnect: ${error}`);
            throw new Error(`Failed to disconnect from SurrealDB: ${error}`);
        }
    } else {
        log('No active connection to disconnect');
    }
}

/**
 * Clear the cached database connection without disconnecting
 *
 * Useful for testing or forcing a reconnection.
 *
 * @example
 * clear_database_cache();
 * const db = await get_database(); // Will create new connection
 */
export function clear_database_cache(): void {
    log('Clearing database cache');
    _cachedDb = null;
}

/**
 * Check if database connection is active
 *
 * @returns true if connection is cached and presumably active
 */
export function is_database_connected(): boolean {
    return _cachedDb !== null;
}
