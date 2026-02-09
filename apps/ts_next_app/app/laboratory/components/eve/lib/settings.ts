import type { EveSettings } from './types';
import { DEFAULT_THEME_ID } from './themes';

// ─── Defaults ──────────────────────────────────────────────────────

export const EVE_DEFAULTS: Readonly<EveSettings> = {
  themeId: DEFAULT_THEME_ID,
  glowIntensity: 1.0,
  pointSize: 4,
  animationSpeed: 1.0,
  showHud: true,
  showGrid: true,
  showDetailPanel: true,
  method: 'umap',
  dimensions: 3,
};

// ─── Storage ───────────────────────────────────────────────────────

const STORAGE_KEY = 'eve-settings';

function load(): EveSettings {
  if (typeof window === 'undefined') return { ...EVE_DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EVE_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...EVE_DEFAULTS };
}

function save(settings: EveSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// ─── Module state ──────────────────────────────────────────────────

let _cache: EveSettings | null = null;
const _listeners = new Set<() => void>();

function notifyListeners(): void {
  _listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

function ensureCache(): EveSettings {
  if (!_cache) _cache = load();
  return _cache;
}

// ─── Public API ────────────────────────────────────────────────────

export function getEveSettings(): EveSettings {
  return { ...ensureCache() };
}

export function updateEveSettings(partial: Partial<EveSettings>): EveSettings {
  const current = ensureCache();
  const updated = { ...current, ...partial };
  _cache = updated;
  save(updated);
  notifyListeners();
  return { ...updated };
}

export function resetEveSettings(): EveSettings {
  _cache = { ...EVE_DEFAULTS };
  save(_cache);
  notifyListeners();
  return { ...EVE_DEFAULTS };
}

export function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function getSnapshot(): EveSettings {
  return ensureCache();
}

export function getServerSnapshot(): EveSettings {
  return { ...EVE_DEFAULTS };
}
