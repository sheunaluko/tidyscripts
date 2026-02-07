/**
 * React hook for reactive access to tivi settings.
 * Thin wrapper over the settings module using useSyncExternalStore.
 */

import { useSyncExternalStore } from 'react';
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  updateTiviSettings,
  resetTiviSettings,
  type TiviSettings,
} from './settings';

export function useTiviSettings(): {
  settings: TiviSettings;
  updateSettings: typeof updateTiviSettings;
  resetSettings: typeof resetTiviSettings;
} {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    settings,
    updateSettings: updateTiviSettings,
    resetSettings: resetTiviSettings,
  };
}
