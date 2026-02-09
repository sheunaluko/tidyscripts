import { useSyncExternalStore } from 'react';
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  updateEveSettings,
  resetEveSettings,
} from './settings';
import type { EveSettings } from './types';

export function useEveSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    settings,
    updateSettings: (partial: Partial<EveSettings>) => updateEveSettings(partial),
    resetSettings: () => resetEveSettings(),
  };
}
