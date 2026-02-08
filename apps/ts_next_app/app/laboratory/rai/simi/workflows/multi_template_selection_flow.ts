import { defineWorkflow } from '../../../../../src/lib/simi';

/**
 * Multi-Template Selection Flow — navigation across templates
 *
 * Tests view routing and state resets when switching between templates.
 * Verifies that selecting a new template clears prior collected information
 * and that navigation transitions work correctly.
 */
export const multiTemplateSelectionFlow = defineWorkflow({
  id: 'multi_template_selection_flow',
  app: 'rai',
  tags: ['smoke', 'navigation'],
  steps: [
    // Wait for templates to load (async init)
    { waitFor: 'state.templates.length >= 2', timeout: 15000 },

    // Start with template picker
    { action: 'setCurrentView', args: ['template_picker'], wait: 300 },
    { assert: 'state.currentView === "template_picker"' },

    // Select first template and begin
    {
      id: 'select_template_a',
      action: 'selectTemplateAndBegin',
      args: [{ $resolve: 'find', path: 'templates', index: 0 }],
      wait: 500,
    },
    { assert: 'state.currentView === "information_input"', message: 'Should navigate to input' },
    { assert: 'state.selectedTemplateId !== null', message: 'Should have a selected template' },
    { assert: 'state.collectedInformation.length === 0', message: 'Info should be empty for fresh template' },

    // Add some information for template A
    {
      action: 'addInformationText',
      args: ['Test info entry for template A'],
      wait: 200,
    },
    { assert: 'state.collectedInformation.length === 1', message: 'Should have 1 entry' },

    // Navigate to generator to verify full forward path
    { action: 'setCurrentView', args: ['note_generator'], wait: 300 },
    { assert: 'state.currentView === "note_generator"' },

    // Go back to template picker
    { action: 'setCurrentView', args: ['template_picker'], wait: 300 },
    { assert: 'state.currentView === "template_picker"' },

    // Select second template — this should reset information
    {
      id: 'select_template_b',
      action: 'selectTemplateAndBegin',
      args: [{ $resolve: 'find', path: 'templates', index: 1 }],
      wait: 500,
    },
    { assert: 'state.currentView === "information_input"', message: 'Should navigate to input for template B' },
    {
      assert: 'state.collectedInformation.length === 0',
      message: 'Info should be reset when selecting a new template',
    },

    // Verify the selected template changed
    {
      assert: 'state.selectedTemplateId !== null',
      message: 'Should have a selected template',
    },

    // Navigate forward through the full view cycle
    { action: 'setCurrentView', args: ['note_generator'], wait: 300 },
    { assert: 'state.currentView === "note_generator"' },

    // Navigate to settings (lateral navigation)
    { action: 'setCurrentView', args: ['settings'], wait: 300 },
    { assert: 'state.currentView === "settings"' },

    // Navigate to test interface
    { action: 'setCurrentView', args: ['test_interface'], wait: 300 },
    { assert: 'state.currentView === "test_interface"' },

    // Navigate to manual
    { action: 'setCurrentView', args: ['manual'], wait: 300 },
    { assert: 'state.currentView === "manual"' },

    // Return to template picker
    { action: 'setCurrentView', args: ['template_picker'], wait: 300 },
    { assert: 'state.currentView === "template_picker"', message: 'Should return to template picker' },
  ],
});
