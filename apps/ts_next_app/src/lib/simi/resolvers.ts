/**
 * Simi — Resolver implementation
 *
 * Walks args arrays and replaces objects with `$resolve` keys
 * with their resolved values from store state.
 */

import type { Resolver } from './types';

function isResolver(v: unknown): v is Resolver {
  return v !== null && typeof v === 'object' && '$resolve' in (v as any);
}

function getPath(obj: any, path: string): any {
  return path.split('.').reduce((cur, key) => {
    if (cur === undefined || cur === null) return undefined;
    return cur[key];
  }, obj);
}

function matchesValue(item: any, key: string, expected: any): boolean {
  const actual = item[key];
  if (expected instanceof RegExp) {
    return expected.test(String(actual));
  }
  if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
    // Nested matching
    if (actual === null || typeof actual !== 'object') return false;
    return Object.keys(expected).every(k => matchesValue(actual, k, expected[k]));
  }
  return actual === expected;
}

function resolveOne(resolver: Resolver, getState: () => any): any {
  const state = getState();

  switch (resolver.$resolve) {
    case 'state': {
      const value = getPath(state, resolver.path);
      if (value === undefined) {
        throw new Error(`state resolver: path "${resolver.path}" not found in state`);
      }
      return value;
    }

    case 'find': {
      const arr = getPath(state, resolver.path);
      if (!Array.isArray(arr)) {
        throw new Error(`find resolver: path "${resolver.path}" is not an array (got ${typeof arr})`);
      }
      if (arr.length === 0) {
        throw new Error(`find resolver: array at "${resolver.path}" is empty`);
      }

      if (resolver.index !== undefined) {
        const item = arr[resolver.index];
        if (item === undefined) {
          throw new Error(`find resolver: index ${resolver.index} out of bounds for "${resolver.path}" (length ${arr.length})`);
        }
        return item;
      }

      if (resolver.match) {
        const match = resolver.match;
        const found = arr.find(item =>
          Object.keys(match).every(k => matchesValue(item, k, match[k]))
        );
        if (found === undefined) {
          throw new Error(`find resolver: no match in "${resolver.path}" for ${JSON.stringify(match)}`);
        }
        return found;
      }

      throw new Error('find resolver: must specify either "index" or "match"');
    }

    case 'eval': {
      return resolver.fn(state);
    }

    default:
      throw new Error(`Unknown resolver type: ${(resolver as any).$resolve}`);
  }
}

/**
 * Walk an args array, resolving any Resolver objects in-place.
 */
export function resolveArgs(args: any[], getState: () => any): { resolved: any[]; resolverEvents: Array<{ resolver: Resolver; status: 'ok' | 'error'; error?: string }> } {
  const resolverEvents: Array<{ resolver: Resolver; status: 'ok' | 'error'; error?: string }> = [];
  const resolved = args.map(arg => {
    if (!isResolver(arg)) return arg;
    try {
      const value = resolveOne(arg, getState);
      resolverEvents.push({ resolver: arg, status: 'ok' });
      return value;
    } catch (err: any) {
      resolverEvents.push({ resolver: arg, status: 'error', error: err.message });
      throw err;
    }
  });
  return { resolved, resolverEvents };
}
