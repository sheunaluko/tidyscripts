import { defineWorkflow } from '../../../../../src/lib/simi';

export const codeExecutionFlow = defineWorkflow({
  id: 'code_execution_flow',
  app: 'cortex_0',
  tags: ['e2e', 'code', 'sandbox', 'execution'],
  steps: [
    // Wait for store + agent initialization
    { waitFor: 'state.agent !== null && state.aiModel !== ""', timeout: 10000 },

    // Ask agent to write and execute code
    { action: 'sendMessage', args: ['Write a JavaScript function that calculates the sum of numbers 1 through 10, display the code, then run it in the sandbox'], timeout: 60000, wait: 500 },

    // Wait for code to appear in display
    { waitFor: 'state.codeParams.code.length > 0', timeout: 15000 },

    // Wait for execution to finish
    { waitFor: 'state.executionStatus !== "running"', timeout: 30000 },

    // Assert execution completed and was captured
    { assert: 'state.executionStatus === "success" || state.executionStatus === "error"', message: 'Execution should have completed' },
    { assert: 'state.executionHistory.length > 0', message: 'Execution snapshot should be captured' },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have responded' },
  ],
});
