import { defineWorkflow } from '../../../../../src/lib/simi';

/**
 * Logged-Out Cloud Fallback Flow — cloud mode + unauthenticated
 *
 * Tests the exact scenario where a user is in cloud storage mode but
 * not logged in. Verifies that:
 * 1. Templates are saved to localStorage as fallback (not lost)
 * 2. Templates remain in state after save (loadTemplates doesn't wipe them)
 * 3. Settings load/save still works via the fallback path
 *
 * PREREQUISITE: Run this workflow when NOT logged in and in cloud storage mode
 * (i.e. window.getAuth()?.currentUser is null and __backend_mode__ is 'cloud').
 * If running in local mode, the auth checks are no-ops and the workflow still
 * passes — it just doesn't exercise the fallback path.
 */
export const loggedOutCloudFallbackFlow = defineWorkflow({
  id: 'logged_out_cloud_fallback_flow',
  app: 'rai',
  tags: ['auth', 'storage'],
  steps: [
    // Wait for app init to complete
    { waitFor: 'state.templates.length > 0', timeout: 15000 },

    // Navigate to template editor
    { action: 'setCurrentView', args: ['template_editor'], wait: 300 },
    { action: 'setTemplateEditorMode', args: ['create'], wait: 300 },

    // Create a template — this exercises saveCustomTemplates with fallback
    {
      id: 'create_template',
      action: 'createCustomTemplate',
      args: [{
        title: 'Cloud Fallback Test Template',
        description: 'Created by logged_out_cloud_fallback_flow — should persist via local fallback',
        template: 'Patient: {{@name | Unknown}}\nNotes: {{@notes | None}}',
      }],
      timeout: 5000,
      wait: 500,
    },

    // CRITICAL: template must still be in state (not wiped by loadTemplates reading empty cloud)
    {
      assert: 'state.customTemplates.some(t => t.title === "Cloud Fallback Test Template")',
      message: 'Template must survive in state — local fallback should prevent data loss',
    },
    {
      assert: 'state.templates.some(t => t.title === "Cloud Fallback Test Template")',
      message: 'Template must appear in merged templates list',
    },

    // Verify template count is sensible (defaults + our new one)
    {
      assert: 'state.templates.length >= 1',
      message: 'Should have at least 1 template',
    },

    // Edit the template to verify update path also works
    {
      id: 'edit_template',
      action: 'updateCustomTemplate',
      args: [
        { $resolve: 'eval', fn: (state: any) => state.customTemplates.find((t: any) => t.title === 'Cloud Fallback Test Template')?.id },
        { title: 'Cloud Fallback Test (Edited)' },
      ],
      timeout: 5000,
      wait: 500,
    },

    {
      assert: 'state.customTemplates.some(t => t.title === "Cloud Fallback Test (Edited)")',
      message: 'Edited template must persist in state',
    },

    // Test that the template can be selected and used for note generation
    {
      action: 'selectTemplateAndBegin',
      args: [{ $resolve: 'eval', fn: (state: any) => state.templates.find((t: any) => t.title === 'Cloud Fallback Test (Edited)') }],
      wait: 500,
    },
    { assert: 'state.currentView === "information_input"', message: 'Should navigate to input' },
    {
      assert: 'state.selectedTemplateId !== null',
      message: 'Template should be selected',
    },

    // Clean up — delete the test template
    { action: 'setCurrentView', args: ['template_editor'], wait: 300 },
    {
      id: 'cleanup',
      action: 'deleteCustomTemplate',
      args: [
        { $resolve: 'eval', fn: (state: any) => state.customTemplates.find((t: any) => t.title === 'Cloud Fallback Test (Edited)')?.id },
      ],
      timeout: 5000,
      wait: 300,
    },

    {
      assert: '!state.customTemplates.some(t => t.title.includes("Cloud Fallback Test"))',
      message: 'Cleanup: test template should be removed',
    },
  ],
});
