/**
 * Matrix initialization utilities
 *
 * Provides a convenience function to initialize Matrix with environment variables
 */

import { Matrix } from "./matrix";

/**
 * Initialize and connect to Matrix using environment variables
 *
 * Required environment variables:
 * - SURREAL_TIDYSCRIPTS_BACKEND_URL: SurrealDB connection URL
 * - SURREAL_TIDYSCRIPTS_BACKEND_USER: SurrealDB username
 * - SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD: SurrealDB password
 *
 * Uses fixed values:
 * - namespace: production
 * - database: matrix
 *
 * @example
 * ```typescript
 * import { matrix } from "tidyscripts/bin/dev";
 *
 * // Initialize with env vars
 * const kg = await matrix.initialize();
 *
 * // Use the connected instance
 * await kg.add_knowledge("Some text", { source: 'app' });
 * const results = await kg.search_for_knowledge("query");
 * ```
 *
 * @returns Promise<Matrix> - Connected and initialized Matrix instance
 * @throws Error if required environment variables are missing
 */
export async function initialize(): Promise<Matrix> {
    // Get environment variables
    const url = process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL;
    const username = process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER;
    const password = process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD;

    // Validate required env vars
    if (!url) {
        throw new Error('Missing required environment variable: SURREAL_TIDYSCRIPTS_BACKEND_URL');
    }
    if (!username) {
        throw new Error('Missing required environment variable: SURREAL_TIDYSCRIPTS_BACKEND_USER');
    }
    if (!password) {
        throw new Error('Missing required environment variable: SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD');
    }

    // Create Matrix instance
    const matrix = new Matrix({
        name: 'tidyscripts_matrix',
        connectionOps: {
            url,
            namespace: 'production',
            database: 'matrix',
            username,
            password
        },
        completionOps: {
            model: 'gpt-4o'
        }
    });

    // Connect and setup
    await matrix.connect();
    await matrix.setup();

    return matrix;
}
