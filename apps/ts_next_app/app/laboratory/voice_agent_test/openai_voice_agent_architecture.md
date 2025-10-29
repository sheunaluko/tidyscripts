# OpenAI Voice Agent - Tools and Conversation History Architecture

**Source:** https://openai.github.io/openai-agents-js/guides/voice-agents/build/#tools

---

## Key Architectural Points Summary

### Tools Architecture

#### 1. **Tool Definition**
- Use `tool()` function with Zod schema validation
- Must specify: `name`, `description`, `parameters`, and `execute` function
- Tools are passed to agent via `tools` array during initialization

#### 2. **Execution Context**
- **Only function tools** are supported (no browser-based tools like file access)
- Tools execute **synchronously** and **block agent responsiveness**
- Execution location depends on where session runs (browser vs server)
- **Recommendation**: Sensitive operations should delegate to backend via HTTP

#### 3. **Tool Approval Pattern**
- Set `needsApproval: true` to require user approval before execution
- Emits `tool_approval_requested` event for UI handling
- Allows approve/reject flow before tool runs

#### 4. **Accessing Conversation in Tools**
- Tools can access conversation history via context parameter
- **Important limitation**: History is a snapshot - latest user transcription may not be available yet

### Conversation History Architecture

#### 1. **Automatic Management**
- `RealtimeSession` maintains history automatically
- Accessible via `session.history` property
- Updates trigger `history_updated` events

#### 2. **Modification Methods**
- Use `updateHistory()` with either:
  - Explicit array replacement
  - Functional filtering: `session.updateHistory((current) => current.filter(...))`

#### 3. **Known Limitations**
- Function tool calls **cannot be updated** after execution
- Text transcripts require **both text and transcription modalities** enabled
- Interrupted responses lack transcripts

### Best Practices

**Delegation Pattern**: For complex operations, combine conversation snapshots with tool calls to delegate to backend agents using different models (like `gpt-5-mini`), then return results through the realtime session. This avoids blocking the voice agent with heavy processing.

**Time-buying Strategy**: Have agents announce tool execution or use filler phrases to maintain natural conversation flow during blocking operations.

---

## Code Examples

### Basic Tool Definition

```typescript
import { tool } from '@openai/agents';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Return the weather for a city.',
  parameters: z.object({
    city: z.string()
  }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});

const agent = new RealtimeAgent({
  tools: [getWeather],
});
```

### Tool with Approval Requirement

```typescript
const sensitiveAction = tool({
  name: 'sensitive_action',
  description: 'Performs a sensitive operation',
  parameters: z.object({
    data: z.string()
  }),
  needsApproval: true, // Requires user approval before execution
  async execute({ data }) {
    // This will only run after user approves
    return `Processed: ${data}`;
  },
});

// Listen for approval requests
session.on('tool_approval_requested', (event) => {
  // Show UI for user to approve/reject
  // Then call: session.approveTool(toolCallId) or session.rejectTool(toolCallId)
});
```

### Accessing Conversation History in Tools

```typescript
const contextAwareTool = tool<typeof parameters, RealtimeContextData>({
  name: 'context_aware_action',
  description: 'Uses conversation history',
  parameters: z.object({
    query: z.string()
  }),
  async execute({ query }, details) {
    // Access conversation history
    const history: RealtimeItem[] = details?.context?.history ?? [];

    // Process history
    const previousMessages = history
      .filter(item => item.type === 'message')
      .map(item => item.content);

    return `Processed query: ${query} with ${history.length} items in history`;
  },
});
```

### Managing Conversation History

```typescript
// Access current history
const currentHistory = session.history;

// Listen for history updates
session.on('history_updated', (history) => {
  console.log('History updated:', history);
});

// Update history with functional filtering
session.updateHistory((currentHistory) => {
  // Remove specific items
  return currentHistory.filter(item =>
    item.type !== 'function_call_output' ||
    item.status === 'completed'
  );
});

// Replace history entirely
session.updateHistory([
  // new history items
]);
```

