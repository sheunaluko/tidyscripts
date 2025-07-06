import * as fs from 'fs';
import * as path from 'path';
import * as common from "tidyscripts_common" ;


type CacheEntry<T> = common.apis.cache.CacheEntry<T>;
type CacheConfig = common.apis.cache.CacheConfig;
type CacheSetOptions = common.apis.cache.CacheSetOptions;
type ICache<T> = common.apis.cache.ICache<T>;

const { CacheUtils, BaseCache, CacheFactory } = common.apis.cache;



/**
 * Configuration options specific to the FileSystemCache.
 */
interface FileSystemCacheConfig extends CacheConfig {
  /** Directory path where cache files will be stored */
  cacheDir: string;
}

// Create a type that allows FileSystemCache to work with CacheFactory
type FileSystemCacheConstructor = new (config?: CacheConfig) => FileSystemCache<any>;

/**
 * File system cache implementation that stores cache entries as JSON files.
 * Each cache entry is stored as a separate file in the specified directory.
 * 
 * @template T - The type of values stored in the cache
 * 
 * @example
 * ```typescript
 * const cache = new FileSystemCache<string>({
 *   cacheDir: '/tmp/my-cache',
 *   defaultTtl: 5000,
 *   verbose: true,
 *   logPrefix: '[FileCache]',
 *   namespace: 'medical'
 * });
 * 
 * await cache.set('disease:diabetes', 'Type 2 Diabetes Mellitus');
 * const result = await cache.get('disease:diabetes');
 * ```
 */
export class FileSystemCache<T = any> extends BaseCache<T> {
  private cacheDir: string;

  /**
   * Creates a new file system cache instance.
   * 
   * @param config - Cache configuration options including cacheDir
   */
  constructor(config: FileSystemCacheConfig) {
    super({
      logPrefix: '[FileSystemCache]',
      ...config
    });
    
    this.cacheDir = config.cacheDir;
    this.ensureCacheDirectory();
  }

