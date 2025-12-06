# Dynamic Structured Completion for Cortex Functions

## Problem
The current Zod output schema is not granular enough for complex functions like `save_call_chain_template`. The LLM struggles to create properly structured call chain templates because `parameters: z.record(z.string())` flattens nested structure.

## Solution: Functions as First-Class Agents
Allow cortex functions to invoke their own structured completions with custom Zod schemas while retaining full context (function definitions, CortexRAM, etc.).

## Implementation Phases

### Phase 1: Parameterize System Message Template
Refactor `cortex_system_msg_template.ts` to accept output format instructions as a parameter rather than hardcoding the CortexOutput format.

```typescript
function build_system_prompt(ops: {
    functions: Function[],
    output_format_instructions: string,
    additional_instructions?: string
}): string
```

### Phase 2: Expose Structured Completion Utility
Add `run_structured_completion` to `ops.util`:

```typescript
util.run_structured_completion({
    schema: ZodSchema,
    schema_name: string,
    additional_system_instructions?: string,
    user_prompt: string
}) => Promise<z.infer<typeof schema>>
```

Functions can then invoke custom completions:

```typescript
// Example: save_call_chain_template
const template = await ops.util.run_structured_completion({
    schema: TemplateSchema,
    schema_name: 'CallChainTemplate',
    additional_system_instructions: 'Use &paramName for template params, $N for result refs...',
    user_prompt: ops.params.description
})
```

## Benefits
- Composability: any function can become "intelligent"
- Isolation: custom schemas don't pollute main output format
- Natural fit for complex tools needing specialized reasoning
