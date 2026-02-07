/**
 * RAI Storage — AppDataStore integration for the RAI app
 *
 * Provides a singleton AppDataStore instance scoped to app_id='rai',
 * bootstrap migration for backend mode, and legacy migration from old localStorage keys.
 */

import {
  AppDataStore,
  LocalStorageBackend,
  SurrealBackend,
  InsightsClient,
  SurrealQueryFn,
} from '../../../../src/lib/app_data_store';

// ─── Data key constants ──────────────────────────────────────────────

export const RAI_DATA_KEYS = {
  settings: 'settings',
  customTemplates: 'custom_templates',
  testRuns: 'test_runs',
  dotPhrases: 'dot_phrases',
} as const;

// Legacy localStorage keys (pre-AppDataStore)
const LEGACY_KEYS: Record<string, string> = {
  rai_settings: RAI_DATA_KEYS.settings,
  rai_custom_templates: RAI_DATA_KEYS.customTemplates,
  rai_test_runs: RAI_DATA_KEYS.testRuns,
  rai_dot_phrases: RAI_DATA_KEYS.dotPhrases,
};

const LEGACY_MIGRATED_FLAG = 'appdata::rai::__legacy_migrated__';

// ─── Singleton ───────────────────────────────────────────────────────

const RAI_APP_ID = 'rai';

let _instance: AppDataStore | null = null;

// ─── Bootstrap migration ─────────────────────────────────────────────

/**
 * One-time: detect existing cloud users who have storageMode:'cloud' in
 * localStorage settings but no __backend_mode__ flag yet, and set the flag
 * so AppDataStore initializes the correct backend on construction.
 *
 * Returns what it found so callers can log the result.
 */
function bootstrapBackendModeFlag(): { action: string; source?: string } {
  if (typeof window === 'undefined') return { action: 'ssr_skip' };
  const modeKey = `appdata::${RAI_APP_ID}::__backend_mode__`;
  if (localStorage.getItem(modeKey)) return { action: 'already_set' };

  // Check new-format settings
  try {
    const raw = localStorage.getItem(`appdata::${RAI_APP_ID}::${RAI_DATA_KEYS.settings}`);
    if (raw) {
      const record = JSON.parse(raw);
      if (record?.content?.storageMode === 'cloud') {
        localStorage.setItem(modeKey, 'cloud');
        return { action: 'set_cloud', source: 'new_format' };
      }
    }
  } catch {}

  // Check legacy-format settings
  try {
    const raw = localStorage.getItem('rai_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.storageMode === 'cloud') {
        localStorage.setItem(modeKey, 'cloud');
        return { action: 'set_cloud', source: 'legacy_format' };
      }
    }
  } catch {}

  return { action: 'none' };
}

// ─── Singleton accessor ──────────────────────────────────────────────

export function getRaiStore(insights?: InsightsClient, cloudQueryFn?: SurrealQueryFn): AppDataStore {
  if (!_instance) {
    const bootstrapResult = bootstrapBackendModeFlag();
    _instance = new AppDataStore({
      app_id: RAI_APP_ID,
      cloudQueryFn,
      insights: insights || null,
    });
    _instance.emitEvent('rai_store_init', {
      is_new_instance: true,
      bootstrap: bootstrapResult,
      resolved_mode: _instance.getMode(),
      has_cloud_query_fn: !!cloudQueryFn,
    });
  } else {
    if (insights) _instance.setInsights(insights);
    // If cloudQueryFn is provided but the instance fell back to local because
    // it was created before the query function was available, upgrade to cloud
    if (cloudQueryFn && _instance.getMode() === 'local') {
      const modeKey = `appdata::${RAI_APP_ID}::__backend_mode__`;
      const flaggedMode = typeof window !== 'undefined'
        ? localStorage.getItem(modeKey) : null;
      if (flaggedMode === 'cloud') {
        _instance.switchToCloud(cloudQueryFn);
        _instance.emitEvent('rai_store_init', {
          is_new_instance: false,
          cloud_upgraded: true,
          resolved_mode: _instance.getMode(),
        });
      }
    }
  }
  return _instance;
}

// ─── Legacy migration ────────────────────────────────────────────────

/**
 * One-time migration from old `rai_*` localStorage keys to
 * new `appdata::rai::*` format. Gated by a flag so it only runs once.
 * Old keys are preserved as backup.
 */
export function migrateLegacyLocalStorage(): { migrated: number; skipped: number } {
  if (typeof window === 'undefined') return { migrated: 0, skipped: 0 };

  // Check if already migrated
  if (localStorage.getItem(LEGACY_MIGRATED_FLAG)) {
    return { migrated: 0, skipped: 0 };
  }

  const backend = new LocalStorageBackend();
  let migrated = 0;
  let skipped = 0;

  for (const [oldKey, newDataKey] of Object.entries(LEGACY_KEYS)) {
    try {
      const raw = localStorage.getItem(oldKey);
      if (!raw) {
        skipped++;
        continue;
      }

      const content = JSON.parse(raw);
      // Fire-and-forget — localStorage backend is synchronous internally
      backend.save(RAI_APP_ID, newDataKey, content);
      migrated++;
    } catch {
      skipped++;
    }
  }

  // Set flag so we don't run again
  localStorage.setItem(LEGACY_MIGRATED_FLAG, new Date().toISOString());

  return { migrated, skipped };
}

/**
 * Migrate all local data to SurrealDB cloud backend.
 * Used when user switches from local -> cloud mode.
 */
export async function migrateLocalToCloud(queryFn: SurrealQueryFn): Promise<{ migrated: number; failed: number }> {
  const store = getRaiStore();
  const local = store.getLocalBackend();
  const surreal = new SurrealBackend(queryFn);

  const result = await store.migrate(local, surreal);
  return result.data || { migrated: 0, failed: 0 };
}
