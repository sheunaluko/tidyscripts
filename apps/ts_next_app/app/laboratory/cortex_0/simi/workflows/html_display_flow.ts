import { defineWorkflow } from '../../../../../src/lib/simi';

export const htmlDisplayFlow = defineWorkflow({
  id: 'html_display_flow',
  app: 'cortex_0',
  tags: ['e2e', 'html'],
  steps: [
    // Wait for store + agent initialization
    { waitFor: 'state.agent !== null && state.aiModel !== ""', timeout: 10000 },

    // Ask agent to render HTML
    { action: 'sendMessage', args: ['Display an HTML page with a blue heading that says "Simi Test" using display_html'], timeout: 30000, wait: 500 },

    // Wait for HTML to appear
    { waitFor: 'state.htmlDisplay.length > 0', timeout: 15000 },

    // Assert HTML was rendered
    { assert: 'state.htmlDisplay.includes("Simi Test") || state.htmlDisplay.length > 50', message: 'HTML should contain test content or be substantial' },
    { assert: 'state.lastAiMessage.length > 0', message: 'AI should have responded' },
  ],
});
