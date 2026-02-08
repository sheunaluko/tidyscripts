import { defineWorkflow } from '../../../../../src/lib/simi';

/**
 * Text Input Note Flow — e2e with text mode, note editing, and checkpoints
 *
 * Explicitly sets text input mode, generates a note, edits it to trigger
 * checkpoint tracking, and copies to clipboard. Tests the full text-mode
 * path that the existing full_note_flow doesn't cover.
 */
export const textInputNoteFlow = defineWorkflow({
  id: 'text_input_note_flow',
  app: 'rai',
  tags: ['e2e', 'note_generation', 'text_mode'],
  steps: [
    // Wait for templates to load (async init)
    { waitFor: 'state.templates.length > 0', timeout: 15000 },
    // Set text mode explicitly
    {
      id: 'set_text_mode',
      action: 'updateSettings',
      args: [{ inputMode: 'text' }],
      wait: 300,
    },
    { assert: 'state.settings.inputMode === "text"', message: 'Should be in text mode' },

    // Select first template and begin
    {
      action: 'selectTemplateAndBegin',
      args: [{ $resolve: 'find', path: 'templates', index: 0 }],
      wait: 500,
    },
    { assert: 'state.currentView === "information_input"', message: 'Should be on input view' },

    // Add multiple text entries
    {
      action: 'addInformationText',
      args: ['28yo G1P0 at 8 weeks gestation presenting for first prenatal visit. No prior medical history.'],
      wait: 200,
    },
    {
      action: 'addInformationText',
      args: ['Vitals: BP 118/72, HR 76, BMI 23. Labs: CBC normal, blood type O+, rubella immune.'],
      wait: 200,
    },
    {
      action: 'addInformationText',
      args: ['Plan: Start prenatal vitamins, schedule anatomy scan at 20 weeks, routine glucose screening at 24-28 weeks.'],
      wait: 200,
    },

    // Mark complete
    { action: 'setInformationComplete', args: [true], wait: 300 },
    {
      assert: 'state.collectedInformation.length === 3',
      message: 'Should have exactly 3 text entries',
    },

    // Navigate to generator
    { action: 'setCurrentView', args: ['note_generator'], wait: 500 },
    { assert: 'state.currentView === "note_generator"' },

    // Generate note (actual LLM call)
    { action: 'generateNote', args: [], timeout: 120000, wait: 500 },

    // Assert note generated
    {
      assert: 'state.generatedNote !== null && state.generatedNote.length > 0',
      message: 'Note should be generated with content',
    },

    // Simulate a note edit by setting a modified note (triggers checkpoint tracking)
    {
      id: 'edit_note',
      action: 'setGeneratedNote',
      args: [{ $resolve: 'eval', fn: (state: any) => state.generatedNote + '\n\n[Reviewed and approved]' }],
      wait: 300,
    },

    // Assert the edit took effect
    {
      assert: 'state.generatedNote.includes("[Reviewed and approved]")',
      message: 'Note should contain the edit',
    },

    // Copy final note to clipboard
    { action: 'copyToClipboard', args: [], wait: 300 },

    // Restore voice mode to leave clean state
    {
      id: 'restore_voice_mode',
      action: 'updateSettings',
      args: [{ inputMode: 'voice' }],
      wait: 300,
    },
  ],
});
