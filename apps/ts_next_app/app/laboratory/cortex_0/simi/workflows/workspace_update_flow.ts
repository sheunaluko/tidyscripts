import { defineWorkflow } from '../../../../../src/lib/simi';

export const workspaceUpdateFlow = defineWorkflow({
  id: 'workspace_update_flow',
  app: 'cortex_0',
  tags: ['e2e', 'workspace'],
  steps: [
    // Wait for store + agent initialization
    { waitFor: 'state.agent !== null && state.aiModel !== ""', timeout: 10000 },

    // Ask agent to update the workspace
    { action: 'sendMessage', args: ['Store the following in the workspace: key "test_value" with value 42, and key "test_name" with value "simi"'], timeout: 30000, wait: 500 },

    // Wait for workspace to be populated
    { waitFor: 'Object.keys(state.workspace).length > 0', timeout: 15000 },

    // Assert workspace was updated
    { assert: 'state.workspace !== null && typeof state.workspace === "object"', message: 'Workspace should be a non-null object' },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have responded' },
  ],
});