  /**
   * Ensures the cache directory exists, creating it if necessary.
   */
  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        this.log('Created cache directory', { cacheDir: this.cacheDir });
      }
    } catch (error) {
      this.log('Error creating cache directory', { error, cacheDir: this.cacheDir });
      throw new Error(`Failed to create cache directory: ${this.cacheDir}`);
    }
  }

  /**
   * Generates a safe filename from a cache key.
   * 
   * @param key - The cache key
   * @returns A safe filename
   */
  private keyToFilename(key: string): string {
    // Replace unsafe characters with underscores and add .json extension
    const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${safeKey}.json`;
  }

  /**
   * Gets the full file path for a cache key.
   * 
   * @param key - The cache key
   * @returns The full file path
   */
  private getFilePath(key: string): string {
    const filename = this.keyToFilename(key);
    return path.join(this.cacheDir, filename);
  }

  /**
   * Retrieves a value from the file system cache.
   * 
   * @param key - The cache key to retrieve
   * @returns The cached value or null if not found or expired
   */
  async get(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const filePath = this.getFilePath(fullKey);
    
    this.log('Get operation', { key, fullKey, filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        this.updateStats('miss', { key, fullKey, reason: 'file_not_found' });
        return null;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const entry: CacheEntry<T> = JSON.parse(fileContent);
      
      if (this.isExpired(entry)) {
        this.log('Entry expired, removing file', { key, fullKey, filePath });
        fs.unlinkSync(filePath);
        this.updateStats('miss', { key, fullKey, reason: 'expired' });
        return null;
      }
      
      //this.log('Cache hit', { key, fullKey });
      this.updateStats('hit', { key, fullKey });
      return entry.value;
    } catch (error) {
      this.log('Error reading cache file', { error, key, fullKey, filePath });
      this.updateStats('miss', { key, fullKey, reason: 'read_error' });
      return null;
    }
  }

  /**
   * Stores a value in the file system cache.
   * 
   * @param key - The cache key to store under
   * @param value - The value to cache
   * @param options - Optional caching configuration (TTL, metadata)
   */
  async set(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const fullKey = this.buildKey(key);
    const filePath = this.getFilePath(fullKey);
    const entry = this.createCacheEntry(value, options);
    
    this.log('Set operation', { 
      key, 
      fullKey, 
      filePath,
      ttl: options?.ttl,
      hasMetadata: !!options?.metadata 
    });
    
    try {
      const fileContent = JSON.stringify(entry, null, 2);
      fs.writeFileSync(filePath, fileContent, 'utf8');
      this.updateStats('set');
    } catch (error) {
      this.log('Error writing cache file', { error, key, fullKey, filePath });
      throw new Error(`Failed to write cache file: ${filePath}`);
    }
  }

  /**
   * Checks if a key exists in the cache and is not expired.
   * 
   * @param key - The cache key to check
   * @returns True if the key exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const filePath = this.getFilePath(fullKey);
    
    this.log('Has operation', { key, fullKey, filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const entry: CacheEntry<T> = JSON.parse(fileContent);
      
      if (this.isExpired(entry)) {
        this.log('Entry expired, removing file', { key, fullKey, filePath });
        fs.unlinkSync(filePath);
        return false;
      }
      
      return true;
    } catch (error) {
      this.log('Error checking cache file', { error, key, fullKey, filePath });
      return false;
    }
  }

  /**
   * Removes a specific key from the cache.
   * 
   * @param key - The cache key to delete
   * @returns True if the key was successfully deleted
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const filePath = this.getFilePath(fullKey);
    
    this.log('Delete operation', { key, fullKey, filePath });
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.updateStats('delete');
        return true;
      }
      return false;
    } catch (error) {
      this.log('Error deleting cache file', { error, key, fullKey, filePath });
      return false;
    }
  }

  /**
   * Removes all entries from the cache.
   */
  async clear(): Promise<void> {
    this.log('Clear operation', { cacheDir: this.cacheDir });
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      
      this.log('Clear completed', { deletedCount });
    } catch (error) {
      this.log('Error clearing cache', { error, cacheDir: this.cacheDir });
      throw new Error(`Failed to clear cache directory: ${this.cacheDir}`);
    }
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
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          
          try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const entry: CacheEntry<T> = JSON.parse(fileContent);
            
            if (!this.isExpired(entry)) {
              // Extract original key from filename (remove .json extension)
              const keyFromFile = file.slice(0, -5);
              // Remove prefix and namespace to get original key
              const originalKey = keyFromFile.substring(prefixLength + separatorAdjustment);
              validKeys.push(originalKey);
            } else {
              // Clean up expired entries
              fs.unlinkSync(filePath);
            }
          } catch (error) {
            this.log('Error reading cache file during keys operation', { error, file });
            // Skip corrupted files
          }
        }
      }
      
      this.log('Keys operation', { count: validKeys.length });
      return validKeys;
    } catch (error) {
      this.log('Error reading cache directory', { error, cacheDir: this.cacheDir });
      return [];
    }
  }

  /**
   * Returns the number of valid (non-expired) entries in the cache.
   * 
   * @returns Current cache size
   */
  async size(): Promise<number> {
    let validCount = 0;
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          
          try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const entry: CacheEntry<T> = JSON.parse(fileContent);
            
            if (!this.isExpired(entry)) {
              validCount++;
            } else {
              // Clean up expired entries
              fs.unlinkSync(filePath);
            }
          } catch (error) {
            this.log('Error reading cache file during size operation', { error, file });
            // Skip corrupted files
          }
        }
      }
      
      this.log('Size operation', { size: validCount });
      return validCount;
    } catch (error) {
      this.log('Error reading cache directory', { error, cacheDir: this.cacheDir });
      return 0;
    }
  }
}

// Register the filesystem implementation with the factory
CacheFactory.register('filesystem', FileSystemCache as any);

/**
 * Test function for the FileSystemCache implementation.
 * Creates a cache instance, performs various operations, and logs results.
 */
export async function testFileSystemCache(): Promise<void> {
  console.log('🧪 Starting FileSystemCache tests...\n');
  
  const cacheDir = '/tmp/test-cache';
  const cache = new FileSystemCache<string>({
    cacheDir,
    defaultTtl: 5000, // 5 seconds
    verbose: true,
    logPrefix: '[TestCache]',
    namespace: 'test'
  });
  
  try {
    // Test 1: Basic set and get
    console.log('📝 Test 1: Basic set and get');
    await cache.set('key1', 'value1');
    const value1 = await cache.get('key1');
    console.log(`✅ Retrieved value: ${value1}`);
    console.log(`✅ Expected: value1, Got: ${value1}, Match: ${value1 === 'value1'}\n`);
    
    // Test 2: TTL expiration
    console.log('⏰ Test 2: TTL expiration');
    await cache.set('key2', 'value2', { ttl: 1000 }); // 1 second
    const value2Before = await cache.get('key2');
    console.log(`✅ Before expiration: ${value2Before}`);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    const value2After = await cache.get('key2');
    console.log(`✅ After expiration: ${value2After}`);
    console.log(`✅ Expected: null, Got: ${value2After}, Match: ${value2After === null}\n`);
    
    // Test 3: Has method
    console.log('🔍 Test 3: Has method');
    await cache.set('key3', 'value3');
    const hasKey3 = await cache.has('key3');
    const hasKey4 = await cache.has('key4');
    console.log(`✅ Has key3: ${hasKey3}`);
    console.log(`✅ Has key4: ${hasKey4}`);
    console.log(`✅ Expected: true/false, Got: ${hasKey3}/${hasKey4}\n`);
    
    // Test 4: Delete method
    console.log('🗑️ Test 4: Delete method');
    const deletedKey3 = await cache.delete('key3');
    const hasKey3After = await cache.has('key3');
    console.log(`✅ Deleted key3: ${deletedKey3}`);
    console.log(`✅ Has key3 after delete: ${hasKey3After}`);
    console.log(`✅ Expected: true/false, Got: ${deletedKey3}/${hasKey3After}\n`);
    
    // Test 5: Keys and size
    console.log('📋 Test 5: Keys and size');
    await cache.set('key5', 'value5');
    await cache.set('key6', 'value6');
    const keys = await cache.keys();
    const size = await cache.size();
    console.log(`✅ Keys: ${JSON.stringify(keys)}`);
    console.log(`✅ Size: ${size}`);
    console.log(`✅ Expected size >= 2, Got: ${size}\n`);
    
    // Test 6: Statistics
    console.log('📊 Test 6: Statistics');
    const stats = cache.getStats();
    console.log(`✅ Cache stats:`, stats);
    console.log(`✅ Hit rate: ${(stats.hitRate * 100).toFixed(2)}%\n`);
    
    // Test 7: Clear cache
    console.log('🧹 Test 7: Clear cache');
    await cache.clear();
    const sizeAfterClear = await cache.size();
    console.log(`✅ Size after clear: ${sizeAfterClear}`);
    console.log(`✅ Expected: 0, Got: ${sizeAfterClear}, Match: ${sizeAfterClear === 0}\n`);
    
    // Test 8: Factory creation
    console.log('🏭 Test 8: Factory creation');
    const factoryCache = CacheFactory.create<string>('filesystem', {
      cacheDir: '/tmp/factory-cache',
      verbose: true,
      logPrefix: '[FactoryCache]'
    } as any);
    
    await factoryCache.set('factory-key', 'factory-value');
    const factoryValue = await factoryCache.get('factory-key');
    console.log(`✅ Factory cache value: ${factoryValue}`);
    console.log(`✅ Expected: factory-value, Got: ${factoryValue}, Match: ${factoryValue === 'factory-value'}\n`);
    
    // Test 9: Memoization with FileSystemCache
    console.log('⚡ Test 9: Function Memoization');
    
    const memoCache = new FileSystemCache<number>({
      cacheDir: '/tmp/memo-cache',
      verbose: true,
      logPrefix: '[MemoCache]',
      namespace: 'functions'
    });
    
    let expensiveCallCount = 0;
    
    // Simulate an expensive computation
    const expensiveComputation = async (x: number, y: number): Promise<number> => {
      expensiveCallCount++;
      console.log(`  🔄 Computing ${x} * ${y} + ${x} (call #${expensiveCallCount})`);
      
      // Simulate work with a delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return x * y + x;
    };
    
    // Memoize the function with filesystem cache
    const memoizedComputation = CacheUtils.memoize(
      expensiveComputation,
      memoCache as any,
      {
        ttl: 5000, // 5 seconds
        namespace: 'math'
      }
    );
    
    // First call - should execute the function
    console.log('  📞 First call: memoizedComputation(3, 4)');
    const result1 = await memoizedComputation(3, 4);
    console.log(`  ✅ Result: ${result1}, Call count: ${expensiveCallCount}`);
    
    // Second call with same args - should use cache
    console.log('  📞 Second call: memoizedComputation(3, 4)');
    const result2 = await memoizedComputation(3, 4);
    console.log(`  ✅ Result: ${result2}, Call count: ${expensiveCallCount}`);
    
    // Third call with different args - should execute the function
    console.log('  📞 Third call: memoizedComputation(5, 6)');
    const result3 = await memoizedComputation(5, 6);
    console.log(`  ✅ Result: ${result3}, Call count: ${expensiveCallCount}`);
    
    // Fourth call with first args again - should still use cache
    console.log('  📞 Fourth call: memoizedComputation(3, 4)');
    const result4 = await memoizedComputation(3, 4);
    console.log(`  ✅ Result: ${result4}, Call count: ${expensiveCallCount}`);
    
    console.log(`✅ Memoization test results:`);
    console.log(`  - Results: ${result1}, ${result2}, ${result3}, ${result4}`);
    console.log(`  - Expected call count: 2, Got: ${expensiveCallCount}`);
    console.log(`  - Cache hits: ${result1 === result2 && result2 === result4}`);
    
    // Test memoizer factory pattern
    console.log('  🏭 Testing memoizer factory...');
    const memoizer = CacheUtils.createMemoizer(memoCache, {
      namespace: 'factory-functions',
      ttl: 3000
    });
    
    let simpleCallCount = 0;
    const simpleFunction = async (n: number): Promise<string> => {
      simpleCallCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return `processed-${n}`;
    };
    
    const memoizedSimple = memoizer(simpleFunction);
    
    const simple1 = await memoizedSimple(42);
    const simple2 = await memoizedSimple(42); // Should be cached
    
    console.log(`  ✅ Factory memoizer results: ${simple1}, ${simple2}`);
    console.log(`  ✅ Simple function call count: ${simpleCallCount} (expected: 1)`);
    
    // Test persistence across cache instances (filesystem cache benefit)
    console.log('  💾 Testing cache persistence...');
    const newCacheInstance = new FileSystemCache<number>({
      cacheDir: '/tmp/memo-cache', // Same directory
      verbose: true,
      logPrefix: '[NewMemoCache]',
      namespace: 'functions'
    });
    
    const newMemoizedComputation = CacheUtils.memoize(
      expensiveComputation,
      newCacheInstance as any,
      {
        ttl: 5000,
        namespace: 'math'
      }
    );
    
    // This should use the cached result from the previous instance
    console.log('  📞 New instance call: memoizedComputation(3, 4)');
    const persistedResult = await newMemoizedComputation(3, 4);
    console.log(`  ✅ Persisted result: ${persistedResult}, Total call count: ${expensiveCallCount}`);
    console.log(`  ✅ Cache persisted across instances: ${expensiveCallCount === 2}\n`);
    
    console.log('🎉 All FileSystemCache tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Export the test function for easy access
export { testFileSystemCache as test };
