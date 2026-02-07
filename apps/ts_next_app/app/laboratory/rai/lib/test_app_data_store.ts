'use client';

/**
 * Test suite for app_data_store.ts
 * Run from browser console: await window.test_app_data_store()
 * Cleanup: await window.clear_app_data_store_test()
 */

import {
  AppDataStore,
  LocalStorageBackend,
  SurrealBackend,
  InsightsClient,
  SurrealQueryFn,
  AppDataRecord,
} from '../../../../src/lib/app_data_store';

import { migrateLegacyLocalStorage } from './storage';
import * as fbu from '../../../../src/firebase_utils';

// ─── Constants ───────────────────────────────────────────────────────

const TEST_APP_ID = '__test__';

// ─── Types ───────────────────────────────────────────────────────────

type TestResult = {
  name: string;
  passed: boolean;
  details: string;
  duration_ms: number;
  error?: string;
};

// ─── Mock Helpers ────────────────────────────────────────────────────

class MockInsightsClient {
  events: { type: string; payload: Record<string, any> }[] = [];

  addEvent(type: string, payload: Record<string, any>) {
    this.events.push({ type, payload });
  }
}

function createMockSurrealQueryFn(options?: { shouldThrow?: boolean }) {
  const store = new Map<string, any>();
  const queries: string[] = [];

  const queryFn: SurrealQueryFn = async (args) => {
    queries.push(args.query);

    if (options?.shouldThrow) {
      throw new Error('db_connection_lost');
    }

    const q = args.query;
    const vars = args.variables || {};

    // Helper: wrap rows in the real SurrealDB response shape
    // Real shape: { data: { result: { result: [{ result: [...rows], status: "OK", time: "..." }] } } }
    const wrapResponse = (rows: any[]) => ({
      data: { result: { result: [{ result: rows, status: 'OK', time: '0µs' }] } },
    });

    // UPSERT
    if (q.includes('UPSERT')) {
      const key = `${vars.app_id}::${vars.data_key}`;
      store.set(key, {
        app_id: vars.app_id,
        data_key: vars.data_key,
        content: vars.content,
        metadata: vars.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return wrapResponse([store.get(key)]);
    }

    // SELECT * (load)
    if (q.includes('SELECT *')) {
      const key = `${vars.app_id}::${vars.data_key}`;
      const row = store.get(key);
      return wrapResponse(row ? [row] : []);
    }

    // DELETE
    if (q.includes('DELETE')) {
      const key = `${vars.app_id}::${vars.data_key}`;
      store.delete(key);
      return wrapResponse([]);
    }

    // SELECT data_key (list)
    if (q.includes('SELECT data_key')) {
      const rows: { data_key: string }[] = [];
      for (const [k, v] of store.entries()) {
        if (k.startsWith(`${vars.app_id}::`)) {
          rows.push({ data_key: v.data_key });
        }
      }
      return wrapResponse(rows);
    }

    return wrapResponse([]);
  };

  return { queryFn, queries, store };
}

// ─── Test Runner Helper ──────────────────────────────────────────────

async function runTest(
  name: string,
  fn: () => Promise<string | { details: string; diagnostics: Record<string, any> }>,
  results: TestResult[],
  output_lines: string[],
  insightsClient: any | null,
): Promise<void> {
  const start = Date.now();
  try {
    const raw = await fn();
    const duration_ms = Date.now() - start;
    const details = typeof raw === 'string' ? raw : raw.details;
    const diagnostics = typeof raw === 'string' ? undefined : raw.diagnostics;
    results.push({ name, passed: true, details, duration_ms });
    output_lines.push(`[PASS] ${name} (${duration_ms}ms)`);
    output_lines.push(`  ${details}`);

    if (insightsClient) {
      try {
        insightsClient.addInChain('appdata_test', { test_name: name, passed: true, duration_ms, details, ...(diagnostics ? { diagnostics } : {}) });
      } catch { /* insights optional */ }
    }
  } catch (e: any) {
    const duration_ms = Date.now() - start;
    const error = e?.message || String(e);
    results.push({ name, passed: false, details: '', duration_ms, error });
    output_lines.push(`[FAIL] ${name} (${duration_ms}ms)`);
    output_lines.push(`  Error: ${error}`);

    if (insightsClient) {
      try {
        insightsClient.addInChain('appdata_test', { test_name: name, passed: false, duration_ms, error });
      } catch { /* insights optional */ }
    }
  }
  output_lines.push('');
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ─── Cleanup ─────────────────────────────────────────────────────────

function cleanup_test_keys(): number {
  let removed = 0;

  // 1. Remove all localStorage keys starting with appdata::__test__
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('appdata::__test__') || key.startsWith('appdata::__test___empty'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => { localStorage.removeItem(k); removed++; });

  // 2. Remove legacy test keys
  const legacyKeys = ['rai_settings', 'rai_custom_templates', 'rai_test_runs', 'rai_dot_phrases'];
  legacyKeys.forEach(k => {
    if (localStorage.getItem(k) !== null) {
      localStorage.removeItem(k);
      removed++;
    }
  });

  // 3. Remove legacy migration flag
  if (localStorage.getItem('appdata::rai::__legacy_migrated__') !== null) {
    localStorage.removeItem('appdata::rai::__legacy_migrated__');
    removed++;
  }

  // 4. Remove migration-created keys
  const migrationKeys = ['appdata::rai::settings', 'appdata::rai::__keys__'];
  migrationKeys.forEach(k => {
    if (localStorage.getItem(k) !== null) {
      localStorage.removeItem(k);
      removed++;
    }
  });

  return removed;
}

// ─── Main Test Suite ─────────────────────────────────────────────────

async function run_tests(): Promise<string> {
  const results: TestResult[] = [];
  const output_lines: string[] = [];
  const suiteStart = Date.now();

  // Insights integration
  const insightsClient = typeof window !== 'undefined' ? (window as any).raiInsights : null;
  if (insightsClient) {
    try {
      await insightsClient.startChain('appdata_test_suite', { test_count: 34 });
    } catch { /* insights optional */ }
  }

  output_lines.push('='.repeat(60));
  output_lines.push('APP DATA STORE TEST SUITE');
  output_lines.push('='.repeat(60));
  output_lines.push('');

  // Pre-clean
  cleanup_test_keys();

  const backend = new LocalStorageBackend();

  // ─── A. LocalStorageBackend Unit Tests ───────────────────────────

  output_lines.push('--- A. LocalStorageBackend Unit Tests ---');
  output_lines.push('');

  // A1: ls_save_load_string
  await runTest('A1_ls_save_load_string', async () => {
    await backend.save(TEST_APP_ID, 'str_key', 'hello world');
    const result = await backend.load<string>(TEST_APP_ID, 'str_key');
    assert(result.ok === true, 'result.ok should be true');
    assert(result.data !== undefined, 'data should exist');
    assert(result.data!.content === 'hello world', `content mismatch: ${result.data!.content}`);
    assert(result.data!.app_id === TEST_APP_ID, 'app_id mismatch');
    assert(result.data!.data_key === 'str_key', 'data_key mismatch');
    return 'String save/load roundtrip OK';
  }, results, output_lines, insightsClient);

  // A2: ls_save_load_complex_object
  await runTest('A2_ls_save_load_complex_object', async () => {
    const complex = {
      name: 'test',
      nested: { a: [1, 2, 3], b: null, c: { d: 'deep' } },
      arr: [{ x: 1 }, { y: 2 }],
      dateStr: '2025-01-15T00:00:00Z',
    };
    await backend.save(TEST_APP_ID, 'complex_key', complex);
    const result = await backend.load(TEST_APP_ID, 'complex_key');
    assert(result.ok === true, 'load ok');
    const c = result.data!.content as any;
    assert(c.name === 'test', 'name mismatch');
    assert(c.nested.a.length === 3, 'nested array length mismatch');
    assert(c.nested.b === null, 'null not preserved');
    assert(c.nested.c.d === 'deep', 'deep nesting mismatch');
    assert(c.arr[1].y === 2, 'array of objects mismatch');
    assert(c.dateStr === '2025-01-15T00:00:00Z', 'date string mismatch');
    return 'Complex object roundtrip OK';
  }, results, output_lines, insightsClient);

  // A3: ls_preserves_created_at
  await runTest('A3_ls_preserves_created_at', async () => {
    await backend.save(TEST_APP_ID, 'ts_key', 'v1');
    const first = await backend.load(TEST_APP_ID, 'ts_key');
    const createdAt1 = first.data!.created_at;
    const updatedAt1 = first.data!.updated_at;

    await new Promise(r => setTimeout(r, 50));

    await backend.save(TEST_APP_ID, 'ts_key', 'v2');
    const second = await backend.load(TEST_APP_ID, 'ts_key');
    const createdAt2 = second.data!.created_at;
    const updatedAt2 = second.data!.updated_at;

    assert(createdAt1 === createdAt2, `created_at changed: ${createdAt1} -> ${createdAt2}`);
    assert(updatedAt1 !== updatedAt2, 'updated_at should change');
    assert(second.data!.content === 'v2', 'content should update');
    return `created_at preserved (${createdAt1}), updated_at changed`;
  }, results, output_lines, insightsClient);

  // A4: ls_load_nonexistent
  await runTest('A4_ls_load_nonexistent', async () => {
    const result = await backend.load(TEST_APP_ID, 'nonexistent_key_xyz');
    assert(result.ok === true, 'ok should be true');
    assert(result.data === undefined, `data should be undefined, got: ${JSON.stringify(result.data)}`);
    return 'Nonexistent key returns { ok: true, data: undefined }';
  }, results, output_lines, insightsClient);

  // A5: ls_remove
  await runTest('A5_ls_remove', async () => {
    await backend.save(TEST_APP_ID, 'remove_key', 'to_be_removed');
    const before = await backend.load(TEST_APP_ID, 'remove_key');
    assert(before.data !== undefined, 'should exist before remove');

    const removeResult = await backend.remove(TEST_APP_ID, 'remove_key');
    assert(removeResult.ok === true, 'remove should succeed');

    const after = await backend.load(TEST_APP_ID, 'remove_key');
    assert(after.data === undefined, 'should be undefined after remove');
    return 'Save -> remove -> load returns undefined';
  }, results, output_lines, insightsClient);

  // A6: ls_list_multiple
  await runTest('A6_ls_list_multiple', async () => {
    await backend.save(TEST_APP_ID, 'list_a', 1);
    await backend.save(TEST_APP_ID, 'list_b', 2);
    await backend.save(TEST_APP_ID, 'list_c', 3);
    const result = await backend.list(TEST_APP_ID);
    assert(result.ok === true, 'list ok');
    const keys = new Set(result.data!);
    assert(keys.has('list_a'), 'missing list_a');
    assert(keys.has('list_b'), 'missing list_b');
    assert(keys.has('list_c'), 'missing list_c');
    return `Listed ${result.data!.length} keys including list_a, list_b, list_c`;
  }, results, output_lines, insightsClient);

  // A7: ls_list_empty
  await runTest('A7_ls_list_empty', async () => {
    const freshAppId = '__test___empty';
    const result = await backend.list(freshAppId);
    assert(result.ok === true, 'list ok');
    assert(Array.isArray(result.data), 'data should be array');
    assert(result.data!.length === 0, `expected empty, got ${result.data!.length}`);
    return 'Fresh app_id lists 0 keys';
  }, results, output_lines, insightsClient);

  // A8: ls_key_registry_integrity
  await runTest('A8_ls_key_registry_integrity', async () => {
    await backend.save(TEST_APP_ID, 'reg_a', 1);
    await backend.save(TEST_APP_ID, 'reg_b', 2);
    await backend.save(TEST_APP_ID, 'reg_c', 3);
    await backend.remove(TEST_APP_ID, 'reg_b');
    const result = await backend.list(TEST_APP_ID);
    const keys = new Set(result.data!);
    assert(keys.has('reg_a'), 'reg_a should remain');
    assert(!keys.has('reg_b'), 'reg_b should be removed');
    assert(keys.has('reg_c'), 'reg_c should remain');
    return 'Save 3, remove 1 -> list returns 2 of original 3';
  }, results, output_lines, insightsClient);

  // A9: ls_metadata_roundtrip
  await runTest('A9_ls_metadata_roundtrip', async () => {
    const metadata = { author: 'test_suite', version: 42 };
    await backend.save(TEST_APP_ID, 'meta_key', 'content_val', metadata);
    const result = await backend.load(TEST_APP_ID, 'meta_key');
    assert(result.ok === true, 'load ok');
    assert(result.data!.metadata !== undefined, 'metadata missing');
    assert(result.data!.metadata!.author === 'test_suite', 'author mismatch');
    assert(result.data!.metadata!.version === 42, 'version mismatch');
    return 'Metadata { author, version } roundtrips correctly';
  }, results, output_lines, insightsClient);

  // ─── B. AppDataStore Facade Tests ────────────────────────────────

  output_lines.push('--- B. AppDataStore Facade Tests ---');
  output_lines.push('');

  const facadeBackend = new LocalStorageBackend();
  const store = new AppDataStore({ app_id: TEST_APP_ID, backend: facadeBackend });

  // B10: facade_get_set
  await runTest('B10_facade_get_set', async () => {
    await store.set('facade_key', { x: 1 });
    const val = await store.get('facade_key');
    assert(val !== null, 'get returned null');
    assert((val as any).x === 1, `expected x=1, got ${JSON.stringify(val)}`);
    return 'set({ x: 1 }) -> get returns { x: 1 }';
  }, results, output_lines, insightsClient);

  // B11: facade_get_nonexistent
  await runTest('B11_facade_get_nonexistent', async () => {
    const val = await store.get('totally_missing');
    assert(val === null, `expected null, got ${JSON.stringify(val)}`);
    return 'get("missing") -> null';
  }, results, output_lines, insightsClient);

  // B12: facade_set_returns_true
  await runTest('B12_facade_set_returns_true', async () => {
    const ok = await store.set('ret_key', 'val');
    assert(ok === true, `expected true, got ${ok}`);
    return 'set() returns true';
  }, results, output_lines, insightsClient);

  // B13: facade_remove
  await runTest('B13_facade_remove', async () => {
    await store.set('rm_key', 'to_remove');
    const rmOk = await store.remove('rm_key');
    assert(rmOk === true, 'remove should return true');
    const val = await store.get('rm_key');
    assert(val === null, 'get after remove should be null');
    return 'set -> remove(true) -> get(null)';
  }, results, output_lines, insightsClient);

  // B14: facade_list
  await runTest('B14_facade_list', async () => {
    await store.set('fl_a', 1);
    await store.set('fl_b', 2);
    await store.set('fl_c', 3);
    const keys = await store.list();
    assert(keys.includes('fl_a'), 'missing fl_a');
    assert(keys.includes('fl_b'), 'missing fl_b');
    assert(keys.includes('fl_c'), 'missing fl_c');
    return `list() includes fl_a, fl_b, fl_c among ${keys.length} keys`;
  }, results, output_lines, insightsClient);

  // B15: facade_loadFull
  await runTest('B15_facade_loadFull', async () => {
    await store.set('full_key', 'full_val', { tag: 'test' });
    const result = await store.loadFull<string>('full_key');
    assert(result.ok === true, 'loadFull ok');
    assert(result.data !== undefined, 'data exists');
    assert(result.data!.content === 'full_val', 'content mismatch');
    assert(result.data!.metadata?.tag === 'test', 'metadata mismatch');
    assert(typeof result.data!.created_at === 'string', 'created_at missing');
    assert(typeof result.data!.updated_at === 'string', 'updated_at missing');
    return 'loadFull returns full AppDataRecord with content, metadata, timestamps';
  }, results, output_lines, insightsClient);

  // B16: facade_saveFull
  await runTest('B16_facade_saveFull', async () => {
    const result = await store.saveFull('sf_key', 'sf_val');
    assert(result.ok === true, 'saveFull ok');
    const loaded = await store.get('sf_key');
    assert(loaded === 'sf_val', `content mismatch: ${loaded}`);
    return 'saveFull returns { ok: true }, content retrievable';
  }, results, output_lines, insightsClient);

  // ─── C. Insights Telemetry ───────────────────────────────────────

  output_lines.push('--- C. Insights Telemetry ---');
  output_lines.push('');

  // C17: insights_telemetry
  await runTest('C17_insights_telemetry', async () => {
    const mock = new MockInsightsClient();
    const insightsStore = new AppDataStore({
      app_id: TEST_APP_ID,
      backend: new LocalStorageBackend(),
      insights: mock as unknown as InsightsClient,
    });

    await insightsStore.set('ins_key', 'val');
    await insightsStore.get('ins_key');
    await insightsStore.remove('ins_key');
    await insightsStore.list();

    const types = mock.events.map(e => e.type);
    assert(types.includes('appdata_save'), 'missing appdata_save event');
    assert(types.includes('appdata_load'), 'missing appdata_load event');
    assert(types.includes('appdata_remove'), 'missing appdata_remove event');
    assert(types.includes('appdata_list'), 'missing appdata_list event');

    // Verify payloads have app_id and ok
    for (const evt of mock.events) {
      assert(evt.payload.app_id === TEST_APP_ID, `app_id missing in ${evt.type}`);
      assert(typeof evt.payload.ok === 'boolean', `ok missing in ${evt.type}`);
    }

    return `Captured ${mock.events.length} events: ${types.join(', ')}`;
  }, results, output_lines, insightsClient);

  // ─── D. Backend Switching ────────────────────────────────────────

  output_lines.push('--- D. Backend Switching ---');
  output_lines.push('');

  // D18: backend_switching
  await runTest('D18_backend_switching', async () => {
    const lsBackend = new LocalStorageBackend();
    const { queryFn } = createMockSurrealQueryFn();
    const surrealBackend = new SurrealBackend(queryFn);

    const switchStore = new AppDataStore({ app_id: TEST_APP_ID, backend: lsBackend });

    await switchStore.set('switch_key', 'ls_value');
    const valBefore = await switchStore.get('switch_key');
    assert(valBefore === 'ls_value', 'localStorage value mismatch');

    // Switch to surreal - data not there
    switchStore.setBackend(surrealBackend);
    const valAfterSwitch = await switchStore.get('switch_key');
    assert(valAfterSwitch === null, `expected null from surreal, got ${JSON.stringify(valAfterSwitch)}`);

    // Switch back - data still in localStorage
    switchStore.setBackend(lsBackend);
    const valBack = await switchStore.get('switch_key');
    assert(valBack === 'ls_value', 'localStorage value should persist');

    return 'LS -> Surreal(null) -> LS(original) OK';
  }, results, output_lines, insightsClient);

  // ─── E. Migration ────────────────────────────────────────────────

  output_lines.push('--- E. Migration ---');
  output_lines.push('');

  // E19: migrate_local_to_mock
  await runTest('E19_migrate_local_to_mock', async () => {
    const sourceBackend = new LocalStorageBackend();
    const { queryFn } = createMockSurrealQueryFn();
    const destBackend = new SurrealBackend(queryFn);

    // Save 3 keys to source
    const migrateStore = new AppDataStore({ app_id: TEST_APP_ID, backend: sourceBackend });
    await migrateStore.set('mig_a', 'val_a');
    await migrateStore.set('mig_b', 'val_b');
    await migrateStore.set('mig_c', 'val_c');

    const result = await migrateStore.migrate(sourceBackend, destBackend);
    assert(result.ok === true, 'migration ok');
    assert(result.data!.migrated >= 3, `expected >=3 migrated, got ${result.data!.migrated}`);
    assert(result.data!.failed === 0, `expected 0 failed, got ${result.data!.failed}`);

    // Verify loadable from dest
    migrateStore.setBackend(destBackend);
    const a = await migrateStore.get('mig_a');
    const b = await migrateStore.get('mig_b');
    const c = await migrateStore.get('mig_c');
    assert(a === 'val_a', 'mig_a mismatch');
    assert(b === 'val_b', 'mig_b mismatch');
    assert(c === 'val_c', 'mig_c mismatch');

    return `Migrated ${result.data!.migrated} keys, 0 failed, all loadable from dest`;
  }, results, output_lines, insightsClient);

  // ─── F. Legacy Migration ─────────────────────────────────────────

  output_lines.push('--- F. Legacy Migration ---');
  output_lines.push('');

  // F20: legacy_migration
  await runTest('F20_legacy_migration', async () => {
    // Remove flag to allow migration
    localStorage.removeItem('appdata::rai::__legacy_migrated__');

    // Set an old-format key
    localStorage.setItem('rai_settings', JSON.stringify({ theme: 'dark', fontSize: 14 }));

    const result = migrateLegacyLocalStorage();
    assert(result.migrated >= 1, `expected migrated >= 1, got ${result.migrated}`);

    // Verify new-format key exists
    const newKey = 'appdata::rai::settings';
    const raw = localStorage.getItem(newKey);
    assert(raw !== null, 'new-format key should exist');
    const record = JSON.parse(raw!);
    assert(record.content.theme === 'dark', 'content mismatch');

    return `Migrated ${result.migrated} legacy keys, new-format verified`;
  }, results, output_lines, insightsClient);

  // F21: legacy_migration_idempotent
  await runTest('F21_legacy_migration_idempotent', async () => {
    // Flag should already be set from F20
    const result = migrateLegacyLocalStorage();
    assert(result.migrated === 0, `expected 0 migrated, got ${result.migrated}`);
    return 'Second run: { migrated: 0 } — idempotent';
  }, results, output_lines, insightsClient);

  // ─── G. SurrealBackend Mock Tests ────────────────────────────────

  output_lines.push('--- G. SurrealBackend Mock Tests ---');
  output_lines.push('');

  // G22: surreal_query_generation
  await runTest('G22_surreal_query_generation', async () => {
    const { queryFn, queries } = createMockSurrealQueryFn();
    const surreal = new SurrealBackend(queryFn);

    await surreal.save(TEST_APP_ID, 'sq_key', 'val');
    await surreal.load(TEST_APP_ID, 'sq_key');
    await surreal.remove(TEST_APP_ID, 'sq_key');
    await surreal.list(TEST_APP_ID);

    assert(queries.length === 4, `expected 4 queries, got ${queries.length}`);
    assert(queries[0].includes('UPSERT'), `query 0 should contain UPSERT: ${queries[0]}`);
    assert(queries[0].includes("type::thing"), `query 0 should contain type::thing: ${queries[0]}`);
    assert(queries[1].includes('SELECT *'), `query 1 should contain SELECT *: ${queries[1]}`);
    assert(queries[2].includes('DELETE'), `query 2 should contain DELETE: ${queries[2]}`);
    assert(queries[3].includes('SELECT data_key'), `query 3 should contain SELECT data_key: ${queries[3]}`);

    return `4 queries generated with correct SurrealQL patterns`;
  }, results, output_lines, insightsClient);

  // G23: surreal_error_handling
  await runTest('G23_surreal_error_handling', async () => {
    const { queryFn } = createMockSurrealQueryFn({ shouldThrow: true });
    const surreal = new SurrealBackend(queryFn);

    const saveR = await surreal.save(TEST_APP_ID, 'err_key', 'val');
    assert(saveR.ok === false, 'save should fail');
    assert(saveR.error === 'db_connection_lost', `save error: ${saveR.error}`);

    const loadR = await surreal.load(TEST_APP_ID, 'err_key');
    assert(loadR.ok === false, 'load should fail');
    assert(loadR.error === 'db_connection_lost', `load error: ${loadR.error}`);

    const removeR = await surreal.remove(TEST_APP_ID, 'err_key');
    assert(removeR.ok === false, 'remove should fail');
    assert(removeR.error === 'db_connection_lost', `remove error: ${removeR.error}`);

    const listR = await surreal.list(TEST_APP_ID);
    assert(listR.ok === false, 'list should fail');
    assert(listR.error === 'db_connection_lost', `list error: ${listR.error}`);

    return 'All 4 ops return { ok: false, error: "db_connection_lost" }';
  }, results, output_lines, insightsClient);

  // ─── H. Edge Cases ───────────────────────────────────────────────

  output_lines.push('--- H. Edge Cases ---');
  output_lines.push('');

  // H24: large_content
  await runTest('H24_large_content', async () => {
    const largeStr = 'x'.repeat(100_000);
    await backend.save(TEST_APP_ID, 'large_key', largeStr);
    const result = await backend.load<string>(TEST_APP_ID, 'large_key');
    assert(result.ok === true, 'load ok');
    assert(result.data!.content.length === 100_000, `length mismatch: ${result.data!.content.length}`);
    assert(result.data!.content === largeStr, 'content mismatch on large string');
    return '100KB string roundtrips correctly';
  }, results, output_lines, insightsClient);

  // H25: special_chars_in_key
  await runTest('H25_special_chars_in_key', async () => {
    const specialKeys = ['key.with.dots', 'key/with/slashes', 'key with spaces'];
    for (const k of specialKeys) {
      await backend.save(TEST_APP_ID, k, `value_for_${k}`);
      const result = await backend.load<string>(TEST_APP_ID, k);
      assert(result.ok === true, `load failed for key "${k}"`);
      assert(result.data!.content === `value_for_${k}`, `content mismatch for key "${k}"`);
    }
    return `Keys with dots, slashes, spaces all roundtrip OK`;
  }, results, output_lines, insightsClient);

  // H26: empty_content
  await runTest('H26_empty_content', async () => {
    await backend.save(TEST_APP_ID, 'empty_str', '');
    const str = await backend.load<string>(TEST_APP_ID, 'empty_str');
    assert(str.ok === true && str.data!.content === '', 'empty string failed');

    await backend.save(TEST_APP_ID, 'empty_obj', {});
    const obj = await backend.load(TEST_APP_ID, 'empty_obj');
    assert(obj.ok === true && JSON.stringify(obj.data!.content) === '{}', 'empty object failed');

    await backend.save(TEST_APP_ID, 'empty_arr', []);
    const arr = await backend.load(TEST_APP_ID, 'empty_arr');
    assert(arr.ok === true && JSON.stringify(arr.data!.content) === '[]', 'empty array failed');

    return 'Empty string, object, array all roundtrip correctly';
  }, results, output_lines, insightsClient);

  // H27: concurrent_saves
  await runTest('H27_concurrent_saves', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      backend.save(TEST_APP_ID, 'concurrent_key', i)
    );
    await Promise.all(promises);

    const result = await backend.load<number>(TEST_APP_ID, 'concurrent_key');
    assert(result.ok === true, 'load ok');
    const val = result.data!.content;
    assert(typeof val === 'number' && val >= 0 && val <= 9, `expected number 0-9, got ${val}`);
    return `10 concurrent saves, final value is ${val} (valid 0-9)`;
  }, results, output_lines, insightsClient);

  // ─── I. Live SurrealDB Tests (require auth + DB connection) ─────

  output_lines.push('-'.repeat(60));
  output_lines.push('--- I. Live SurrealDB Tests (require auth + DB) ---');
  output_lines.push('');

  // Connection check — probe the DB before running live tests
  let dbAvailable = false;
  try {
    const probe = await fbu.surreal_query({
      query: `SELECT * FROM app_data WHERE app_id=$app_id LIMIT 1`,
      variables: { app_id: '__probe__' },
    });
    dbAvailable = (probe as any)?.data?.result !== undefined;
  } catch {
    dbAvailable = false;
  }

  if (!dbAvailable) {
    output_lines.push('[SKIP] SurrealDB not available — skipping live tests (I28-I34)');
    output_lines.push('  (Log in and ensure DB connection to run these)');
    output_lines.push('');
  } else {
    const liveSurreal = new SurrealBackend(fbu.surreal_query as unknown as SurrealQueryFn);
    const LIVE_TEST_APP_ID = '__test__';

    // I28: live_surreal_raw_response — diagnostic: log the actual response shape
    await runTest('I28_live_surreal_raw_response', async () => {
      // Save via raw query so we know the data is there
      const contentStr = JSON.stringify({ msg: 'diag_test' });
      const rid = `${LIVE_TEST_APP_ID}_diag_key`.replace(/[^a-zA-Z0-9_]/g, '_');
      await fbu.surreal_query({
        query: `UPSERT type::thing('app_data', $rid) SET app_id=$app_id, data_key=$data_key, content=$content, metadata=$metadata, updated_at=time::now()`,
        variables: { rid, app_id: LIVE_TEST_APP_ID, data_key: 'diag_key', content: contentStr, metadata: null },
      });

      // Raw SELECT to see the actual response shape
      const rawResponse = await fbu.surreal_query({
        query: `SELECT * FROM app_data WHERE app_id=$app_id AND data_key=$data_key LIMIT 1`,
        variables: { app_id: LIVE_TEST_APP_ID, data_key: 'diag_key' },
      });

      // Extract what we can about the shape
      const resp = rawResponse as any;
      const data = resp?.data;
      const result = data?.result;
      const resultResult = result?.result;
      const firstRow = Array.isArray(resultResult) && resultResult.length > 0 ? resultResult[0] : null;

      const shape = {
        topLevelKeys: Object.keys(resp || {}),
        hasData: data !== undefined,
        dataKeys: data ? Object.keys(data) : [],
        hasResult: result !== undefined,
        resultType: typeof result,
        resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
        hasResultResult: resultResult !== undefined,
        resultResultType: Array.isArray(resultResult) ? 'array' : typeof resultResult,
        resultResultLength: Array.isArray(resultResult) ? resultResult.length : 'n/a',
        firstRowKeys: firstRow ? Object.keys(firstRow) : 'n/a',
        firstRowContentType: firstRow ? typeof firstRow.content : 'n/a',
        firstRowContentValue: firstRow ? String(firstRow.content).substring(0, 200) : 'n/a',
        firstRowRaw: firstRow ? JSON.stringify(firstRow).substring(0, 500) : 'n/a',
      };

      // Also capture the raw response up to 2KB for full inspection
      const rawSnippet = JSON.stringify(resp).substring(0, 2000);

      assert(shape.hasData, 'response missing .data');
      return {
        details: `Shape: result.result is ${shape.resultResultType}(${shape.resultResultLength}), row keys: [${shape.firstRowKeys}], content type: ${shape.firstRowContentType}`,
        diagnostics: { shape, rawSnippet },
      };
    }, results, output_lines, insightsClient);

    // I29: live_surreal_save_load
    await runTest('I29_live_surreal_save_load', async () => {
      const saveR = await liveSurreal.save(LIVE_TEST_APP_ID, 'live_key', { msg: 'hello from test suite' });
      assert(saveR.ok === true, `save failed: ${saveR.error}`);

      const loadR = await liveSurreal.load(LIVE_TEST_APP_ID, 'live_key');
      assert(loadR.ok === true, `load failed: ${loadR.error}`);
      assert(loadR.data !== undefined, 'loaded data is undefined');
      assert((loadR.data!.content as any).msg === 'hello from test suite', `content mismatch: ${JSON.stringify(loadR.data!.content)}`);
      assert(loadR.data!.app_id === LIVE_TEST_APP_ID, 'app_id mismatch');
      assert(loadR.data!.data_key === 'live_key', 'data_key mismatch');
      return 'Live SurrealDB save + load roundtrip OK';
    }, results, output_lines, insightsClient);

    // I30: live_surreal_update_preserves_record
    await runTest('I30_live_surreal_update', async () => {
      await liveSurreal.save(LIVE_TEST_APP_ID, 'live_update_key', 'v1');
      const first = await liveSurreal.load<string>(LIVE_TEST_APP_ID, 'live_update_key');
      assert(first.ok && first.data !== undefined, 'first load failed');

      await liveSurreal.save(LIVE_TEST_APP_ID, 'live_update_key', 'v2');
      const second = await liveSurreal.load<string>(LIVE_TEST_APP_ID, 'live_update_key');
      assert(second.ok && second.data !== undefined, 'second load failed');
      assert(second.data!.content === 'v2', `expected v2, got ${second.data!.content}`);
      return 'UPSERT updates content in-place';
    }, results, output_lines, insightsClient);

    // I31: live_surreal_remove
    await runTest('I31_live_surreal_remove', async () => {
      await liveSurreal.save(LIVE_TEST_APP_ID, 'live_rm_key', 'delete_me');
      const before = await liveSurreal.load(LIVE_TEST_APP_ID, 'live_rm_key');
      assert(before.ok && before.data !== undefined, 'key should exist before remove');

      const rmR = await liveSurreal.remove(LIVE_TEST_APP_ID, 'live_rm_key');
      assert(rmR.ok === true, `remove failed: ${rmR.error}`);

      const after = await liveSurreal.load(LIVE_TEST_APP_ID, 'live_rm_key');
      assert(after.ok === true, 'load after remove should succeed');
      assert(after.data === undefined || (Array.isArray(after.data) && after.data.length === 0),
        'key should be gone after remove');
      return 'Live save -> remove -> load(undefined) OK';
    }, results, output_lines, insightsClient);

    // I32: live_surreal_list
    await runTest('I32_live_surreal_list', async () => {
      await liveSurreal.save(LIVE_TEST_APP_ID, 'live_list_a', 1);
      await liveSurreal.save(LIVE_TEST_APP_ID, 'live_list_b', 2);

      const listR = await liveSurreal.list(LIVE_TEST_APP_ID);
      assert(listR.ok === true, `list failed: ${listR.error}`);
      assert(Array.isArray(listR.data), 'data should be array');
      assert(listR.data!.includes('live_list_a'), 'missing live_list_a');
      assert(listR.data!.includes('live_list_b'), 'missing live_list_b');
      return `Live list returned ${listR.data!.length} keys including live_list_a, live_list_b`;
    }, results, output_lines, insightsClient);

    // I33: live_surreal_metadata
    await runTest('I33_live_surreal_metadata', async () => {
      const meta = { source: 'test_suite', run_id: Date.now() };
      await liveSurreal.save(LIVE_TEST_APP_ID, 'live_meta_key', 'meta_content', meta);
      const loadR = await liveSurreal.load(LIVE_TEST_APP_ID, 'live_meta_key');
      assert(loadR.ok && loadR.data !== undefined, 'load failed');
      assert(loadR.data!.metadata !== undefined, 'metadata missing');
      assert(loadR.data!.metadata!.source === 'test_suite', 'metadata.source mismatch');
      assert(loadR.data!.metadata!.run_id === meta.run_id, 'metadata.run_id mismatch');
      return 'Metadata roundtrips through live SurrealDB';
    }, results, output_lines, insightsClient);

    // I34: live_surreal_facade_e2e
    await runTest('I34_live_surreal_facade_e2e', async () => {
      const liveStore = new AppDataStore({ app_id: LIVE_TEST_APP_ID, backend: liveSurreal });

      const setOk = await liveStore.set('live_facade_key', { items: [1, 2, 3], nested: { ok: true } });
      assert(setOk === true, 'facade set failed');

      const val = await liveStore.get('live_facade_key');
      assert(val !== null, 'facade get returned null');
      assert((val as any).items.length === 3, 'items array mismatch');
      assert((val as any).nested.ok === true, 'nested.ok mismatch');

      const rmOk = await liveStore.remove('live_facade_key');
      assert(rmOk === true, 'facade remove failed');

      const afterRm = await liveStore.get('live_facade_key');
      assert(afterRm === null, 'should be null after remove');
      return 'Full AppDataStore facade works end-to-end against live SurrealDB';
    }, results, output_lines, insightsClient);

    // Live DB cleanup
    output_lines.push('  Cleaning up live test data...');
    try {
      await fbu.surreal_query({
        query: `DELETE FROM app_data WHERE app_id=$app_id`,
        variables: { app_id: LIVE_TEST_APP_ID },
      });
      output_lines.push('  Live test data cleaned from SurrealDB');
    } catch (e: any) {
      output_lines.push(`  Warning: live cleanup failed: ${e?.message}`);
    }
    output_lines.push('');
  }

  // ─── Summary ─────────────────────────────────────────────────────

  const suiteDuration = Date.now() - suiteStart;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  output_lines.push('='.repeat(60));
  output_lines.push('SUMMARY');
  output_lines.push('='.repeat(60));
  output_lines.push(`Total: ${results.length} tests`);
  output_lines.push(`Passed: ${passed}`);
  output_lines.push(`Failed: ${failed}`);
  output_lines.push(`Duration: ${suiteDuration}ms`);
  output_lines.push('');

  if (failed > 0) {
    output_lines.push('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      output_lines.push(`  - ${r.name}: ${r.error || 'assertion failed'}`);
    });
    output_lines.push('');
  }

  // Insights summary
  if (insightsClient) {
    try {
      insightsClient.addInChain('appdata_test_summary', {
        total: results.length,
        passed,
        failed,
        duration_ms: suiteDuration,
      });
      insightsClient.endChain();
    } catch { /* insights optional */ }
  }

  // Auto-cleanup
  const cleaned = cleanup_test_keys();
  output_lines.push(`Cleanup: removed ${cleaned} test keys`);
  output_lines.push('='.repeat(60));

  return output_lines.join('\n');
}

// ─── Exports ─────────────────────────────────────────────────────────

export async function test_app_data_store(): Promise<string> {
  console.log('Running app_data_store tests...');
  const output = await run_tests();
  console.log(output);
  return output;
}

export async function clear_app_data_store_test(): Promise<string> {
  console.log('Clearing app_data_store test data...');
  const lines: string[] = [];

  const removed = cleanup_test_keys();
  lines.push(`localStorage: removed ${removed} keys`);

  // Also clean live DB test data
  try {
    await fbu.surreal_query({
      query: `DELETE FROM app_data WHERE app_id=$app_id`,
      variables: { app_id: '__test__' },
    });
    lines.push('SurrealDB: deleted __test__ app_data records');
  } catch (e: any) {
    lines.push(`SurrealDB: cleanup skipped (${e?.message || 'not connected'})`);
  }

  const remaining = Object.keys(localStorage).filter(k => k.includes('__test__'));
  lines.push(`Remaining __test__ localStorage keys: ${remaining.length === 0 ? 'none' : remaining.join(', ')}`);

  const output = lines.join('\n');
  console.log(output);
  return output;
}
