import { defineWorkflow } from '../../../../../src/lib/simi';

export const settingsPersistenceFlow = defineWorkflow({
  id: 'settings_persistence_flow',
  app: 'cortex_0',
  tags: ['smoke', 'settings', 'persistence'],
  steps: [
    // Wait for store initialization (settings loaded)
    { waitFor: 'state.aiModel !== ""', timeout: 10000 },

    // Switch to local storage so persistence works without Firebase auth
    { action: 'switchStorageMode', args: ['local'], timeout: 10000, wait: 500 },

    // Update settings to known test values
    { action: 'updateSettings', args: [{ speechCooldownMs: 999, soundFeedback: false }], wait: 300 },
    { assert: 'state.speechCooldownMs === 999', message: 'speechCooldownMs should be 999 after update' },
    { assert: 'state.soundFeedback === false', message: 'soundFeedback should be false after update' },

    // Persist to AppDataStore
    { action: 'saveSettings', args: [], timeout: 10000, wait: 300 },

    // Overwrite in memory with different values
    { action: 'updateSettings', args: [{ speechCooldownMs: 5000, soundFeedback: true }], wait: 300 },
    { assert: 'state.speechCooldownMs === 5000', message: 'speechCooldownMs should be 5000 after overwrite' },

    // Reload from store — should restore the persisted values
    { action: 'loadSettings', args: [], timeout: 10000, wait: 500 },
    { assert: 'state.speechCooldownMs === 999', message: 'speechCooldownMs should be 999 after reload' },
    { assert: 'state.soundFeedback === false', message: 'soundFeedback should be false after reload' },

    // Restore defaults
    { action: 'updateSettings', args: [{ speechCooldownMs: 2000, soundFeedback: true }], wait: 300 },
  ],
});
