import { defineWorkflow } from '../../../../../src/lib/simi';

/**
 * Settings Persistence Flow — change settings, save, reload, verify
 *
 * Tests that settings survive a save/load round-trip through AppDataStore.
 * Works in both local and cloud modes.
 */
export const settingsPersistenceFlow = defineWorkflow({
  id: 'settings_persistence_flow',
  app: 'rai',
  tags: ['smoke', 'settings'],
  steps: [
    // Navigate to settings
    { action: 'setCurrentView', args: ['settings'], wait: 300 },

    // Record the current aiModel so we can detect change
    {
      assert: 'typeof state.settings.aiModel === "string"',
      message: 'Settings should have an aiModel string',
    },

    // Change several settings
    {
      id: 'update_input_mode',
      action: 'updateSettings',
      args: [{ inputMode: 'text' }],
      wait: 300,
    },
    {
      id: 'update_autostart',
      action: 'updateSettings',
      args: [{ autostartGeneration: true }],
      wait: 300,
    },
    {
      id: 'update_show_defaults',
      action: 'updateSettings',
      args: [{ showDefaultTemplates: false }],
      wait: 300,
    },

    // Assert settings are in state
    { assert: 'state.settings.inputMode === "text"', message: 'inputMode should be text' },
    { assert: 'state.settings.autostartGeneration === true', message: 'autostartGeneration should be true' },
    { assert: 'state.settings.showDefaultTemplates === false', message: 'showDefaultTemplates should be false' },

    // Wait for async save to complete
    { waitFor: 'true', timeout: 2000 },

    // Reload settings from store to verify persistence
    { id: 'reload_settings', action: 'loadSettings', args: [], timeout: 10000, wait: 500 },

    // Assert settings survived the round-trip
    { assert: 'state.settings.inputMode === "text"', message: 'inputMode should persist after reload' },
    { assert: 'state.settings.autostartGeneration === true', message: 'autostartGeneration should persist after reload' },
    { assert: 'state.settings.showDefaultTemplates === false', message: 'showDefaultTemplates should persist after reload' },

    // Restore defaults to leave a clean state
    {
      id: 'restore_defaults',
      action: 'updateSettings',
      args: [{ inputMode: 'voice', autostartGeneration: false, showDefaultTemplates: true }],
      wait: 500,
    },

    // Verify restoration
    { assert: 'state.settings.inputMode === "voice"', message: 'inputMode should be restored to voice' },
    { assert: 'state.settings.autostartGeneration === false', message: 'autostartGeneration should be restored' },
    { assert: 'state.settings.showDefaultTemplates === true', message: 'showDefaultTemplates should be restored' },
  ],
});
