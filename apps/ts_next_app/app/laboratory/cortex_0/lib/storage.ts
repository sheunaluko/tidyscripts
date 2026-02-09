/**
 * Cortex Storage — AppDataStore integration for the Cortex 0 app
 *
 * Provides a singleton AppDataStore instance scoped to app_id='cortex_0',
 * bootstrap migration for backend mode, and legacy migration from old localStorage keys.
 */

import {
  AppDataStore,
  LocalStorageBackend,
  SurrealBackend,
  InsightsClient,
  SurrealQueryFn,
} from '../../../../src/lib/app_data_store';
import { isFirebaseAuthenticated } from './authCheck';

// ─── Data key constants ──────────────────────────────────────────────

export const CORTEX_DATA_KEYS = {
  settings: 'settings',           // { aiModel, speechCooldownMs, soundFeedback }
  conversations: 'conversations', // { chat_history, workspace }
  widgetLayout: 'widget_layout',  // { widgets, layout }
  sessions: 'sessions',           // saved full session snapshots (array with id fields)
} as const;

// Legacy localStorage keys (pre-AppDataStore)
const LEGACY_KEYS: Record<string, string> = {
  cortex_widget_config: CORTEX_DATA_KEYS.widgetLayout,
};

const LEGACY_MIGRATED_FLAG = 'appdata::cortex_0::__legacy_migrated__';

// ─── Singleton ───────────────────────────────────────────────────────

const CORTEX_APP_ID = 'cortex_0';

let _instance: AppDataStore | null = null;

// ─── Bootstrap migration ─────────────────────────────────────────────

/**
 * One-time: detect existing users and set the __backend_mode__ flag.
 * New users default to cloud (same as RAI) to encourage login.
 */
function bootstrapBackendModeFlag(): { action: string; source?: string } {
  if (typeof window === 'undefined') return { action: 'ssr_skip' };
  const modeKey = `appdata::${CORTEX_APP_ID}::__backend_mode__`;
  if (localStorage.getItem(modeKey)) return { action: 'already_set' };

  // Check new-format settings
  try {
    const raw = localStorage.getItem(`appdata::${CORTEX_APP_ID}::${CORTEX_DATA_KEYS.settings}`);
    if (raw) {
      const record = JSON.parse(raw);
      if (record?.content?.storageMode === 'cloud') {
        localStorage.setItem(modeKey, 'cloud');
        return { action: 'set_cloud', source: 'new_format' };
      }
    }
  } catch {}

  // Check if user has existing widget config (existing Cortex user)
  try {
    const raw = localStorage.getItem('cortex_widget_config');
    if (raw) {
      // Existing user — default to cloud
      localStorage.setItem(modeKey, 'cloud');
      return { action: 'set_cloud', source: 'legacy_widget_config' };
    }
  } catch {}

  // New user — default to cloud so the auth check prompts them to log in
  localStorage.setItem(modeKey, 'cloud');
  return { action: 'set_cloud', source: 'default' };
}

// ─── Singleton accessor ──────────────────────────────────────────────

