/**
 * ReflectionsClient Phase 1 Tests
 *
 * Basic tests for query functionality and caching
 */

import { createClient, ReflectionsClient } from './reflections';

describe('ReflectionsClient - Phase 1', () => {
  let client: ReflectionsClient;

  beforeEach(() => {
    // Create fresh client for each test
    client = createClient({ enable_cache: false });
  });

  describe('Initialization', () => {
    it('should create client with default config', () => {
      const client = createClient();
      const config = client.getConfig();

      expect(config.endpoint).toBe('/api/insights/query');
      expect(config.enable_cache).toBe(true);
      expect(config.cache_ttl_ms).toBe(60000);
      expect(config.cache_namespace).toBe('reflections');
      expect(config.silent_failure).toBe(false);
      expect(config.verbose).toBe(false);
    });

    it('should create client with custom config', () => {
      const client = createClient({
        endpoint: '/custom/endpoint',
        enable_cache: false,
        cache_ttl_ms: 120000,
        verbose: true,
        silent_failure: true
      });

      const config = client.getConfig();
      expect(config.endpoint).toBe('/custom/endpoint');
      expect(config.enable_cache).toBe(false);
      expect(config.cache_ttl_ms).toBe(120000);
      expect(config.verbose).toBe(true);
      expect(config.silent_failure).toBe(true);
    });

    it('should report cache as disabled when cache is off', () => {
      const client = createClient({ enable_cache: false });
      const stats = client.getCacheStats();

      expect(stats.enabled).toBe(false);
    });

    it('should report cache stats when cache is enabled', () => {
      const client = createClient({ enable_cache: true });
      const stats = client.getCacheStats();

      expect(stats.enabled).toBe(true);
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });

  describe('Enable/Disable', () => {
    it('should disable client', () => {
      client.setEnabled(false);
      // When disabled, should return empty results
      // (actual test would need mock fetch)
    });

    it('should enable client', () => {
      client.setEnabled(false);
      client.setEnabled(true);
      // Should work normally again
    });
  });

  describe('Cache Management', () => {
    it('should invalidate all cache', async () => {
      const client = createClient({ enable_cache: true });
      await client.invalidateCache();
      // Cache should be cleared
    });

    it('should invalidate cache by pattern', async () => {
      const client = createClient({ enable_cache: true });
      await client.invalidateCache('ses_abc');
      // Only keys containing 'ses_abc' should be cleared
    });
  });

  describe('Convenience Methods', () => {
    it('getEventsBySession should call queryEvents with session_id filter', async () => {
      // This would need a mock/spy in actual test
      const session_id = 'ses_test123';
      // await client.getEventsBySession(session_id);
      // expect queryEvents to be called with { session_id, sort_by: 'timestamp', sort_order: 'asc' }
    });

    it('getEventsByTrace should call queryEvents with trace_id filter', async () => {
      // This would need a mock/spy in actual test
      const trace_id = 'trc_test123';
      // await client.getEventsByTrace(trace_id);
      // expect queryEvents to be called with { trace_id, sort_by: 'timestamp', sort_order: 'asc' }
    });

    it('getEventsByType should call queryEvents with event_type filter', async () => {
      // This would need a mock/spy in actual test
      const event_type = 'llm_invocation';
      // await client.getEventsByType(event_type);
      // expect queryEvents to be called with { event_type }
    });
  });

  describe('Phase 3 & 4 Methods (Stubs)', () => {
    it('analyzeSession should throw not implemented error', async () => {
      await expect(client.analyzeSession('ses_test')).rejects.toThrow('not yet implemented');
    });

    it('analyzeTrace should throw not implemented error', async () => {
      await expect(client.analyzeTrace('trc_test')).rejects.toThrow('not yet implemented');
    });

    it('analyzeLLMUsage should throw not implemented error', async () => {
      const timeRange = { start: Date.now() - 86400000, end: Date.now() };
      await expect(client.analyzeLLMUsage(timeRange)).rejects.toThrow('not yet implemented');
    });

    it('analyzePerformance should throw not implemented error', async () => {
      const timeRange = { start: Date.now() - 86400000, end: Date.now() };
      await expect(client.analyzePerformance(timeRange)).rejects.toThrow('not yet implemented');
    });

    it('analyzeErrors should throw not implemented error', async () => {
      const timeRange = { start: Date.now() - 86400000, end: Date.now() };
      await expect(client.analyzeErrors(timeRange)).rejects.toThrow('not yet implemented');
    });
  });
});
