/**
 * Configuration for Generic Hierarchical Embedder Database
 *
 * Loads SurrealDB configuration from environment variables.
 */

import * as common from "tidyscripts_common"

const log = common.logger.get_logger({id: "ghe_config"})

/**
 * SurrealDB configuration
 */
export interface SurrealConfig {
    url: string;
    user?: string;
    password?: string;
    namespace: string;
    database: string;
}

/**
 * Load SurrealDB configuration from environment variables
 *
 * Environment variables:
 * - SURREAL_TIDYSCRIPTS_BACKEND_URL (required)
 * - SURREAL_TIDYSCRIPTS_BACKEND_USER (optional)
 * - SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD (optional)
 *
 * Defaults:
 * - namespace: "tidyscripts"
 * - database: "GHE"
 *
 * @returns SurrealDB configuration
 * @throws Error if required environment variables are missing
 */
export function loadSurrealConfig(): SurrealConfig {
    const url = process.env['SURREAL_TIDYSCRIPTS_BACKEND_URL'];
    const user = process.env['SURREAL_TIDYSCRIPTS_BACKEND_USER'];
    const password = process.env['SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD'];

    if (!url) {
        const errorMsg = 'Missing required environment variable: SURREAL_TIDYSCRIPTS_BACKEND_URL';
        log(errorMsg);
        throw new Error(errorMsg);
    }

    const config: SurrealConfig = {
        url,
        user,
        password,
        namespace: 'tidyscripts',
        database: 'GHE'
    };

    log(`Loaded SurrealDB config: url=${config.url}, namespace=${config.namespace}, database=${config.database}`);

    return config;
}

/**
 * Validate that required environment variables are set
 *
 * @returns true if valid, false otherwise
 */
export function validateConfig(): boolean {
    try {
        loadSurrealConfig();
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get a summary of the current configuration
 *
 * @returns Configuration summary (safe to log, no passwords)
 */
export function getConfigSummary(): {
    url: string;
    hasAuth: boolean;
    namespace: string;
    database: string;
} {
    try {
        const config = loadSurrealConfig();
        return {
            url: config.url,
            hasAuth: !!(config.user && config.password),
            namespace: config.namespace,
            database: config.database
        };
    } catch (error) {
        throw new Error(`Failed to get config summary: ${error}`);
    }
}