export function getCortexStore(insights?: InsightsClient, cloudQueryFn?: SurrealQueryFn): AppDataStore {
  if (!_instance) {
    const bootstrapResult = bootstrapBackendModeFlag();
    _instance = new AppDataStore({
      app_id: CORTEX_APP_ID,
      cloudQueryFn,
      insights: insights || null,
    });
    _instance.emitEvent('cortex_store_init', {
      is_new_instance: true,
      bootstrap: bootstrapResult,
      resolved_mode: _instance.getMode(),
      has_cloud_query_fn: !!cloudQueryFn,
      is_authenticated: isFirebaseAuthenticated(),
    });
  } else {
    if (insights) _instance.setInsights(insights);
    // If cloudQueryFn is provided but the instance fell back to local because
    // it was created before the query function was available, upgrade to cloud
    if (cloudQueryFn && _instance.getMode() === 'local') {
      const modeKey = `appdata::${CORTEX_APP_ID}::__backend_mode__`;
      const flaggedMode = typeof window !== 'undefined'
        ? localStorage.getItem(modeKey) : null;
      if (flaggedMode === 'cloud') {
        _instance.switchToCloud(cloudQueryFn);
        _instance.emitEvent('cortex_store_init', {
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
 * One-time migration from old `cortex_widget_config` localStorage keys to
 * new `appdata::cortex_0::*` format. Gated by a flag so it only runs once.
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
      backend.save(CORTEX_APP_ID, newDataKey, content);
      migrated++;
    } catch {
      skipped++;
    }
  }

  // Also migrate any cortex_widget_layout key
  try {
    const layoutRaw = localStorage.getItem('cortex_widget_layout');
    if (layoutRaw) {
      const existing = localStorage.getItem(`appdata::${CORTEX_APP_ID}::${CORTEX_DATA_KEYS.widgetLayout}`);
      if (!existing) {
        const content = JSON.parse(layoutRaw);
        backend.save(CORTEX_APP_ID, CORTEX_DATA_KEYS.widgetLayout, content);
        migrated++;
      }
    }
  } catch {
    skipped++;
  }

  // Set flag so we don't run again
  localStorage.setItem(LEGACY_MIGRATED_FLAG, new Date().toISOString());

  return { migrated, skipped };
}

// ─── Local-to-cloud migration ────────────────────────────────────────

// Keys whose values are arrays of items with `id` fields — these get
// merged (local-only items added to cloud) rather than skipped entirely.
const ARRAY_MERGE_KEYS: Set<string> = new Set([
  CORTEX_DATA_KEYS.sessions,
]);

/**
 * Migrate local data to SurrealDB cloud backend (non-destructive).
 *
 * - Object keys (e.g. settings): cloud wins — skip if cloud has data
 * - Array keys (e.g. sessions): merge by `id` — local-only items
 *   are added to cloud, existing cloud items are untouched
 */
export async function migrateLocalToCloud(queryFn: SurrealQueryFn): Promise<{ migrated: number; merged: number; skipped: number; failed: number }> {
  const store = getCortexStore();
  const local = store.getLocalBackend();
  const surreal = new SurrealBackend(queryFn);
  const appId = CORTEX_APP_ID;

  const listResult = await local.list(appId);
  if (!listResult.ok || !listResult.data) {
    return { migrated: 0, merged: 0, skipped: 0, failed: 0 };
  }

  let migrated = 0;
  let merged = 0;
  let skipped = 0;
  let failed = 0;

  for (const key of listResult.data) {
    const localResult = await local.load(appId, key);
    if (!localResult.ok || !localResult.data) {
      failed++;
      continue;
    }

    // Check if cloud already has data for this key
    const cloudResult = await surreal.load(appId, key);
    if (cloudResult.ok && cloudResult.data) {
      // Cloud has data — try to merge if this is an array key
      if (ARRAY_MERGE_KEYS.has(key)) {
        const cloudArr = Array.isArray(cloudResult.data.content) ? cloudResult.data.content : [];
        const localArr = Array.isArray(localResult.data.content) ? localResult.data.content : [];
        const cloudIds = new Set(cloudArr.map((item: any) => item?.id).filter(Boolean));

        // Find items in local that don't exist in cloud
        const newItems = localArr.filter((item: any) => item?.id && !cloudIds.has(item.id));

        if (newItems.length > 0) {
          const mergedArr = [...cloudArr, ...newItems];
          const saveResult = await surreal.save(appId, key, mergedArr, localResult.data.metadata);
          if (saveResult.ok) {
            merged += newItems.length;
          } else {
            failed++;
          }
        } else {
          skipped++;
        }
      } else {
        // Object key — cloud wins, skip
        skipped++;
      }
      continue;
    }

    // Cloud is empty for this key — migrate from local
    const saveResult = await surreal.save(appId, key, localResult.data.content, localResult.data.metadata);
    if (saveResult.ok) {
      migrated++;
    } else {
      failed++;
    }
  }

  store.emitEvent('appdata_migrate_to_cloud', {
    migrated,
    merged,
    skipped,
    failed,
    total_local_keys: listResult.data.length,
  });

  return { migrated, merged, skipped, failed };
}
