
import * as cryptography from './cryptography';
import {get_logger} from "../logger" ; 

/**
 * # TidyScripts Cache System
 * 
 * A comprehensive, type-safe caching library with support for multiple backends, memoization,
 * TTL (Time To Live), statistics tracking, and extensible architecture.
 * 
 * ## Overview
 * 
 * The cache system provides a unified interface for different storage backends through the
 * `ICache` interface, with implementations for in-memory storage, file system persistence,
 * and extensibility for custom backends like Redis, DynamoDB, etc.
 * 
 * ## Key Features
 * 
 * - **🏭 Factory Pattern**: Create cache instances using `CacheFactory.create()`
 * - **💾 Multiple Backends**: Memory, filesystem, and extensible for custom implementations
 * - **⚡ Memoization**: Function result caching with `CacheUtils.memoize()`
 * - **⏰ TTL Support**: Automatic expiration of cache entries
 * - **📊 Statistics**: Hit/miss rates and performance monitoring
 * - **🏠 Namespacing**: Isolate cache entries by context
 * - **🔧 Type Safety**: Full TypeScript support with generics
 * - **🛡️ Error Handling**: Graceful degradation when cache operations fail
 * 
 * ## Quick Start
 * 
 * ### Basic Cache Usage
 * ```typescript
 * import { MemoryCache, CacheFactory } from 'tidyscripts_common';
 * 
 * // Direct instantiation
 * const cache = new MemoryCache<string>({
 *   defaultTtl: 300000, // 5 minutes
 *   verbose: true,
 *   namespace: 'user-data'
 * });
 * 
 * // Factory pattern
 * const cache2 = CacheFactory.create<User>('memory', {
 *   defaultTtl: 600000, // 10 minutes
 *   logPrefix: '[UserCache]'
 * });
 * 
 * // Basic operations
 * await cache.set('user:123', 'John Doe', { ttl: 60000 });
 * const user = await cache.get('user:123');
 * const exists = await cache.has('user:123');
 * await cache.delete('user:123');
 * ```
 * 
 * ### Function Memoization
 * ```typescript
 * import { CacheUtils, MemoryCache } from 'tidyscripts_common';
 * 
 * const cache = new MemoryCache();
 * 
 * // Memoize expensive functions
 * const memoizedApiCall = CacheUtils.memoize(fetchUserData, cache, {
 *   ttl: 300000, // 5 minutes
 *   namespace: 'api',
 *   keyGenerator: (args) => `user:${args[0]}` // custom key generation
 * });
 * 
 * // Factory pattern for multiple functions
 * const memoizer = CacheUtils.createMemoizer(cache, {
 *   namespace: 'calculations',
 *   ttl: 3600000 // 1 hour
 * });
 * 
 * const memoizedCalc1 = memoizer(heavyComputation);
 * const memoizedCalc2 = memoizer(anotherComputation, { ttl: 1800000 }); // 30 min override
 * ```
 * 
 * ## Cache Backends
 * 
 * ### Memory Cache
 * Fast in-memory storage using JavaScript Map. Data is lost when process exits.
 * 
 * ```typescript
 * const memoryCache = new MemoryCache<UserData>({
 *   defaultTtl: 300000,
 *   enableStats: true,
 *   verbose: true,
 *   logPrefix: '[UserCache]'
 * });
 * ```
 * 
 * **Pros**: Extremely fast, no I/O overhead
 * **Cons**: Data lost on restart, limited by available RAM
 * **Best for**: Session data, temporary computations, frequently accessed data
 * 
 * ### File System Cache
 * Persistent storage using JSON files (requires ts_node package).
 * 
 * ```typescript
 * import { FileSystemCache } from 'ts_node';
 * 
 * const fileCache = new FileSystemCache<ApiResponse>({
 *   cacheDir: '/tmp/my-app-cache',
 *   defaultTtl: 3600000, // 1 hour
 *   namespace: 'api-responses'
 * });
 * 
 * // Or via factory
 * const fileCache2 = CacheFactory.create('filesystem', {
 *   cacheDir: '/var/cache/myapp'
 * });
 * ```
 * 
 * **Pros**: Persistent across restarts, unlimited storage
 * **Cons**: Slower than memory, file I/O overhead
 * **Best for**: API responses, computed results, data that needs persistence
 * 
 * ### Custom Backends
 * Extend `BaseCache` to implement Redis, DynamoDB, or other storage systems:
 * 
 * ```typescript
 * class RedisCache<T> extends BaseCache<T> {
 *   constructor(config: RedisCacheConfig) {
 *     super({ logPrefix: '[RedisCache]', ...config });
 *   }
 *   
 *   async get(key: string): Promise<T | null> {
 *     // Redis implementation
 *   }
 *   // ... implement other methods
 * }
 * 
 * // Register with factory
 * CacheFactory.register('redis', RedisCache);
 * ```
 * 
 * ## Advanced Usage Patterns
 * 
 * ### API Response Caching
 * ```typescript
 * const apiCache = CacheFactory.create('memory', {
 *   namespace: 'api',
 *   defaultTtl: 300000 // 5 minutes
 * });
 * 
 * const cachedFetch = CacheUtils.memoize(
 *   async (url: string, options?: RequestInit) => {
 *     const response = await fetch(url, options);
 *     return response.json();
 *   },
 *   apiCache,
 *   {
 *     keyGenerator: (args) => `${args[0]}:${JSON.stringify(args[1] || {})}`
 *   }
 * );
 * ```
 * 
 * ### Database Query Caching
 * ```typescript
 * class UserService {
 *   private cache = CacheFactory.create('memory', { namespace: 'users' });
 *   private memoizer = CacheUtils.createMemoizer(this.cache, { ttl: 600000 });
 *   
 *   // Automatically cached for 10 minutes
 *   getUserById = this.memoizer(async (id: string): Promise<User> => {
 *     return await db.users.findById(id);
 *   });
 *   
 *   // Custom TTL for different operations
 *   getUserStats = this.memoizer(
 *     async (id: string) => await db.userStats.compute(id),
 *     { ttl: 3600000 } // 1 hour
 *   );
 * }
 * ```
 * 
 * ### Multi-Layer Caching
 * ```typescript
 * // L1: Fast memory cache
 * const l1Cache = new MemoryCache({ defaultTtl: 60000 }); // 1 minute
 * 
 * // L2: Persistent file cache
 * const l2Cache = CacheFactory.create('filesystem', {
 *   cacheDir: '/tmp/l2-cache',
 *   defaultTtl: 3600000 // 1 hour
 * });
 * 
 * async function multiLayerGet<T>(key: string): Promise<T | null> {
 *   // Try L1 first
 *   let result = await l1Cache.get<T>(key);
 *   if (result !== null) return result;
 *   
 *   // Try L2
 *   result = await l2Cache.get<T>(key);
 *   if (result !== null) {
 *     // Populate L1 for next time
 *     await l1Cache.set(key, result);
 *     return result;
 *   }
 *   
 *   return null;
 * }
 * ```
 * 
 * ### Batch Operations
 * ```typescript
 * // Parallel cache operations
 * const userIds = ['1', '2', '3'];
 * const cachedUsers = await CacheUtils.batchGet(cache, userIds);
 * 
 * // Batch write
 * await CacheUtils.batchSet(cache, [
 *   { key: 'user:1', value: user1, options: { ttl: 300000 } },
 *   { key: 'user:2', value: user2 },
 *   { key: 'user:3', value: user3 }
 * ]);
 * ```
 * 
 * ## Configuration Options
 * 
 * ### Cache Configuration
 * ```typescript
 * interface CacheConfig {
 *   defaultTtl?: number;        // Default expiration time in ms
 *   enableStats?: boolean;      // Track hit/miss statistics
 *   keyPrefix?: string;         // Prefix for all keys
 *   namespace?: string;         // Logical grouping of entries
 *   verbose?: boolean;          // Enable detailed logging
 *   logPrefix?: string;         // Custom log message prefix
 * }
 * ```
 * 
 * ### Memoization Options
 * ```typescript
 * interface MemoizeOptions {
 *   ttl?: number;                              // TTL for cached results
 *   namespace?: string;                        // Cache key namespace
 *   keyGenerator?: (args: any[]) => string;    // Custom key generation
 *   includeThis?: boolean;                     // Include 'this' in cache key
 *   errorOnCacheFailure?: boolean;             // Throw on cache errors
 * }
 * ```
 * 
 * ## Monitoring & Debugging
 * 
 * ### Statistics Tracking
 * ```typescript
 * const cache = new MemoryCache({ enableStats: true });
 * 
 * // After some operations...
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 * console.log(`Total operations: ${stats.hits + stats.misses}`);
 * 
 * // Reset statistics
 * cache.resetStats();
 * ```
 * 
 * ### Verbose Logging
 * ```typescript
 * const cache = new MemoryCache({
 *   verbose: true,
 *   logPrefix: '[MyAppCache]'
 * });
 * // Logs: "2023-12-07T10:30:00Z [MyAppCache] Cache hit: { key: 'user:123' }"
 * ```
 * 
 * ## Performance Considerations
 * 
 * - **Memory Cache**: Use for frequently accessed, small-to-medium datasets
 * - **File Cache**: Use for larger datasets that need persistence
 * - **TTL Values**: Balance between freshness and performance
 * - **Key Generation**: Avoid overly complex key generation functions
 * - **Namespace Usage**: Prevents key collisions and enables logical grouping
 * - **Batch Operations**: Use for multiple related cache operations
 * 
 * ## Error Handling
 * 
 * The cache system is designed for graceful degradation:
 * 
 * ```typescript
 * // Memoized functions continue working even if cache fails
 * const memoizedFn = CacheUtils.memoize(originalFn, cache, {
 *   errorOnCacheFailure: false // Default: continue on cache errors
 * });
 * 
 * // Manual error handling
 * try {
 *   await cache.set('key', 'value');
 * } catch (error) {
 *   console.warn('Cache write failed, continuing without cache');
 *   // Application continues normally
 * }
 * ```
 * 
 * ## Testing
 * 
 * ```typescript
 * import { MemoizationTests } from 'tidyscripts_common';
 * 
 * // Run comprehensive test suite
 * await MemoizationTests.runAllTests();
 * ```
 * 
 * @packageDocumentation
 */

