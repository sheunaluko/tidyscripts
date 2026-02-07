/**
 * AppDataStore — Reusable storage abstraction module
 *
 * Provides a uniform async interface for persisting app data
 * to either localStorage or SurrealDB (via injected query function).
 * Built-in insights telemetry for every operation.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface AppDataRecord<T = any> {
  app_id: string;
  data_key: string;
  content: T;
  metadata?: Record<string, any>;
  created_at?: string; // ISO 8601
  updated_at?: string;
}

export interface AppDataResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface StorageBackend {
  save<T>(app_id: string, data_key: string, content: T, metadata?: Record<string, any>): Promise<AppDataResult<void>>;
  load<T>(app_id: string, data_key: string): Promise<AppDataResult<AppDataRecord<T>>>;
  remove(app_id: string, data_key: string): Promise<AppDataResult<void>>;
  list(app_id: string): Promise<AppDataResult<string[]>>;
}

export type SurrealQueryFn = (args: { query: string; variables?: Record<string, any> }) => Promise<any>;

export type BackendMode = 'local' | 'cloud';

export type InsightsClient = {
  addEvent: (type: string, payload: Record<string, any>) => void;
} | null;

// ─── LocalStorageBackend ─────────────────────────────────────────────

function lsKey(app_id: string, data_key: string): string {
  return `appdata::${app_id}::${data_key}`;
}

const KEYS_REGISTRY = '__keys__';

export class LocalStorageBackend implements StorageBackend {
  private getKeySet(app_id: string): Set<string> {
    try {
      const raw = localStorage.getItem(lsKey(app_id, KEYS_REGISTRY));
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private saveKeySet(app_id: string, keys: Set<string>): void {
    localStorage.setItem(lsKey(app_id, KEYS_REGISTRY), JSON.stringify([...keys]));
  }

  async save<T>(app_id: string, data_key: string, content: T, metadata?: Record<string, any>): Promise<AppDataResult<void>> {
    try {
      const key = lsKey(app_id, data_key);
      const now = new Date().toISOString();

      // Preserve created_at from existing record
      let created_at = now;
      try {
        const existing = localStorage.getItem(key);
        if (existing) {
          const parsed = JSON.parse(existing) as AppDataRecord;
          if (parsed.created_at) created_at = parsed.created_at;
        }
      } catch { /* no existing record */ }

      const record: AppDataRecord<T> = {
        app_id,
        data_key,
        content,
        metadata,
        created_at,
        updated_at: now,
      };

      localStorage.setItem(key, JSON.stringify(record));

      // Update key registry
      const keys = this.getKeySet(app_id);
      keys.add(data_key);
      this.saveKeySet(app_id, keys);

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'localStorage save failed' };
    }
  }

  async load<T>(app_id: string, data_key: string): Promise<AppDataResult<AppDataRecord<T>>> {
    try {
      const raw = localStorage.getItem(lsKey(app_id, data_key));
      if (!raw) return { ok: true, data: undefined };

      const record = JSON.parse(raw) as AppDataRecord<T>;
      return { ok: true, data: record };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'localStorage load failed' };
    }
  }

  async remove(app_id: string, data_key: string): Promise<AppDataResult<void>> {
    try {
      localStorage.removeItem(lsKey(app_id, data_key));

      // Update key registry
      const keys = this.getKeySet(app_id);
      keys.delete(data_key);
      this.saveKeySet(app_id, keys);

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'localStorage remove failed' };
    }
  }

  async list(app_id: string): Promise<AppDataResult<string[]>> {
    try {
      const keys = this.getKeySet(app_id);
      return { ok: true, data: [...keys] };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'localStorage list failed' };
    }
  }
}

// ─── SurrealBackend ──────────────────────────────────────────────────

