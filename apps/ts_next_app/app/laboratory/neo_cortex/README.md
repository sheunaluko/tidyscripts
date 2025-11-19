# Neo Cortex

Generic, configurable voice agent powered by OpenAI's Realtime API.

## Quick Start

1. The component comes with 2 example tools ready to use:
   - `getCurrentTime` - Get current date/time
   - `calculate` - Basic arithmetic

2. To add your own tools, open `neo_cortex.tsx` and find the **CUSTOM TOOLS SECTION** near the top of the file.

3. Define your tool:

```tsx
const myTool = tool({
  name: 'my_tool',
  description: 'What this tool does',
  parameters: z.object({
    param: z.string().describe('Parameter description'),
  }),
  async execute({ param }) {
    // Your implementation
    return 'Result';
  },
});
```

4. Add it to the `CUSTOM_TOOLS` array:

```tsx
const CUSTOM_TOOLS = [
  getCurrentTime,
  calculate,
  myTool, // <-- Add here
];
```

That's it! Your tool is now available to the voice agent.

## Full Documentation

See [USAGE.md](./USAGE.md) for:
- Complete examples
- Custom instructions
- Alternative methods for adding tools
- Props reference
- Advanced usage

## Files

- `neo_cortex.tsx` - Main component (add tools here)
- `page.tsx` - Page that renders the component
- `USAGE.md` - Complete documentation
- `README.md` - This file
