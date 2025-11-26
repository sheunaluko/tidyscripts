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

// ============================================================================
// Schema Management
// ============================================================================

/**
 * Initialize database schema and indexes
 * Creates vector index for embedding_store if it doesn't exist
 *
 * @param dimensions - Embedding vector dimensions (default: 1536 for text-embedding-3-small)
 */
export async function initialize_schema(dimensions: number = 1536): Promise<void> {
    const db = await get_database();

    log('Initializing database schema');

    try {
        // Create HNSW vector index on embedding_store.vector with COSINE distance
        const indexQuery = `
            DEFINE INDEX IF NOT EXISTS embedding_vector_idx
            ON embedding_store
            FIELDS vector HNSW DIMENSION ${dimensions} DIST COSINE;
        `;

        await db.query(indexQuery);
        log(`Vector index created/verified with dimension ${dimensions} and COSINE distance`);

    } catch (error) {
        log(`ERROR: Failed to initialize schema: ${error}`);
        throw new Error(`Failed to initialize schema: ${error}`);
    }
}

/**
 * Recreate the vector index with COSINE distance
 *
 * Use this to fix an existing index that was created with wrong distance metric.
 * This will drop the existing index and recreate it with COSINE distance.
 *
 * WARNING: This may take time if you have many embeddings, as the index needs to be rebuilt.
 *
 * @param dimensions - Embedding vector dimensions (default: 1536 for text-embedding-3-small)
 *
 * @example
 * import { recreate_index } from './database';
 * await recreate_index(1536);
 */
