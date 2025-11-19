# Neo Cortex - Generic Voice Agent

A generic, configurable voice agent powered by OpenAI's Realtime API.

## Features

- **Configurable System Prompts**: Customize both the agent's instructions and summarization prompts
- **Custom Tools Support**: Add your own tools/functions for the agent to call
- **In-File Tool Definition**: Define tools directly in the component file for easy management
- **Voice Conversation**: Real-time voice interaction with transcription
- **Auto Summary**: Automatically generates conversation summaries
- **Flexible Authentication**: Use backend token generation or provide your own ephemeral key

## Quick Start

The component comes with two example tools pre-configured:
- `getCurrentTime`: Returns the current date and time
- `calculate`: Performs basic arithmetic operations

Just use the component and the tools are ready:

```tsx
import NeoCortex from './neo_cortex';

export default function Page() {
  return <NeoCortex />;
}
```

## Adding Tools (In-File Method - Recommended)

The easiest way to add tools is directly in the `neo_cortex.tsx` file. Look for the "CUSTOM TOOLS SECTION" near the top of the file:

```tsx
// In neo_cortex.tsx, find the CUSTOM TOOLS SECTION and add:

const searchWikipedia = tool({
  name: 'search_wikipedia',
  description: 'Search Wikipedia for information on a topic',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  async execute({ query }) {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.extract || 'No information found';
  },
});

// Then add it to the CUSTOM_TOOLS array:
const CUSTOM_TOOLS = [
  getCurrentTime,
  calculate,
  searchWikipedia, // <-- Add your tool here
];
```

This is the recommended approach because:
- All tools are in one place
- Easy to enable/disable by adding/removing from the array
- No need to modify page.tsx or pass props
- Tools are automatically loaded

## Custom Instructions

```tsx
import NeoCortex from './neo_cortex';

const customInstructions = `You are a coding tutor helping students learn programming.
Be patient, explain concepts clearly, and provide examples.
Ask clarifying questions to understand the student's level.`;

export default function Page() {
  return (
    <NeoCortex
      defaultInstructions={customInstructions}
    />
  );
}
```

## Adding Tools (Props Method - Alternative)

If you prefer to keep tools outside the component file (e.g., in page.tsx), you can pass them via props:

```tsx
// In page.tsx
import NeoCortex from './neo_cortex';
import { tool } from '@openai/agents';
import { z } from 'zod';

// Define your custom tools
const getWeather = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name or zip code'),
  }),
  async execute({ location }) {
    // Your implementation here
    const weather = await fetchWeather(location);
    return `The weather in ${location} is ${weather.condition}, ${weather.temp}°F`;
  },
});

export default function Page() {
  return (
    <NeoCortex
      customTools={[getWeather]} // This will REPLACE the built-in tools
    />
  );
}
```

**Note**: When you pass `customTools` via props, it replaces the built-in `CUSTOM_TOOLS` array from the file. If you want to keep the built-in tools and add more, import them:

```tsx
// In page.tsx
import NeoCortex, { CUSTOM_TOOLS } from './neo_cortex'; // You'd need to export CUSTOM_TOOLS
import { tool } from '@openai/agents';
import { z } from 'zod';

const myTool = tool({ /* ... */ });

export default function Page() {
  return (
    <NeoCortex
      customTools={[...CUSTOM_TOOLS, myTool]} // Combine built-in + new tools
    />
  );
}
```

## Complete Example with All Options

```tsx
import NeoCortex from './neo_cortex';
import { tool } from '@openai/agents';
import { z } from 'zod';

const myTools = [
  tool({
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: z.object({
      expression: z.string().describe('Mathematical expression to evaluate'),
    }),
    async execute({ expression }) {
      try {
        const result = eval(expression); // Use a safe math parser in production!
        return `The result is ${result}`;
      } catch (error) {
        return 'Could not evaluate the expression';
      }
    },
  }),
];

const customInstructions = `You are a math tutor.
Help users solve math problems step by step.
Use the calculate tool when needed to verify answers.`;

const customSummary = `Summarize the math problems discussed and their solutions.
List any concepts the student struggled with.`;

export default function Page() {
  return (
    <NeoCortex
      customTools={myTools}
      defaultInstructions={customInstructions}
      defaultSummarizationPrompt={customSummary}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customTools` | `any[]` | `[]` | Array of custom tools created with `tool()` from `@openai/agents` |
| `defaultInstructions` | `string` | Generic assistant prompt | System prompt for the agent's behavior |
| `defaultSummarizationPrompt` | `string` | Generic summary prompt | Prompt used to generate conversation summary |

## Built-in Features

### Conversation Complete Tool
The agent has a built-in `conversation_complete` tool that triggers when the user says they're done (e.g., "I'm done", "that's all", "goodbye"). This automatically generates a summary.

### Manual Summary Generation
Users can also click the "Generate Summary" button at any time to create a summary of the conversation so far.

## Advanced Usage

You can also import the `start_agent` function directly for more control:

```tsx
import { start_agent } from './neo_cortex';

// Use in your own custom component
const myTools = [...];
const instructions = "...";
const onDone = () => console.log('Conversation complete');

const { agent, session } = await start_agent(
  undefined, // or provide ephemeral key
  instructions,
  onDone,
  myTools
);
```

## Notes

- Custom tools will be combined with the built-in `conversation_complete` tool
- The agent uses GPT-4 Realtime for voice and GPT-4o-mini for summarization
- WebRTC is used for audio streaming
- Conversation history is available via `window.session.history` for debugging
