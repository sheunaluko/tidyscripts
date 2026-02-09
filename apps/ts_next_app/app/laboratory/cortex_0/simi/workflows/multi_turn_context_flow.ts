import { defineWorkflow } from '../../../../../src/lib/simi';

export const multiTurnContextFlow = defineWorkflow({
  id: 'multi_turn_context_flow',
  app: 'cortex_0',
  tags: ['e2e', 'chat', 'context'],
  steps: [
    // Wait for store + agent initialization
    { waitFor: 'state.agent !== null && state.aiModel !== ""', timeout: 10000 },

    // Establish a fact
    { action: 'sendMessage', args: ['My favorite programming language is Haskell. Just acknowledge this.'], timeout: 30000, wait: 500 },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have acknowledged' },

    // Verify context retention
    { action: 'sendMessage', args: ['What is my favorite programming language?'], timeout: 30000, wait: 500 },
    { assert: 'state.lastAiMessage.toLowerCase().includes("haskell")', message: 'AI should recall Haskell' },

    // Update the fact
    { action: 'sendMessage', args: ['Now change it — my favorite language is Rust. Acknowledge this.'], timeout: 30000, wait: 500 },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have acknowledged the change' },

    // Verify updated context
    { action: 'sendMessage', args: ['What is my favorite language now?'], timeout: 30000, wait: 500 },
    { assert: 'state.lastAiMessage.toLowerCase().includes("rust")', message: 'AI should recall Rust' },
  ],
});