### Complete Agent Setup with Tools

```typescript
import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { tool } from '@openai/agents';
import { z } from 'zod';

// Define tools
const getWeather = tool({
  name: 'get_weather',
  description: 'Get weather for a city',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    // Could delegate to backend API here
    const response = await fetch(`/api/weather?city=${city}`);
    const data = await response.json();
    return data.weather;
  },
});

const searchDatabase = tool({
  name: 'search_database',
  description: 'Search internal database',
  parameters: z.object({
    query: z.string(),
    limit: z.number().optional()
  }),
  needsApproval: true, // Requires approval
  async execute({ query, limit = 10 }) {
    // Sensitive operation - requires user approval
    const response = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
    return await response.json();
  },
});

// Create agent with tools
const agent = new RealtimeAgent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant with access to weather and database.',
  tools: [getWeather, searchDatabase],
});

// Create session
const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
  config: {
    inputAudioFormat: 'pcm16',
    outputAudioFormat: 'pcm16',
    inputAudioTranscription: {
      model: 'whisper-1' // Enable transcription
    },
  },
});

// Connect
await session.connect({ apiKey: ephemeralKey });

// Handle tool approval requests
session.on('tool_approval_requested', (event) => {
  console.log('Tool needs approval:', event.tool_name);
  // Show UI, then:
  // session.approveTool(event.tool_call_id);
  // or
  // session.rejectTool(event.tool_call_id);
});

// Monitor history
session.on('history_updated', (history) => {
  console.log('Conversation history updated:', history.length, 'items');
});
```

### Delegation Pattern Example

```typescript
const complexAnalysis = tool({
  name: 'analyze_data',
  description: 'Performs complex data analysis',
  parameters: z.object({
    dataset: z.string(),
    analysisType: z.string()
  }),
  async execute({ dataset, analysisType }, details) {
    // Get conversation context
    const history = details?.context?.history ?? [];

    // Delegate to backend with different model
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset,
        analysisType,
        conversationContext: history, // Pass history for context
        model: 'gpt-5-mini', // Use different model on backend
      }),
    });

    const result = await response.json();

    // Return result to be spoken by voice agent
    return `Analysis complete: ${result.summary}`;
  },
});
```

### Session Configuration Options

```typescript
const session = new RealtimeSession(agent, {
  model: 'gpt-realtime',
  config: {
    // Audio formats
    inputAudioFormat: 'pcm16',
    outputAudioFormat: 'pcm16',

    // Enable transcription for text history
    inputAudioTranscription: {
      model: 'whisper-1'
    },

    // Voice activity detection
    turnDetection: {
      type: 'semantic_vad',
      eagerness: 'medium'
    },
  },

  // Output guardrails (async monitoring during response)
  outputGuardrails: [
    // Define guardrail rules
  ],

  outputGuardrailSettings: {
    debounceTextLength: 500
  },
});
```

---

## Important Notes

1. **Blocking Operations**: Tools run synchronously and block the agent. For long operations, have the agent announce "Let me check that for you" before execution.

2. **History Snapshot**: When tools access history via context, it's a snapshot. The latest user utterance transcription might not be available yet.

3. **Transcription Requirements**: To get text transcripts in history, you must enable both:
   - Text modality in session config
   - `inputAudioTranscription` with a model

4. **Tool Limitations**:
   - Cannot update function tool calls after execution
   - Interrupted responses won't have transcripts
   - Only function tools supported (not browser file access, etc.)

5. **Security**: Sensitive operations should either:
   - Use `needsApproval: true` for user confirmation
   - Delegate to backend with proper authentication/authorization

---

## Reference Links

- Main Guide: https://openai.github.io/openai-agents-js/guides/voice-agents/build/
- Tools Section: https://openai.github.io/openai-agents-js/guides/voice-agents/build/#tools
- Quickstart: https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/