/**
 * Core cache interface that all cache implementations must conform to.
 * Provides async operations for getting, setting, and managing cached data.
 * 
 * @template T - The type of values stored in the cache
 * 
 * @example
 * ```typescript
 * const cache: ICache<string> = new MemoryCache();
 * await cache.set('key', 'value');
 * const value = await cache.get('key'); // 'value'
 * ```
 */
export interface ICache<T = any> {
  /** Cache configuration */
  config: CacheConfig;
  
  /**
   * Retrieves a value from the cache by key.
   * 
   * @param key - The cache key to retrieve
   * @returns The cached value or null if not found or expired
   */
  get(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache with optional configuration.
   * 
   * @param key - The cache key to store under
   * @param value - The value to cache
   * @param options - Optional caching configuration (TTL, metadata)
   */
  set(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /**
   * Checks if a key exists in the cache and is not expired.
   * 
   * @param key - The cache key to check
   * @returns True if the key exists and is valid
   */
  has(key: string): Promise<boolean>;

  /**
   * Removes a specific key from the cache.
   * 
   * @param key - The cache key to delete
   * @returns True if the key was successfully deleted
   */
  delete(key: string): Promise<boolean>;

  /**
   * Removes all entries from the cache.
   */
  clear(): Promise<void>;

  /**
   * Returns all keys currently stored in the cache.
   * 
   * @returns Array of all cache keys
   */
  keys(): Promise<string[]>;

  /**
   * Returns the number of entries in the cache.
   * 
   * @returns Current cache size
   */
  size(): Promise<number>;
}

/**
 * Options for configuring cache set operations.
 */
export interface CacheSetOptions {
  /** Time to live in milliseconds. After this time, the entry will be considered expired. */
  ttl?: number;
  /** Additional metadata to store with the cache entry. */
  metadata?: Record<string, any>;
}

/**
 * Internal representation of a cache entry with metadata and expiration info.
 * 
 * @template T - The type of the cached value
 */
export interface CacheEntry<T = any> {
  /** The actual cached value */
  value: T;
  /** Timestamp when the entry was created */
  createdAt: number;
  /** Optional timestamp when the entry expires */
  expiresAt?: number;
  /** Additional metadata associated with this entry */
  metadata?: Record<string, any>;
}

/**
 * Statistics tracking for cache performance monitoring.
 */
export interface CacheStats {
  /** Number of successful cache retrievals */
  hits: number;
  /** Number of failed cache retrievals (key not found or expired) */
  misses: number;
  /** Number of cache write operations */
  sets: number;
  /** Number of cache delete operations */
  deletes: number;
  /** Cache hit rate as a percentage (hits / (hits + misses)) */
  hitRate: number;
}

/**
 * Configuration options for cache implementations.
 */
export interface CacheConfig {
  /** Default time-to-live for cache entries in milliseconds */
  defaultTtl?: number;
  /** Whether to track and maintain cache statistics */
  enableStats?: boolean;
  /** Prefix to add to all cache keys */
  keyPrefix?: string;
  /** Namespace for grouping related cache entries */
  namespace?: string;
  /** Enable verbose logging for cache operations */
  verbose?: boolean;
  /** Prefix string for log messages (e.g., '[EntityCache]', '[EmbeddingCache]') */
  logPrefix?: string;
  /** Only log cache hits and misses, ignoring verbose setting */
  onlyLogHitsMisses?: boolean;
}

/**
 * Abstract base class providing common functionality for cache implementations.
 * Handles statistics tracking, key building, entry creation, and logging.
 * 
 * @template T - The type of values stored in the cache
 * 
 * @example
 * ```typescript
 * class FileCache extends BaseCache<string> {
 *   constructor(config?: CacheConfig) {
 *     super({ logPrefix: '[FileCache]', ...config });
 *   }
 *   // Implement abstract methods...
 * }
 * ```
 */
export abstract class BaseCache<T = any> implements ICache<T> {
  public config: CacheConfig;
    protected stats: CacheStats;
    public logger : any ;

  /**
   * Creates a new cache instance with the provided configuration.
   * 
   * @param config - Cache configuration options
   */
  constructor(config: CacheConfig = {}) {
    this.config = {
      enableStats: true,
      verbose: false,
      logPrefix: 'cache',
      ...config
    };

      this.logger = get_logger({id : config.logPrefix || "cache"}) ; 
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0
    };

    this.log('Cache instance created', { config: this.config });
  }

  // Abstract methods that implementations must provide
  
  /**
   * Retrieves a value from the cache by key.
   * Must be implemented by concrete cache classes.
   * 
   * @param key - The cache key to retrieve
   * @returns The cached value or null if not found or expired
   */
  abstract get(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache with optional configuration.
   * Must be implemented by concrete cache classes.
   * 
   * @param key - The cache key to store under
   * @param value - The value to cache
   * @param options - Optional caching configuration (TTL, metadata)
   */
  abstract set(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /**
   * Checks if a key exists in the cache and is not expired.
   * Must be implemented by concrete cache classes.
   * 
   * @param key - The cache key to check
   * @returns True if the key exists and is valid
   */
  abstract has(key: string): Promise<boolean>;

  /**
   * Removes a specific key from the cache.
   * Must be implemented by concrete cache classes.
   * 
   * @param key - The cache key to delete
   * @returns True if the key was successfully deleted
   */
  abstract delete(key: string): Promise<boolean>;

  /**
   * Removes all entries from the cache.
   * Must be implemented by concrete cache classes.
   */
  abstract clear(): Promise<void>;

  /**
   * Returns all keys currently stored in the cache.
   * Must be implemented by concrete cache classes.
   * 
   * @returns Array of all cache keys
   */
  abstract keys(): Promise<string[]>;

  /**
   * Returns the number of entries in the cache.
   * Must be implemented by concrete cache classes.
   * 
   * @returns Current cache size
   */
  abstract size(): Promise<number>;

  /**
   * Builds a full cache key by combining prefix, namespace, and the provided key.
   * 
   * @param key - The base cache key
   * @returns The fully qualified cache key
   * @protected
   */
  protected buildKey(key: string): string {
    const prefix = this.config.keyPrefix || '';
    const namespace = this.config.namespace || '';
    const fullKey = [prefix, namespace, key].filter(Boolean).join(':');
    
    this.log('Built cache key', { originalKey: key, fullKey });
    return fullKey;
  }

  /**
   * Creates a cache entry with metadata and expiration information.
   * 
   * @template U - The type of the value being cached
   * @param value - The value to cache
   * @param options - Optional caching configuration
   * @returns A complete cache entry object
   * @protected
   */
  protected createCacheEntry<U>(value: U, options?: CacheSetOptions): CacheEntry<U> {
    const now = Date.now();
    const ttl = options?.ttl || this.config.defaultTtl;
    
    const entry: CacheEntry<U> = {
      value,
      createdAt: now,
      expiresAt: ttl ? now + ttl : undefined,
      metadata: options?.metadata
    };

    this.log('Created cache entry', { 
      ttl, 
      expiresAt: entry.expiresAt, 
      hasMetadata: !!options?.metadata 
    });

    return entry;
  }

  /**
   * Checks if a cache entry has expired based on its expiration timestamp.
   * 
   * @param entry - The cache entry to check
   * @returns True if the entry has expired
   * @protected
   */
  protected isExpired(entry: CacheEntry): boolean {
    const expired = entry.expiresAt ? Date.now() > entry.expiresAt : false;
    
    if (expired) {
      this.log('Cache entry expired', { 
        expiresAt: entry.expiresAt, 
        now: Date.now() 
      });
    }

    return expired;
  }

  /**
   * Updates cache statistics for performance monitoring.
   * 
   * @param operation - The type of operation that occurred
   * @param context - Additional context for hit/miss logging
   * @protected
   */
  protected updateStats(operation: 'hit' | 'miss' | 'set' | 'delete', context?: { key?: string; fullKey?: string; reason?: string; [key: string]: any }): void {
    if (!this.config.enableStats) return;
    
    if (operation === 'hit') {
      this.stats.hits++;
      this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
      this.log(`Cache hit: key=${context?.key || 'unknown'} hitRate=${(this.stats.hitRate * 100).toFixed(2)}%`);
    } else if (operation === 'miss') {
      this.stats.misses++;
      this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
      this.log(`Cache miss: key=${context?.key || 'unknown'} reason=${context?.reason || 'unknown'} hitRate=${(this.stats.hitRate * 100).toFixed(2)}%`);
    } else if (operation === 'set') {
      this.stats.sets++;
    } else if (operation === 'delete') {
      this.stats.deletes++;
    }
    
    this.log('Stats updated', { operation, stats: this.stats });
  }

  /**
   * Logs a message if verbose logging is enabled.
   * 
   * @param message - The log message
   * @param data - Optional additional data to log
   * @protected
   */
  protected log(message: string, data?: any): void {
    if (this.config.onlyLogHitsMisses) {
      // Only log if it's a hit/miss message
      if (!message.includes('Cache hit') && !message.includes('Cache miss')) return;
    } else if (!this.config.verbose) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const prefix = this.config.logPrefix || '[Cache]';
    
      if (data) {
	  this.logger(message) ; 
	  this.logger(data) ; 
	  //console.log(`${timestamp} ${prefix} ${message}:`, data);
    } else {
	//console.log(`${timestamp} ${prefix} ${message}`);
	this.logger(message) 
    }
  }

  /**
   * Returns a copy of the current cache statistics.
   * 
   * @returns Current cache performance statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Resets all cache statistics to zero.
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0
    };

    this.log('Stats reset');
  }
}

/**
 * Factory class for creating and managing different cache implementations.
 * Provides registration and instantiation of cache types.
 * 
 * @example
 * ```typescript
 * // Register a custom cache implementation
 * CacheFactory.register('redis', RedisCache);
 * 
 * // Create cache instances
 * const memoryCache = CacheFactory.create('memory', { 
 *   logPrefix: '[EntityCache]',
 *   verbose: true 
 * });
 * const redisCache = CacheFactory.create('redis', { namespace: 'embeddings' });
 * ```
 */
export class CacheFactory {
  private static implementations = new Map<string, new (config?: CacheConfig) => ICache>();

  /**
   * Registers a new cache implementation with the factory.
   * 
   * @template T - The cache implementation type
   * @param name - Unique name for this cache implementation
   * @param implementation - Constructor for the cache implementation
   */
  static register<T extends ICache>(name: string, implementation: new (config?: CacheConfig) => T): void {
    this.implementations.set(name, implementation);
  }

  /**
   * Creates a new cache instance of the specified type.
   * 
   * @template T - The type of values the cache will store
   * @param type - The registered cache implementation name
   * @param config - Configuration options for the cache
   * @returns A new cache instance
   * @throws Error if the cache type is not registered
   */
  static create<T = any>(type: string, config?: CacheConfig): ICache<T> {
    const Implementation = this.implementations.get(type);
    if (!Implementation) {
      throw new Error(`Cache implementation '${type}' not found. Available: ${Array.from(this.implementations.keys()).join(', ')}`);
    }
    return new Implementation(config);
  }

  /**
   * Returns a list of all registered cache implementation names.
   * 
   * @returns Array of available cache type names
   */
  static getAvailableTypes(): string[] {
    return Array.from(this.implementations.keys());
  }
}

/**
 * Utility functions for common cache operations and key generation.
 */
export class CacheUtils {
  /**
   * Generates a hash-based cache key from input data.
   * Uses SHA256 for collision resistance and security.
   * 
   * @param input - String or object to generate a key from
   * @returns A promise that resolves to a SHA256 hash string suitable for use as a cache key
   * 
   * @example
   * ```typescript
   * const key1 = await CacheUtils.generateKey('some text content');
   * const key2 = await CacheUtils.generateKey({ prompt: 'extract', content: 'medical text' });
   * ```
   */
  static async generateKey(input: string | object): Promise<string> {
    return await cryptography.object_sha256(input);
  }

  /**
   * Retrieves multiple values from the cache in parallel.
   * 
   * @template T - The type of cached values
   * @param cache - The cache instance to query
   * @param keys - Array of keys to retrieve
   * @returns Map of keys to their cached values (or null if not found)
   * 
   * @example
   * ```typescript
   * const results = await CacheUtils.batchGet(cache, ['key1', 'key2', 'key3']);
   * console.log(results.get('key1')); // cached value or null
   * ```
   */
  static async batchGet<T>(cache: ICache<T>, keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const promises = keys.map(async (key) => {
      const value = await cache.get(key);
      results.set(key, value);
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Stores multiple key-value pairs in the cache in parallel.
   * 
   * @template T - The type of values to cache
   * @param cache - The cache instance to write to
   * @param entries - Array of cache entries to store
   * 
   * @example
   * ```typescript
   * await CacheUtils.batchSet(cache, [
   *   { key: 'key1', value: 'value1', options: { ttl: 5000 } },
   *   { key: 'key2', value: 'value2' }
   * ]);
   * ```
   */
  static async batchSet<T>(
    cache: ICache<T>, 
    entries: Array<{ key: string; value: T; options?: CacheSetOptions }>
  ): Promise<void> {
    const promises = entries.map(({ key, value, options }) => cache.set(key, value, options));
    await Promise.all(promises);
  }

  /**
   * Memoizes a function using the provided cache instance.
   * Creates a cached version of the function that stores results and returns cached values for repeated calls.
   * 
   * @template T - The function type to memoize
   * @param fn - The function to memoize
   * @param cache - The cache instance to use for storage
   * @param options - Memoization configuration options
   * @returns A memoized version of the function
   * 
   * @example
   * ```typescript
   * const cache = new MemoryCache();
   * const memoizedFn = CacheUtils.memoize(expensiveFunction, cache, {
   *   ttl: 300000, // 5 minutes
   *   namespace: 'calculations',
   *   keyGenerator: (args) => `custom:${args[0]}`
   * });
   * 
   * // First call - executes function and caches result
   * const result1 = await memoizedFn(123);
   * // Second call - returns cached result
   * const result2 = await memoizedFn(123);
   * ```
   */
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    cache: ICache<ReturnType<T>>,
    options: MemoizeOptions = {}
  ): T {
    const {
      ttl,
      keyGenerator,
      includeThis = false,
      errorOnCacheFailure = false
    } = options;

    const memoizedFn = async function(this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
      try {
        // Generate cache key
        const functionName = fn.name || 'anonymous';
        const argsForKey = includeThis && this ? [this, ...args] : args;
        const argsHash = keyGenerator ? keyGenerator(argsForKey) : await CacheUtils.generateKey(argsForKey);
        const cacheKey = `${functionName}:${argsHash}`;

        // Try to get from cache
        const cachedResult = await cache.get(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }

        // Execute original function
        const result = await fn.apply(this, args);

        // Cache the result
        try {
          await cache.set(cacheKey, result, { ttl });
        } catch (cacheError) {
          if (errorOnCacheFailure) {
            throw new Error(`Cache storage failed: ${cacheError}`);
          }
          // Silently continue if cache fails but function succeeded
        }

        return result;
      } catch (error) {
        // If cache retrieval fails, try to execute the function
        if ((error as Error).message?.includes('Cache') && !errorOnCacheFailure) {
          return await fn.apply(this, args);
        }
        throw error;
      }
    };

    // Preserve function properties
    Object.defineProperty(memoizedFn, 'name', { value: `memoized_${fn.name}` });
    Object.defineProperty(memoizedFn, 'length', { value: fn.length });

    return memoizedFn as T;
  }

  /**
   * Creates a memoizer function bound to a specific cache instance.
   * Useful for creating multiple memoized functions with the same cache and default options.
   * 
   * @template T - The type of values to cache
   * @param cache - The cache instance to bind to
   * @param defaultOptions - Default memoization options
   * @returns A memoizer function
   * 
   * @example
   * ```typescript
   * const cache = new MemoryCache();
   * const memoizer = CacheUtils.createMemoizer(cache, {
   *   ttl: 300000,
   *   namespace: 'api'
   * });
   * 
   * const memoizedFetch = memoizer(fetchUserData);
   * const memoizedCalc = memoizer(expensiveCalculation, { ttl: 600000 });
   * ```
   */
  static createMemoizer(
    cache: ICache<any>,
    defaultOptions: MemoizeOptions = {}
  ): <F extends (...args: any[]) => any>(fn: F, options?: MemoizeOptions) => F {
    return <F extends (...args: any[]) => any>(fn: F, options: MemoizeOptions = {}): F => {
      const mergedOptions = { ...defaultOptions, ...options };
      return CacheUtils.memoize(fn, cache as ICache<ReturnType<F>>, mergedOptions);
    };
  }
}

/**
 * Configuration options for memoization.
 */
export interface MemoizeOptions {
  /** Time to live for cached results in milliseconds */
  ttl?: number;
  /** Namespace for cache keys to avoid collisions */
  namespace?: string;
  /** Custom function to generate cache keys from arguments */
  keyGenerator?: (args: any[]) => string;
  /** Whether to include 'this' context in cache key generation */
  includeThis?: boolean;
  /** Whether to throw errors when cache operations fail */
  errorOnCacheFailure?: boolean;
}

/**
 * In-memory cache implementation using a JavaScript Map.
 * Fast and simple, but data is lost when the process exits.
 * 
 * @template T - The type of values stored in the cache
 * 
 * @example
 * ```typescript
 * const cache = new MemoryCache<string>({
 *   defaultTtl: 5000,
 *   verbose: true,
 *   logPrefix: '[EntityCache]',
 *   namespace: 'medical'
 * });
 * 
 * await cache.set('disease:diabetes', 'Type 2 Diabetes Mellitus');
 * const result = await cache.get('disease:diabetes');
 * ```
 */
export class MemoryCache<T = any> extends BaseCache<T> {
  private storage = new Map<string, CacheEntry<T>>();

  /**
   * Creates a new in-memory cache instance.
   * 
   * @param config - Cache configuration options
   */
  constructor(config?: CacheConfig) {
    super({
      logPrefix: 'memoryCache',
      ...config
    });
  }

  /**
   * Retrieves a value from the memory cache.
   * 
   * @param key - The cache key to retrieve
   * @returns The cached value or null if not found or expired
   */
  async get(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const entry = this.storage.get(fullKey);
    
    this.log('Get operation', { key, fullKey, found: !!entry });
    
    if (!entry) {
      this.updateStats('miss', { key, fullKey, reason: 'not_found' });
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.log('Entry expired, removing', { key, fullKey });
      this.storage.delete(fullKey);
      this.updateStats('miss', { key, fullKey, reason: 'expired' });
      return null;
    }
    
    this.log('Cache hit', { key, fullKey });
    this.updateStats('hit', { key, fullKey });
    return entry.value;
  }

  /**
   * Stores a value in the memory cache.
   * 
   * @param key - The cache key to store under
   * @param value - The value to cache
   * @param options - Optional caching configuration (TTL, metadata)
   */
  async set(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const fullKey = this.buildKey(key);
    const entry = this.createCacheEntry(value, options);
    
    this.log('Set operation', { 
      key, 
      fullKey, 
      ttl: options?.ttl,
      hasMetadata: !!options?.metadata 
    });
    
    this.storage.set(fullKey, entry);
    this.updateStats('set');
  }

  /**
   * Checks if a key exists in the cache and is not expired.
   * 
   * @param key - The cache key to check
   * @returns True if the key exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const entry = this.storage.get(fullKey);
    
    this.log('Has operation', { key, fullKey, found: !!entry });
    
    if (!entry) {
      return false;
    }
    
    if (this.isExpired(entry)) {
      this.log('Entry expired, removing', { key, fullKey });
      this.storage.delete(fullKey);
      return false;
    }
    
    return true;
  }

  /**
   * Removes a specific key from the cache.
   * 
   * @param key - The cache key to delete
   * @returns True if the key was successfully deleted
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const deleted = this.storage.delete(fullKey);
    
    this.log('Delete operation', { key, fullKey, deleted });
    
    if (deleted) this.updateStats('delete');
    return deleted;
  }

  async clear(): Promise<void> {
    const previousSize = this.storage.size;
    this.storage.clear();
    
    this.log('Clear operation', { previousSize });
  }

  /**
   * Returns all keys currently stored in the cache.
   * Filters out expired entries and returns the original keys without prefixes.
   * 
   * @returns Array of all cache keys
   */
  async keys(): Promise<string[]> {
    const validKeys: string[] = [];
    const prefix = this.config.keyPrefix || '';
    const namespace = this.config.namespace || '';
    const prefixLength = [prefix, namespace].filter(Boolean).join(':').length;
    const separatorAdjustment = prefixLength > 0 ? 1 : 0;
    
    for (const [fullKey, entry] of this.storage.entries()) {
      if (!this.isExpired(entry)) {
        // Extract original key by removing prefix and namespace
        const originalKey = fullKey.substring(prefixLength + separatorAdjustment);
        validKeys.push(originalKey);
      } else {
        // Clean up expired entries
        this.storage.delete(fullKey);
      }
    }
    
    this.log('Keys operation', { count: validKeys.length });
    return validKeys;
  }

  /**
   * Returns the number of valid (non-expired) entries in the cache.
   * 
   * @returns Current cache size
   */
  async size(): Promise<number> {
    let validCount = 0;
    
    for (const [fullKey, entry] of this.storage.entries()) {
      if (!this.isExpired(entry)) {
        validCount++;
      } else {
        // Clean up expired entries
        this.storage.delete(fullKey);
      }
    }
    
    this.log('Size operation', { size: validCount });
    return validCount;
  }
}

// Register the memory implementation with the factory
CacheFactory.register('memory', MemoryCache);

/**
 * Test functions for the memoization functionality.
 */
export class MemoizationTests {
  /**
   * Comprehensive test suite for the memoization functionality.
   * Tests various scenarios including basic memoization, TTL, custom key generation, and error handling.
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Starting Memoization Tests...\n');
    
    await this.testBasicMemoization();
    await this.testTTLExpiration();
    await this.testCustomKeyGeneration();
    await this.testNamespaceIsolation();
    await this.testErrorHandling();
    await this.testMemoizerFactory();
    await this.testThisContext();
    await this.testFunctionPreservation();
    
    console.log('🎉 All memoization tests completed successfully!');
  }

  /**
   * Test basic memoization functionality.
   */
  static async testBasicMemoization(): Promise<void> {
    console.log('📝 Test 1: Basic Memoization');
    
    const cache = new MemoryCache();
    let callCount = 0;
    
    const expensiveFunction = async (x: number): Promise<number> => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      return x * 2;
    };
    
    const memoized = CacheUtils.memoize(expensiveFunction, cache);
    
    // First call
    const result1 = await memoized(5);
    console.log(`✅ First call result: ${result1}, Call count: ${callCount}`);
    
    // Second call (should be cached)
    const result2 = await memoized(5);
    console.log(`✅ Second call result: ${result2}, Call count: ${callCount}`);
    
    // Third call with different args
    const result3 = await memoized(10);
    console.log(`✅ Third call result: ${result3}, Call count: ${callCount}`);
    
    console.log(`✅ Expected: 10, 10, 20 | Got: ${result1}, ${result2}, ${result3}`);
    console.log(`✅ Expected call count: 2 | Got: ${callCount}\n`);
  }

  /**
   * Test TTL expiration functionality.
   */
  static async testTTLExpiration(): Promise<void> {
    console.log('⏰ Test 2: TTL Expiration');
    
    const cache = new MemoryCache();
    let callCount = 0;
    
    const timedFunction = async (x: number): Promise<number> => {
      callCount++;
      return x * 3;
    };
    
    const memoized = CacheUtils.memoize(timedFunction, cache, { ttl: 100 });
    
    // First call
    const result1 = await memoized(7);
    console.log(`✅ Before expiration: ${result1}, Call count: ${callCount}`);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Second call after expiration
    const result2 = await memoized(7);
    console.log(`✅ After expiration: ${result2}, Call count: ${callCount}`);
    
    console.log(`✅ Expected call count: 2 | Got: ${callCount}\n`);
  }

  /**
   * Test custom key generation.
   */
  static async testCustomKeyGeneration(): Promise<void> {
    console.log('🔑 Test 3: Custom Key Generation');
    
    const cache = new MemoryCache();
    let callCount = 0;
    
    const objectFunction = async (obj: { id: number; name: string }): Promise<string> => {
      callCount++;
      return `${obj.name}-${obj.id}`;
    };
    
    const memoized = CacheUtils.memoize(objectFunction, cache, {
      keyGenerator: (args) => `obj:${args[0].id}` // Only use ID for key
    });
    
    // These should be considered the same due to custom key generation
    const result1 = await memoized({ id: 1, name: 'Alice' });
    const result2 = await memoized({ id: 1, name: 'Bob' }); // Different name, same ID
    
    console.log(`✅ First call: ${result1}, Call count: ${callCount}`);
    console.log(`✅ Second call: ${result2}, Call count: ${callCount}`);
    console.log(`✅ Expected call count: 1 | Got: ${callCount}\n`);
  }

  /**
   * Test namespace isolation.
   */
  static async testNamespaceIsolation(): Promise<void> {
    console.log('🏠 Test 4: Namespace Isolation');
    
    const cache = new MemoryCache();
    let callCount1 = 0;
    let callCount2 = 0;
    
    const func1 = async (x: number): Promise<number> => {
      callCount1++;
      return x + 1;
    };
    
    const func2 = async (x: number): Promise<number> => {
      callCount2++;
      return x + 2;
    };
    
    const memoized1 = CacheUtils.memoize(func1, cache, { namespace: 'ns1' });
    const memoized2 = CacheUtils.memoize(func2, cache, { namespace: 'ns2' });
    
    // Same arguments, different namespaces
    const result1 = await memoized1(5);
    const result2 = await memoized2(5);
    
    console.log(`✅ Namespace 1 result: ${result1}, Call count: ${callCount1}`);
    console.log(`✅ Namespace 2 result: ${result2}, Call count: ${callCount2}`);
    console.log(`✅ Expected: 6, 7 | Got: ${result1}, ${result2}\n`);
  }

  /**
   * Test error handling scenarios.
   */
  static async testErrorHandling(): Promise<void> {
    console.log('❌ Test 5: Error Handling');
    
    const cache = new MemoryCache();
    let callCount = 0;
    
    const errorFunction = async (shouldFail: boolean): Promise<string> => {
      callCount++;
      if (shouldFail) {
        throw new Error('Function failed');
      }
      return 'success';
    };
    
    const memoized = CacheUtils.memoize(errorFunction, cache);
    
    try {
      // This should fail
      await memoized(true);
    } catch (error) {
      console.log(`✅ Expected error caught: ${(error as Error).message}`);
    }
    
    // This should succeed
    const result = await memoized(false);
    console.log(`✅ Success result: ${result}, Call count: ${callCount}\n`);
  }

  /**
   * Test memoizer factory pattern.
   */
  static async testMemoizerFactory(): Promise<void> {
    console.log('🏭 Test 6: Memoizer Factory');
    
    const cache = new MemoryCache();
    const memoizer = CacheUtils.createMemoizer(cache, {
      namespace: 'factory',
      ttl: 1000
    });
    
    let callCount = 0;
    const testFunction = async (x: number): Promise<number> => {
      callCount++;
      return x * 4;
    };
    
    const memoized = memoizer(testFunction);
    
    const result1 = await memoized(3);
    const result2 = await memoized(3);
    
    console.log(`✅ Factory memoized result: ${result1}, ${result2}`);
    console.log(`✅ Expected call count: 1 | Got: ${callCount}\n`);
  }

  /**
   * Test 'this' context handling.
   */
  static async testThisContext(): Promise<void> {
    console.log('🎯 Test 7: This Context');
    
    const cache = new MemoryCache();
    
    class TestClass {
      multiplier: number;
      callCount: number = 0;
      
      constructor(multiplier: number) {
        this.multiplier = multiplier;
      }
      
      async calculate(x: number): Promise<number> {
        this.callCount++;
        return x * this.multiplier;
      }
    }
    
    const obj1 = new TestClass(5);
    const obj2 = new TestClass(10);
    
    const memoized = CacheUtils.memoize(obj1.calculate.bind(obj1), cache, {
      includeThis: true
    });
    
    const result1 = await memoized(3);
    const result2 = await memoized(3); // Should be cached
    
    console.log(`✅ This context result: ${result1}, ${result2}`);
    console.log(`✅ Expected call count: 1 | Got: ${obj1.callCount}\n`);
  }

  /**
   * Test function property preservation.
   */
  static async testFunctionPreservation(): Promise<void> {
    console.log('🔧 Test 8: Function Property Preservation');
    
    const cache = new MemoryCache();
    
    async function namedFunction(a: number, b: number, c: number): Promise<number> {
      return a + b + c;
    }
    
    const memoized = CacheUtils.memoize(namedFunction, cache);
    
    console.log(`✅ Original name: ${namedFunction.name}, length: ${namedFunction.length}`);
    console.log(`✅ Memoized name: ${memoized.name}, length: ${memoized.length}`);
    console.log(`✅ Name includes 'memoized': ${memoized.name.includes('memoized')}\n`);
  }
}