function sanitizeRid(app_id: string, data_key: string): string {
  return `${app_id}_${data_key}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

export class SurrealBackend implements StorageBackend {
  private queryFn: SurrealQueryFn;

  constructor(queryFn: SurrealQueryFn) {
    this.queryFn = queryFn;
  }

  private extractResult(response: any): any {
    // Response shape: response.data.result.result → [{ result: [...rows], status, time }]
    // We need the actual rows from the first query result
    const queryResults = response?.data?.result?.result;
    if (Array.isArray(queryResults) && queryResults.length > 0 && queryResults[0]?.result) {
      return queryResults[0].result;
    }
    return queryResults;
  }

  async save<T>(app_id: string, data_key: string, content: T, metadata?: Record<string, any>): Promise<AppDataResult<void>> {
    try {
      const rid = sanitizeRid(app_id, data_key);
      const contentStr = JSON.stringify(content);
      const metadataStr = metadata ? JSON.stringify(metadata) : null;

      await this.queryFn({
        query: `UPSERT type::thing('app_data', $rid) SET app_id=$app_id, data_key=$data_key, content=$content, metadata=$metadata, updated_at=time::now()`,
        variables: {
          rid,
          app_id,
          data_key,
          content: contentStr,
          metadata: metadataStr,
        },
      });

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'SurrealDB save failed' };
    }
  }

  async load<T>(app_id: string, data_key: string): Promise<AppDataResult<AppDataRecord<T>>> {
    try {
      const response = await this.queryFn({
        query: `SELECT * FROM app_data WHERE app_id=$app_id AND data_key=$data_key LIMIT 1`,
        variables: { app_id, data_key },
      });

      const result = this.extractResult(response);
      if (!result || (Array.isArray(result) && result.length === 0)) {
        return { ok: true, data: undefined };
      }

      const row = Array.isArray(result) ? result[0] : result;
      const record: AppDataRecord<T> = {
        app_id: row.app_id,
        data_key: row.data_key,
        content: JSON.parse(row.content),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      return { ok: true, data: record };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'SurrealDB load failed' };
    }
  }

  async remove(app_id: string, data_key: string): Promise<AppDataResult<void>> {
    try {
      await this.queryFn({
        query: `DELETE FROM app_data WHERE app_id=$app_id AND data_key=$data_key`,
        variables: { app_id, data_key },
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'SurrealDB remove failed' };
    }
  }

  async list(app_id: string): Promise<AppDataResult<string[]>> {
    try {
      const response = await this.queryFn({
        query: `SELECT data_key FROM app_data WHERE app_id=$app_id`,
        variables: { app_id },
      });

      const result = this.extractResult(response);
      if (!result || (Array.isArray(result) && result.length === 0)) {
        return { ok: true, data: [] };
      }

      const keys = (Array.isArray(result) ? result : [result]).map((r: any) => r.data_key);
      return { ok: true, data: keys };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'SurrealDB list failed' };
    }
  }
}

// ─── AppDataStore Facade ─────────────────────────────────────────────

export interface AppDataStoreOptions {
  app_id: string;
  backend?: StorageBackend;        // Optional — if provided, used as-is (backward compat for tests)
  cloudQueryFn?: SurrealQueryFn;   // If provided and mode is 'cloud', use SurrealBackend
  insights?: InsightsClient;
}

export class AppDataStore {
  private app_id: string;
  private backend: StorageBackend;
  private insights: InsightsClient;
  private localBackend: LocalStorageBackend;
  private surrealBackend: SurrealBackend | null;
  private mode: BackendMode;

  constructor(options: AppDataStoreOptions) {
    this.app_id = options.app_id;
    this.insights = options.insights || null;
    this.localBackend = new LocalStorageBackend();
    this.surrealBackend = options.cloudQueryFn ? new SurrealBackend(options.cloudQueryFn) : null;

    if (options.backend) {
      // Explicit backend — backward compat for tests
      this.backend = options.backend;
      this.mode = 'local';
    } else {
      const flagMode = this.readModeFlag();
      this.mode = flagMode;
      if (this.mode === 'cloud' && this.surrealBackend) {
        this.backend = this.surrealBackend;
      } else {
        this.backend = this.localBackend;
        if (this.mode === 'cloud' && !this.surrealBackend) this.mode = 'local';
      }
      this.addInsightEvent('appdata_init', {
        flag_mode: flagMode,
        resolved_mode: this.mode,
        has_cloud_query_fn: !!options.cloudQueryFn,
        backend_type: this.mode === 'cloud' ? 'surreal' : 'local',
      });
    }
  }

  private static backendModeKey(app_id: string): string {
    return `appdata::${app_id}::__backend_mode__`;
  }

  private readModeFlag(): BackendMode {
    if (typeof window === 'undefined') return 'local';
    try {
      const val = localStorage.getItem(AppDataStore.backendModeKey(this.app_id));
      return val === 'cloud' ? 'cloud' : 'local';
    } catch { return 'local'; }
  }

  private writeModeFlag(mode: BackendMode): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(AppDataStore.backendModeKey(this.app_id), mode); } catch {}
  }

  private addInsightEvent(type: string, payload: Record<string, any>) {
    try {
      this.insights?.addEvent(type, { app_id: this.app_id, ...payload });
    } catch { /* insights should never break operations */ }
  }

  getMode(): BackendMode { return this.mode; }

  getLocalBackend(): LocalStorageBackend { return this.localBackend; }

  switchToCloud(queryFn: SurrealQueryFn): void {
    const prev = this.mode;
    if (!this.surrealBackend) this.surrealBackend = new SurrealBackend(queryFn);
    this.backend = this.surrealBackend;
    this.mode = 'cloud';
    this.writeModeFlag('cloud');
    this.addInsightEvent('appdata_mode_switch', { from: prev, to: 'cloud' });
  }

  switchToLocal(): void {
    const prev = this.mode;
    this.backend = this.localBackend;
    this.mode = 'local';
    this.writeModeFlag('local');
    this.addInsightEvent('appdata_mode_switch', { from: prev, to: 'local' });
  }

  /** Low-level backend override. Does NOT update the persisted mode flag. */
  setBackend(backend: StorageBackend) {
    this.backend = backend;
  }

  setInsights(insights: InsightsClient) {
    this.insights = insights;
  }

  /** Emit a custom event through the store's InsightsClient (auto-tagged with app_id) */
  emitEvent(type: string, payload: Record<string, any>): void {
    this.addInsightEvent(type, payload);
  }

  /** Convenience get — returns content or null */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    const result = await this.backend.load<T>(this.app_id, key);
    const duration_ms = Date.now() - start;
    const content = result.ok && result.data ? result.data.content : null;
    this.addInsightEvent('appdata_load', { data_key: key, ok: result.ok, duration_ms, mode: this.mode, content });

    if (result.ok && result.data) {
      return result.data.content;
    }
    return null;
  }

  /** Convenience set — returns true on success */
  async set<T>(key: string, content: T, metadata?: Record<string, any>): Promise<boolean> {
    const start = Date.now();
    const result = await this.backend.save<T>(this.app_id, key, content, metadata);
    const duration_ms = Date.now() - start;
    this.addInsightEvent('appdata_save', { data_key: key, ok: result.ok, duration_ms, mode: this.mode, content });

    return result.ok;
  }

  /** Remove a key */
  async remove(key: string): Promise<boolean> {
    const start = Date.now();
    const result = await this.backend.remove(this.app_id, key);
    const duration_ms = Date.now() - start;
    this.addInsightEvent('appdata_remove', { data_key: key, ok: result.ok, duration_ms, mode: this.mode });

    return result.ok;
  }

  /** List all keys for this app */
  async list(): Promise<string[]> {
    const start = Date.now();
    const result = await this.backend.list(this.app_id);
    const duration_ms = Date.now() - start;
    this.addInsightEvent('appdata_list', { ok: result.ok, duration_ms, mode: this.mode, keys: result.data || [] });

    return result.data || [];
  }

  /** Full result access (includes metadata, timestamps) */
  async loadFull<T>(key: string): Promise<AppDataResult<AppDataRecord<T>>> {
    const start = Date.now();
    const result = await this.backend.load<T>(this.app_id, key);
    const duration_ms = Date.now() - start;
    this.addInsightEvent('appdata_load', { data_key: key, ok: result.ok, duration_ms, mode: this.mode, full: true, content: result.ok && result.data ? result.data.content : null });

    return result;
  }

  /** Full save with result */
  async saveFull<T>(key: string, content: T, metadata?: Record<string, any>): Promise<AppDataResult<void>> {
    const start = Date.now();
    const result = await this.backend.save<T>(this.app_id, key, content, metadata);
    const duration_ms = Date.now() - start;
    this.addInsightEvent('appdata_save', { data_key: key, ok: result.ok, duration_ms, mode: this.mode, full: true, content });

    return result;
  }

  /** Migrate all data from source backend to destination backend */
  async migrate(source: StorageBackend, destination: StorageBackend): Promise<AppDataResult<{ migrated: number; failed: number }>> {
    const start = Date.now();
    const listResult = await source.list(this.app_id);
    if (!listResult.ok || !listResult.data) {
      return { ok: false, error: listResult.error || 'Failed to list keys from source' };
    }

    let migrated = 0;
    let failed = 0;

    for (const key of listResult.data) {
      const loadResult = await source.load(this.app_id, key);
      if (!loadResult.ok || !loadResult.data) {
        failed++;
        continue;
      }

      const saveResult = await destination.save(
        this.app_id,
        key,
        loadResult.data.content,
        loadResult.data.metadata,
      );

      if (saveResult.ok) {
        migrated++;
      } else {
        failed++;
      }
    }

    const duration_ms = Date.now() - start;
    this.addInsightEvent('appdata_migrate', { ok: failed === 0, migrated, failed, duration_ms, mode: this.mode });

    return {
      ok: failed === 0,
      data: { migrated, failed },
      error: failed > 0 ? `${failed} key(s) failed to migrate` : undefined,
    };
  }
}
