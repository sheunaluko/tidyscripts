import { defineWorkflow } from '../../../../../src/lib/simi';

/**
 * Template CRUD Flow — create, verify, edit, and delete a custom template
 *
 * Tests the full lifecycle of custom template management.
 * Works in both local and cloud (authenticated) modes.
 */
export const templateCrudFlow = defineWorkflow({
  id: 'template_crud_flow',
  app: 'rai',
  tags: ['smoke', 'templates'],
  steps: [
    // Wait for app init to complete
    { waitFor: 'state.templates.length > 0', timeout: 15000 },
    // Navigate to template editor in create mode
    { action: 'setCurrentView', args: ['template_editor'], wait: 300 },
    { action: 'setTemplateEditorMode', args: ['create'], wait: 300 },

    // Create a custom template
    {
      id: 'create_template',
      action: 'createCustomTemplate',
      args: [{
        title: 'Simi Test Template',
        description: 'Created by template_crud_flow workflow',
        template: 'Patient: {{@patient_name | Unknown}}\nDiagnosis: {{@diagnosis | Pending}}\nPlan: {{@plan | To be determined}}',
      }],
      wait: 500,
    },

    // Assert template exists in state
    {
      assert: 'state.customTemplates.some(t => t.title === "Simi Test Template")',
      message: 'Custom template should exist after creation',
    },
    {
      assert: 'state.templates.some(t => t.title === "Simi Test Template")',
      message: 'Template should appear in merged templates list',
    },

    // Switch to list mode to verify it shows up
    { action: 'setTemplateEditorMode', args: ['list'], wait: 300 },

    // Edit the template — find it by title and update
    {
      id: 'edit_template',
      action: 'updateCustomTemplate',
      args: [
        { $resolve: 'eval', fn: (state: any) => state.customTemplates.find((t: any) => t.title === 'Simi Test Template')?.id },
        { title: 'Simi Test Template (Edited)', description: 'Updated by template_crud_flow' },
      ],
      wait: 500,
    },

    // Assert edit persisted
    {
      assert: 'state.customTemplates.some(t => t.title === "Simi Test Template (Edited)")',
      message: 'Template title should be updated after edit',
    },
    {
      assert: '!state.customTemplates.some(t => t.title === "Simi Test Template")',
      message: 'Old template title should no longer exist',
    },

    // Delete the template
    {
      id: 'delete_template',
      action: 'deleteCustomTemplate',
      args: [
        { $resolve: 'eval', fn: (state: any) => state.customTemplates.find((t: any) => t.title === 'Simi Test Template (Edited)')?.id },
      ],
      wait: 500,
    },

    // Assert deletion
    {
      assert: '!state.customTemplates.some(t => t.title === "Simi Test Template (Edited)")',
      message: 'Template should be removed after deletion',
    },

    // Navigate back to template picker
    { action: 'setCurrentView', args: ['template_picker'], wait: 300 },
    { assert: 'state.currentView === "template_picker"' },
  ],
});
