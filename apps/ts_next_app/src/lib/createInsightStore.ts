/**
 * createInsightStore — Zustand factory with auto-instrumentation
 *
 * Wraps Zustand's create() to automatically emit insight events for every
 * store action. Provides a Playwright bridge for simulation and a late-binding
 * mechanism for InsightsClient.
 *
 * Usage:
 *   const useMyStore = createInsightStore<MyState>({
 *     appName: 'myapp',
 *     silent: ['noisyAction'],
 *     creator: (set, get, api, insights) => ({ ... }),
 *   });
 *
 *   // In React, after InsightsClient is ready:
 *   useMyStore.setInsights(client);
 */

import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { executeWorkflow } from './simi';
import type { SimiWorkflow, RunOpts, RunResult } from './simi';

// ─── Types ──────────────────────────────────────────────────────────

type InsightsClient = {
  addEvent: (
    type: string,
    payload: Record<string, any>,
    options?: { tags?: string[]; duration_ms?: number }
  ) => void;
  addSessionTags?: (tags: string[]) => void;
} | null;

type SetState<T> = StoreApi<T>['setState'];
type GetState<T> = StoreApi<T>['getState'];

interface InsightHelpers {
  /** Emit a system/lifecycle event directly to InsightsClient */
  emit: (type: string, payload: Record<string, any>) => void;
  /** Get the current InsightsClient (or null if not yet bound) */
  getClient: () => InsightsClient;
}

export interface InsightStoreConfig<T> {
  appName: string;
  /** Actions that should NOT be instrumented. Array of names or predicate. */
  silent?: string[] | ((name: string) => boolean);
  /** Simi workflows to compile and expose on the bridge */
  workflows?: Record<string, SimiWorkflow>;
  creator: (
    set: SetState<T>,
    get: GetState<T>,
    api: StoreApi<T>,
    insights: InsightHelpers
  ) => T;
}

export type InsightStoreApi<T> = UseBoundStore<StoreApi<T>> & {
  /** Late-bind InsightsClient after React mount */
  setInsights: (client: InsightsClient) => void;
  /** Playwright bridge: dispatch an action by name */
  dispatch: (actionName: string, ...args: any[]) => any;
};

// ─── Helpers ────────────────────────────────────────────────────────

function safeSerialize(v: unknown): unknown {
  try {
    const json = JSON.stringify(v);
    if (json && json.length > 2000) {
      return `[truncated: ${json.length} chars]`;
    }
    return JSON.parse(json);
  } catch {
    return '[unserializable]';
  }
}

function isSilent(
  name: string,
  silent?: string[] | ((name: string) => boolean),
): boolean {
  if (!silent) return false;
  if (typeof silent === 'function') return silent(name);
  return silent.includes(name);
}

// ─── Factory ────────────────────────────────────────────────────────

export function createInsightStore<T extends object>(
  config: InsightStoreConfig<T>,
): InsightStoreApi<T> {
  const { appName, silent } = config;

  // Late-bound client reference
  let _client: InsightsClient = null;

  const insightHelpers: InsightHelpers = {
    emit: (type, payload) => {
      if (_client) {
        _client.addEvent(type, { app: appName, ...payload });
      }
    },
    getClient: () => _client,
  };

  // Create the raw store via Zustand
  const useStore = create<T>((set, get, api) => {
    // Get the raw state object from the creator
    const rawState = config.creator(set, get, api, insightHelpers);

    // Wrap function-valued members for auto-instrumentation
    const wrapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawState as Record<string, any>)) {
      if (typeof value !== 'function' || isSilent(key, silent)) {
        wrapped[key] = value;
        continue;
      }

      // Wrap the action
      wrapped[key] = (...args: any[]) => {
        const start = performance.now();
        let result: any;
        let status: 'ok' | 'error' = 'ok';
        let errorMsg: string | undefined;

        try {
          result = value(...args);
        } catch (err: any) {
          status = 'error';
          errorMsg = err?.message || String(err);
          throw err;
        }

        // Check if result is a promise (async action)
        if (result && typeof result === 'object' && typeof result.then === 'function') {
          // Async action — emit after resolution
          return result.then(
            (resolved: any) => {
              const duration_ms = Math.round(performance.now() - start);
              if (_client) {
                _client.addEvent('action', {
                  app: appName,
                  action: key,
                  kind: 'async',
                  args: safeSerialize(args),
                  result: safeSerialize(resolved),
                  duration_ms,
                  status: 'ok',
                }, { duration_ms });
              }
              return resolved;
            },
            (err: any) => {
              const duration_ms = Math.round(performance.now() - start);
              if (_client) {
                _client.addEvent('action', {
                  app: appName,
                  action: key,
                  kind: 'async',
                  args: safeSerialize(args),
                  duration_ms,
                  status: 'error',
                  error: err?.message || String(err),
                }, { duration_ms });
              }
              throw err;
            },
          );
        }

        // Sync action — emit immediately
        const duration_ms = Math.round(performance.now() - start);
        if (_client) {
          _client.addEvent('action', {
            app: appName,
            action: key,
            kind: 'sync',
            args: safeSerialize(args),
            result: safeSerialize(result),
            duration_ms,
            status,
            ...(errorMsg ? { error: errorMsg } : {}),
          }, { duration_ms });
        }

        return result;
      };
    }

    return wrapped as T;
  });

  // ─── Playwright bridge ──────────────────────────────────────────

  function dispatch(actionName: string, ...args: any[]): any {
    const state = useStore.getState() as Record<string, any>;
    const fn = state[actionName];
    if (typeof fn !== 'function') {
      throw new Error(`[${appName}] No action named "${actionName}"`);
    }
    return fn(...args);
  }

  // Expose on window (SSR-safe)
  if (typeof window !== 'undefined') {
    const bridge: Record<string, any> = {
      dispatch,
      getState: useStore.getState,
    };

    // Compile and mount Simi workflows
    if (config.workflows) {
      const compiledWorkflows: Record<string, (opts?: RunOpts) => Promise<RunResult>> = {};

      for (const [, workflow] of Object.entries(config.workflows)) {
        compiledWorkflows[workflow.id] = (opts?) =>
          executeWorkflow(workflow, dispatch, useStore.getState, () => _client, opts);
      }

      bridge.simi = {
        workflows: compiledWorkflows,
        list: () => Object.keys(compiledWorkflows),
      };
    }

    (window as any)[`__${appName}__`] = bridge;
  }

  // ─── Attach extras ─────────────────────────────────────────────

  const storeWithExtras = useStore as unknown as InsightStoreApi<T>;

  storeWithExtras.setInsights = (client: InsightsClient) => {
    _client = client;
  };

  storeWithExtras.dispatch = dispatch;

  return storeWithExtras;
}
