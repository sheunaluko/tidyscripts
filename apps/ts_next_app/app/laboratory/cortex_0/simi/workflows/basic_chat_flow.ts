import { defineWorkflow } from '../../../../../src/lib/simi';

export const basicChatFlow = defineWorkflow({
  id: 'basic_chat_flow',
  app: 'cortex_0',
  tags: ['smoke', 'chat'],
  steps: [
    // Wait for store to be initialized (settings loaded, agent ready)
    { waitFor: 'state.aiModel !== "" && state.agent !== null', timeout: 10000 },
    // Send a message via sendMessage (full user→AI cycle, awaitable)
    { action: 'sendMessage', args: ['What is 2 + 2?'], timeout: 30000, wait: 500 },
    // Assert response exists
    { assert: 'state.chatHistory.length > 2', message: 'Chat should have system + user + assistant messages' },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have responded' },
  ],
});
