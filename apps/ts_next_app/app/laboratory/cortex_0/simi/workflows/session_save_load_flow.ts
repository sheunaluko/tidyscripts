import { defineWorkflow } from '../../../../../src/lib/simi';

export const sessionSaveLoadFlow = defineWorkflow({
  id: 'session_save_load_flow',
  app: 'cortex_0',
  tags: ['e2e', 'session', 'persistence'],
  steps: [
    // Wait for store + agent initialization
    { waitFor: 'state.agent !== null && state.aiModel !== ""', timeout: 10000 },

    // Switch to local storage so persistence works without Firebase auth
    { action: 'switchStorageMode', args: ['local'], timeout: 10000, wait: 500 },

    // Wait for agent to re-settle after mode switch (loadSettings triggers re-init)
    { waitFor: 'state.agent !== null && !state._llmActive', timeout: 15000 },

    // Send a message to populate chat history
    { action: 'sendMessage', args: ['The answer is forty-two'], timeout: 30000, wait: 500 },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have responded' },

    // Persist conversation to AppDataStore
    { action: 'saveConversation', args: [], timeout: 10000, wait: 500 },

    // Clear local state
    { action: 'clearChat', args: [], wait: 300 },
    { assert: 'state.chatHistory.length <= 1', message: 'Chat should only have system prompt after clear' },
    { assert: 'state.lastAiMessage === ""', message: 'lastAiMessage should be empty after clear' },

    // Reload from store — should restore the conversation
    { action: 'loadConversation', args: [], timeout: 10000, wait: 500 },
    { assert: 'state.chatHistory.length >= 3', message: 'Chat should be restored (system + user + assistant)' },
    { assert: 'state.chatHistory.some(m => m.role === "assistant" && m.content.length > 0)', message: 'Restored chat should contain an assistant message' },
  ],
});
