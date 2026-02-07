/**
 * Tivi Settings Module
 *
 * Owns all voice/device settings (VAD thresholds, TTS voice, playback rate, language, verbose).
 * These are inherently device-local (depend on microphone, available voices, audio environment).
 *
 * Implementation-swappable: the storage backend conforms to TiviSettingsStorage interface.
 * Default uses localStorage. Can be swapped via setTiviSettingsBackend().
 *
 * One-time migration from legacy keys (tivi-vad-params, default_voice_uri) on first load.
 */

import type { TiviMode } from './types';

// ─── Types ─────────────────────────────────────────────────────────

export interface TiviSettings {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  minSpeechStartMs: number;
  powerThreshold: number;
  mode: TiviMode;
  enableInterruption: boolean;
  playbackRate: number;
  defaultVoiceURI: string | null;
  language: string;
  verbose: boolean;
}

export type TiviSettingsKey = keyof TiviSettings;

// ─── Defaults ──────────────────────────────────────────────────────

export const TIVI_DEFAULTS: Readonly<TiviSettings> = {
  positiveSpeechThreshold: 0.8,
  negativeSpeechThreshold: 0.6,
  minSpeechStartMs: 150,
  powerThreshold: 0.01,
  mode: 'guarded',
  enableInterruption: true,
  playbackRate: 1.5,
  defaultVoiceURI: null,
  language: 'en-US',
  verbose: false,
};

// ─── Storage interface ─────────────────────────────────────────────

export interface TiviSettingsStorage {
  load(): TiviSettings;
  save(settings: TiviSettings): void;
}

// ─── localStorage backend ──────────────────────────────────────────

const CANONICAL_KEY = 'tivi-settings';
const LEGACY_VAD_KEY = 'tivi-vad-params';
const LEGACY_VOICE_KEY = 'default_voice_uri';

class LocalStorageTiviBackend implements TiviSettingsStorage {
  load(): TiviSettings {
    if (typeof window === 'undefined') return { ...TIVI_DEFAULTS };

    try {
      // Try canonical key first
      const raw = localStorage.getItem(CANONICAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...TIVI_DEFAULTS, ...parsed };
      }

      // Migrate from legacy keys
      return this.migrateFromLegacy();
    } catch {
      return { ...TIVI_DEFAULTS };
    }
  }

  save(settings: TiviSettings): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(settings));
    } catch {
      // localStorage might be full or unavailable
    }
  }

  private migrateFromLegacy(): TiviSettings {
    const settings = { ...TIVI_DEFAULTS };

    try {
      // Migrate VAD params
      const vadRaw = localStorage.getItem(LEGACY_VAD_KEY);
      if (vadRaw) {
        const vad = JSON.parse(vadRaw);
        if (vad.positiveSpeechThreshold != null) settings.positiveSpeechThreshold = vad.positiveSpeechThreshold;
        if (vad.negativeSpeechThreshold != null) settings.negativeSpeechThreshold = vad.negativeSpeechThreshold;
        if (vad.minSpeechStartMs != null) settings.minSpeechStartMs = vad.minSpeechStartMs;
        else if (vad.minSpeechMs != null) settings.minSpeechStartMs = vad.minSpeechMs; // legacy key
        if (vad.powerThreshold != null) settings.powerThreshold = vad.powerThreshold;
        if (vad.mode != null) settings.mode = vad.mode;
        if (vad.enableInterruption != null) settings.enableInterruption = vad.enableInterruption;
        if (vad.verbose != null) settings.verbose = vad.verbose;
      }

      // Migrate voice URI
      const voiceURI = localStorage.getItem(LEGACY_VOICE_KEY);
      if (voiceURI) settings.defaultVoiceURI = voiceURI;
    } catch {
      // Legacy data corrupt — use defaults
    }

    // Persist to canonical key
    try {
      localStorage.setItem(CANONICAL_KEY, JSON.stringify(settings));
    } catch {}

    return settings;
  }

}

// ─── Module state ──────────────────────────────────────────────────

let _backend: TiviSettingsStorage = new LocalStorageTiviBackend();
let _cache: TiviSettings | null = null;
let _listeners = new Set<() => void>();

function notifyListeners(): void {
  _listeners.forEach(fn => {
    try { fn(); } catch {}
  });
}

function ensureCache(): TiviSettings {
  if (!_cache) {
    _cache = _backend.load();
  }
  return _cache;
}

// ─── Public API ────────────────────────────────────────────────────

/** Get current tivi settings (returns a copy) */
export function getTiviSettings(): TiviSettings {
  return { ...ensureCache() };
}

/** Update tivi settings (partial merge). Returns the new settings. */
export function updateTiviSettings(partial: Partial<TiviSettings>): TiviSettings {
  const current = ensureCache();
  const updated = { ...current, ...partial };
  _cache = updated;
  _backend.save(updated);
  notifyListeners();
  return { ...updated };
}

/** Reset all tivi settings to defaults. Returns the defaults. */
export function resetTiviSettings(): TiviSettings {
  _cache = { ...TIVI_DEFAULTS };
  _backend.save(_cache);
  notifyListeners();
  return { ...TIVI_DEFAULTS };
}

/** Subscribe to settings changes. Returns unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/** Snapshot for useSyncExternalStore — returns stable reference when unchanged. */
export function getSnapshot(): TiviSettings {
  return ensureCache();
}

/** Server snapshot for useSyncExternalStore SSR. */
export function getServerSnapshot(): TiviSettings {
  return { ...TIVI_DEFAULTS };
}

/** Swap the storage backend (for testing or future migration to AppDataStore). */
export function setTiviSettingsBackend(backend: TiviSettingsStorage): void {
  _backend = backend;
  _cache = null; // Force reload from new backend
}