export async function recreate_index(dimensions: number = 1536): Promise<void> {
    const db = await get_database();

    log('=== Recreating vector index ===');

    try {
        // Step 1: Drop existing index
        log('Dropping existing index...');
        await db.query(`REMOVE INDEX IF EXISTS embedding_vector_idx ON embedding_store;`);
        log('✓ Existing index dropped');

        // Step 2: Create new index with COSINE distance
        log(`Creating new index with DIMENSION ${dimensions} and COSINE distance...`);
        const indexQuery = `
            DEFINE INDEX embedding_vector_idx
            ON embedding_store
            FIELDS vector HNSW DIMENSION ${dimensions} DIST COSINE;
        `;

        await db.query(indexQuery);
        log('✓ New index created with COSINE distance');

        // Step 3: Verify
        const info = await db.query(`INFO FOR TABLE embedding_store;`);
        log('✓ Index verification:');
        log(JSON.stringify(info, null, 2));

        log('=== Index recreation complete ===');

    } catch (error) {
        log(`ERROR: Failed to recreate index: ${error}`);
        throw new Error(`Failed to recreate index: ${error}`);
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute project ID from root path
 *
 * Project IDs are deterministic and generated by hashing the root directory path.
 * This allows you to identify a project without needing to query the database first.
 *
 * @param rootPath - Absolute path to the project directory
 * @returns Project ID in format "project:hash"
 *
 * @example
 * const projectId = await computeProjectId('/path/to/project');
 * console.log(projectId); // "project:abc123def456..."
 *
 * // Use with query functions
 * const results = await searchBySimilarity("query", { projectId });
 */
export async function computeProjectId(rootPath: string): Promise<string> {
    const crypto = common.apis.cryptography;
    const projectIdHash = await crypto.object_sha256(rootPath);
    return `project:${projectIdHash}`;
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Statistics about the storage operation
 */
export interface StorageStats {
    projectId: string;
    directoriesCreated: number;
    filesCreated: number;
    chunksCreated: number;
    embeddingsCreated: number;
    embeddingsReused: number;
}

/**
 * Options for storing embedded directory
 */
export interface StoreOptions {
    model?: string;           // Model used for embeddings (default: 'text-embedding-3-small')
    dimensions?: number;      // Vector dimensions (default: 1536)
    deleteExisting?: boolean; // Delete existing project data (default: true)
    hashDelimiter?: string;   // Delimiter for hash generation (default: '::')
    batchSize?: number;       // Batch size for operations (default: 200)
}

/**
 * Internal interfaces for batched operations
 */
interface CollectedDirectory {
    idHash: string;
    projectIdHash: string;
    path: string;
    name: string;
    parentIdHash: string | null;
    parentTable: string | null;
}

interface CollectedFile {
    idHash: string;
    projectIdHash: string;
    path: string;
    name: string;
    parentIdHash: string;
}

interface CollectedChunk {
    idHash: string;
    projectIdHash: string;
    fileIdHash: string;
    content: string;
    contentHash: string;
    embedding: number[];
    startChar: number;
    endChar: number;
    startLine: number;
    endLine: number;
    filePath: string;
}

interface CollectedRelation {
    type: 'contains' | 'has_chunk' | 'has_embedding';
    fromTable: string;
    fromIdHash: string;
    toTable: string;
    toIdHash: string;
    projectIdHash: string;
}

interface CollectedData {
    directories: CollectedDirectory[];
    files: CollectedFile[];
    chunks: CollectedChunk[];
    relations: CollectedRelation[];
}

/**
 * Collect all nodes from the embedded directory tree
 */
async function collectAllNodes(
    embeddedDirectory: any,
    projectIdHash: string,
    hashDelimiter: string,
    crypto: any
): Promise<CollectedData> {
    const collected: CollectedData = {
        directories: [],
        files: [],
        chunks: [],
        relations: []
    };

    async function traverse(
        node: any,
        parentIdHash: string | null,
        parentTable: string | null
    ): Promise<void> {
        if (node.type === 'directory') {
            const dirIdHash = await crypto.object_sha256(projectIdHash + hashDelimiter + node.path);

            collected.directories.push({
                idHash: dirIdHash,
                projectIdHash,
                path: node.path,
                name: node.name,
                parentIdHash,
                parentTable
            });

            if (parentIdHash && parentTable) {
                collected.relations.push({
                    type: 'contains',
                    fromTable: parentTable,
                    fromIdHash: parentIdHash,
                    toTable: 'directory_node',
                    toIdHash: dirIdHash,
                    projectIdHash
                });
            }

            for (const child of node.children) {
                await traverse(child, dirIdHash, 'directory_node');
            }

        } else if (node.type === 'file') {
            const fileIdHash = await crypto.object_sha256(projectIdHash + hashDelimiter + node.path);

            collected.files.push({
                idHash: fileIdHash,
                projectIdHash,
                path: node.path,
                name: node.name,
                parentIdHash: parentIdHash!
            });

            if (parentIdHash && parentTable) {
                collected.relations.push({
                    type: 'contains',
                    fromTable: parentTable,
                    fromIdHash: parentIdHash,
                    toTable: 'file_node',
                    toIdHash: fileIdHash,
                    projectIdHash
                });
            }

            for (const chunk of node.chunks) {
                const contentHash = await crypto.object_sha256(chunk.content);
                const chunkIdHash = await crypto.object_sha256(
                    projectIdHash + hashDelimiter + chunk.filePath + hashDelimiter +
                    chunk.startChar.toString() + hashDelimiter + chunk.endChar.toString()
                );

                collected.chunks.push({
                    idHash: chunkIdHash,
                    projectIdHash,
                    fileIdHash,
                    content: chunk.content,
                    contentHash,
                    embedding: chunk.embedding,
                    startChar: chunk.startChar,
                    endChar: chunk.endChar,
                    startLine: chunk.startLine,
                    endLine: chunk.endLine,
                    filePath: chunk.filePath
                });

                collected.relations.push({
                    type: 'has_chunk',
                    fromTable: 'file_node',
                    fromIdHash: fileIdHash,
                    toTable: 'chunk',
                    toIdHash: chunkIdHash,
                    projectIdHash
                });

                collected.relations.push({
                    type: 'has_embedding',
                    fromTable: 'chunk',
                    fromIdHash: chunkIdHash,
                    toTable: 'embedding_store',
                    toIdHash: contentHash,
                    projectIdHash
                });
            }
        }
    }

    await traverse(embeddedDirectory, null, null);
    return collected;
}

/**
 * Store an embedded directory structure in SurrealDB
 *
 * This function traverses the embedded directory tree and stores:
 * - Project metadata
 * - Directory nodes with hierarchical relations
 * - File nodes with parent directory relations
 * - Chunks with position metadata
 * - Embeddings in shared embedding_store (deduplicated by content hash)
 * - Graph relations connecting all entities
 *
 * All deterministic IDs are generated using SHA256 hashes with delimiters to prevent collisions.
 *
 * Uses batched operations for improved performance with progress logging.
 *
 * @param embeddedDirectory - The embedded directory structure to store
 * @param rootPath - Original root path of the directory
 * @param options - Storage options (model, dimensions, deleteExisting, hashDelimiter, batchSize)
 * @returns Storage statistics
 *
 * @example
 * const result = await embed_directory('/path/to/project');
 * const stats = await store_embedded_directory(
 *   result.embeddedDirectory,
 *   '/path/to/project',
 *   { model: 'text-embedding-3-small', dimensions: 1536, hashDelimiter: '::', batchSize: 200 }
 * );
 * console.log(`Stored ${stats.chunksCreated} chunks with ${stats.embeddingsCreated} new embeddings`);
 */
export async function store_embedded_directory(
    embeddedDirectory: any, // EmbeddedDirectoryNode type from embed_directory_structure
    rootPath: string,
    options: StoreOptions = {}
): Promise<StorageStats> {
    const {
        model = 'text-embedding-3-small',
        dimensions = 1536,
        deleteExisting = true,
        hashDelimiter = '::',
        batchSize = 200
    } = options;

    const db = await get_database();
    const crypto = common.apis.cryptography;
    const startTime = Date.now();

    // Initialize stats
    const stats: StorageStats = {
        projectId: '',
        directoriesCreated: 0,
        filesCreated: 0,
        chunksCreated: 0,
        embeddingsCreated: 0,
        embeddingsReused: 0
    };

    log(`=== Starting store_embedded_directory (BATCHED) ===`);
    log(`Root path: ${rootPath}`);
    log(`Model: ${model}, Dimensions: ${dimensions}, Batch size: ${batchSize}`);

    // PHASE 1: Generate project ID and initialize
    const projectIdHash = await crypto.object_sha256(rootPath);
    stats.projectId = `project:${projectIdHash}`;
    log(`Generated project ID: project:${projectIdHash}`);

    await initialize_schema(dimensions);

    // PHASE 2: Delete existing data if requested
    if (deleteExisting) {
        log(`=== Phase: Deleting existing data ===`);
        await db.query(`
            LET $projectId = type::thing($table, $idHash);
            DELETE contains WHERE projectId = $projectId;
            DELETE has_chunk WHERE projectId = $projectId;
            DELETE has_embedding WHERE projectId = $projectId;
        `, { table: 'project', idHash: projectIdHash });

        await db.query(`
            LET $projectId = type::thing($table, $idHash);
            DELETE directory_node WHERE projectId = $projectId;
            DELETE file_node WHERE projectId = $projectId;
            DELETE chunk WHERE projectId = $projectId;
            DELETE project WHERE id = $projectId;
        `, { table: 'project', idHash: projectIdHash });

        log('Existing data deleted (kept embedding_store for deduplication)');
    }

    // PHASE 3: Create project record
    log(`=== Phase: Creating project ===`);
    const projectName = rootPath.split('/').filter(Boolean).pop() || 'unknown';
    await db.query(`
        LET $id = type::thing($table, $idHash);
        CREATE $id SET rootPath = $rootPath, name = $name, created = $created;
    `, {
        table: 'project',
        idHash: projectIdHash,
        rootPath,
        name: projectName,
        created: new Date().toISOString()
    });
    log(`Project created: project:${projectIdHash}`);

    // PHASE 4: Collect all nodes
    log(`=== Phase: Collecting nodes from tree ===`);
    const collected = await collectAllNodes(embeddedDirectory, projectIdHash, hashDelimiter, crypto);
    log(`Collected: ${collected.directories.length} directories, ${collected.files.length} files, ${collected.chunks.length} chunks, ${collected.relations.length} relations`);

    // PHASE 5: Batch create directories
    log(`=== Phase: Creating directories (0/${collected.directories.length}) ===`);
    for (let i = 0; i < collected.directories.length; i += batchSize) {
        const batch = collected.directories.slice(i, i + batchSize);
        const queries: string[] = [];
        const variables: any = {};

        for (let j = 0; j < batch.length; j++) {
            const dir = batch[j];
            const hasParent = dir.parentIdHash && dir.parentTable;

            queries.push(`
                LET $id_${j} = type::thing('directory_node', '${dir.idHash}');
                LET $projectId_${j} = type::thing('project', '${dir.projectIdHash}');
                ${hasParent ? `LET $parentId_${j} = type::thing('${dir.parentTable}', '${dir.parentIdHash}');` : ''}
                CREATE $id_${j} SET
                    projectId = $projectId_${j},
                    path = $path_${j},
                    name = $name_${j},
                    parentId = ${hasParent ? `$parentId_${j}` : 'NONE'};
            `);

            variables[`path_${j}`] = dir.path;
            variables[`name_${j}`] = dir.name;
        }

        await db.query(queries.join('\n'), variables);
        stats.directoriesCreated += batch.length;
        const percent = Math.round((stats.directoriesCreated / collected.directories.length) * 100);
        log(`Creating directories: ${stats.directoriesCreated}/${collected.directories.length} (${percent}%)`);
    }

    // PHASE 6: Batch create files
    log(`=== Phase: Creating files (0/${collected.files.length}) ===`);
    for (let i = 0; i < collected.files.length; i += batchSize) {
        const batch = collected.files.slice(i, i + batchSize);
        const queries: string[] = [];
        const variables: any = {};

        for (let j = 0; j < batch.length; j++) {
            const file = batch[j];
            queries.push(`
                LET $id_${j} = type::thing('file_node', '${file.idHash}');
                LET $projectId_${j} = type::thing('project', '${file.projectIdHash}');
                LET $parentId_${j} = type::thing('directory_node', '${file.parentIdHash}');
                CREATE $id_${j} SET
                    projectId = $projectId_${j},
                    path = $path_${j},
                    name = $name_${j},
                    parentId = $parentId_${j};
            `);

            variables[`path_${j}`] = file.path;
            variables[`name_${j}`] = file.name;
        }

        await db.query(queries.join('\n'), variables);
        stats.filesCreated += batch.length;
        const percent = Math.round((stats.filesCreated / collected.files.length) * 100);
        log(`Creating files: ${stats.filesCreated}/${collected.files.length} (${percent}%)`);
    }

    // PHASE 7: Batch create embeddings and chunks
    log(`=== Phase: Creating embeddings & chunks (0/${collected.chunks.length}) ===`);

    // Track which embeddings we've already processed globally
    const globalEmbeddingMap = new Map<string, boolean>(); // contentHash -> exists

    for (let i = 0; i < collected.chunks.length; i += batchSize) {
        const batch = collected.chunks.slice(i, i + batchSize);
        const batchStartTime = Date.now();

        // Get unique content hashes in this batch
        const uniqueHashesInBatch = [...new Set(batch.map(c => c.contentHash))];

        // Filter to only hashes we haven't checked yet
        const hashesToCheck = uniqueHashesInBatch.filter(h => !globalEmbeddingMap.has(h));

        let batchExisted = 0;
        let batchCreated = 0;
        let batchReused = 0;

        // STEP 1: Check which embeddings exist (ONE QUERY for all unchecked hashes)
        if (hashesToCheck.length > 0) {
            const checkQuery = `
                SELECT contentHash FROM embedding_store
                WHERE contentHash IN [${hashesToCheck.map(h => `'${h}'`).join(',')}];
            `;
            const checkResult = await db.query(checkQuery);

            // Extract existing content hashes
            const existingHashes = new Set<string>();
            if (checkResult && checkResult[0] && Array.isArray(checkResult[0])) {
                for (const row of checkResult[0]) {
                    if (row && row.contentHash) {
                        existingHashes.add(row.contentHash);
                    }
                }
            }

            // Update global map
            for (const hash of hashesToCheck) {
                globalEmbeddingMap.set(hash, existingHashes.has(hash));
            }
        }

        // STEP 2: Separate embeddings into existing vs new
        const embeddingsToCreate: CollectedChunk[] = [];
        const embeddingsToUpdate = new Set<string>();

        for (const chunk of batch) {
            const exists = globalEmbeddingMap.get(chunk.contentHash);

            if (exists) {
                embeddingsToUpdate.add(chunk.contentHash);
            } else {
                // Only add if we haven't already created it in this batch
                if (!embeddingsToCreate.find(c => c.contentHash === chunk.contentHash)) {
                    embeddingsToCreate.push(chunk);
                    globalEmbeddingMap.set(chunk.contentHash, true); // Mark as will exist
                }
            }
        }

        // Count reuse from this batch
        for (const chunk of batch) {
            if (globalEmbeddingMap.get(chunk.contentHash) && !embeddingsToCreate.find(c => c.contentHash === chunk.contentHash)) {
                batchReused++;
            }
        }

        // STEP 3: Batch CREATE new embeddings (ONE QUERY)
        if (embeddingsToCreate.length > 0) {
            const createQueries: string[] = [];
            const embeddingVars: any = {};

            for (let k = 0; k < embeddingsToCreate.length; k++) {
                const chunk = embeddingsToCreate[k];
                createQueries.push(`
                    LET $id_emb_${k} = type::thing('embedding_store', '${chunk.contentHash}');
                    CREATE $id_emb_${k} SET
                        contentHash = '${chunk.contentHash}',
                        vector = $vector_${k},
                        model = $model_${k},
                        dimensions = $dimensions_${k},
                        usageCount = 1,
                        created = $created_${k};
                `);

                embeddingVars[`vector_${k}`] = chunk.embedding;
                embeddingVars[`model_${k}`] = model;
                embeddingVars[`dimensions_${k}`] = dimensions;
                embeddingVars[`created_${k}`] = new Date().toISOString();
            }

            await db.query(createQueries.join('\n'), embeddingVars);
            batchCreated = embeddingsToCreate.length;
            stats.embeddingsCreated += batchCreated;
        }

        // STEP 4: Batch UPDATE existing embeddings (ONE QUERY)
        if (embeddingsToUpdate.size > 0) {
            const updateHashes = [...embeddingsToUpdate];
            const updateQuery = `
                UPDATE embedding_store
                SET usageCount += 1
                WHERE contentHash IN [${updateHashes.map(h => `'${h}'`).join(',')}];
            `;
            await db.query(updateQuery);
            batchExisted = embeddingsToUpdate.size;
            stats.embeddingsReused += batchReused;
        }

        // STEP 5: Batch CREATE chunks (ONE QUERY)
        const chunkQueries: string[] = [];
        const chunkVars: any = {};

        for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            chunkQueries.push(`
                LET $id_chunk_${j} = type::thing('chunk', '${chunk.idHash}');
                LET $projectId_${j} = type::thing('project', '${chunk.projectIdHash}');
                LET $fileId_${j} = type::thing('file_node', '${chunk.fileIdHash}');
                LET $embeddingId_${j} = type::thing('embedding_store', '${chunk.contentHash}');
                CREATE $id_chunk_${j} SET
                    projectId = $projectId_${j},
                    fileId = $fileId_${j},
                    content = $content_${j},
                    contentHash = '${chunk.contentHash}',
                    startChar = $startChar_${j},
                    endChar = $endChar_${j},
                    startLine = $startLine_${j},
                    endLine = $endLine_${j},
                    embeddingId = $embeddingId_${j};
            `);

            chunkVars[`content_${j}`] = chunk.content;
            chunkVars[`startChar_${j}`] = chunk.startChar;
            chunkVars[`endChar_${j}`] = chunk.endChar;
            chunkVars[`startLine_${j}`] = chunk.startLine;
            chunkVars[`endLine_${j}`] = chunk.endLine;
        }

        await db.query(chunkQueries.join('\n'), chunkVars);
        stats.chunksCreated += batch.length;

        // Log detailed batch progress
        const batchElapsed = ((Date.now() - batchStartTime) / 1000).toFixed(2);
        const percent = Math.round((stats.chunksCreated / collected.chunks.length) * 100);
        const uniqueInBatch = uniqueHashesInBatch.length;
        log(`Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} chunks, ${uniqueInBatch} unique embeddings (${batchCreated} new, ${batchExisted} existed, ${batchReused} reused) - ${batchElapsed}s`);
        log(`Progress: ${stats.chunksCreated}/${collected.chunks.length} chunks (${percent}%)`);
    }

    // PHASE 8: Batch create relations
    log(`=== Phase: Creating relations (0/${collected.relations.length}) ===`);
    for (let i = 0; i < collected.relations.length; i += batchSize) {
        const batch = collected.relations.slice(i, i + batchSize);
        const queries: string[] = [];

        for (const rel of batch) {
            queries.push(`
                LET $from = type::thing('${rel.fromTable}', '${rel.fromIdHash}');
                LET $to = type::thing('${rel.toTable}', '${rel.toIdHash}');
                LET $projectId = type::thing('project', '${rel.projectIdHash}');
                RELATE $from->${rel.type}->$to SET projectId = $projectId;
            `);
        }

        await db.query(queries.join('\n'));
        const relCount = i + batch.length;
        const percent = Math.round((relCount / collected.relations.length) * 100);
        log(`Creating relations: ${relCount}/${collected.relations.length} (${percent}%)`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`=== store_embedded_directory complete in ${elapsed}s ===`);
    log(`Stats: ${stats.directoriesCreated} dirs, ${stats.filesCreated} files, ${stats.chunksCreated} chunks`);
    log(`Embeddings: ${stats.embeddingsCreated} new, ${stats.embeddingsReused} reused`);

    return stats;
}
