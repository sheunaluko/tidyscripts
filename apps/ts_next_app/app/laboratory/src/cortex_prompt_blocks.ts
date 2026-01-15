/**
 * Composable building blocks for Cortex system prompts
 * Enables functions to invoke their own structured completions with custom schemas
 */

// ==================================================
// TYPES
// ==================================================

type FunctionInfo = {
    description: string
    name: string
    parameters: Record<string, any> | null
    return_type: any
}

export type SectionName =
    | 'intro'
    | 'cortexRAM'
    | 'callChains'
    | 'templateCallChains'
    | 'returnIndices'
    | 'responseGuidance'
    | 'functions'
    | 'outputFormat'
    | 'codeGeneration'
    | 'additional'

export type SectionArgs = {
    intro?: [string]
    functions?: [FunctionInfo[]]
    codeGeneration?: [FunctionInfo[]]
    outputFormat?: [string, string?]
    responseGuidance?: [string]
    additional?: [string]
}

// ==================================================
// REUSABLE SYNTAX FRAGMENTS
// ==================================================

export const syntax = {
    resultReferences: `
- Use "$0" to reference the result from the first call (index 0)
- Use "$1" to reference the result from the second call (index 1)
- And so on...

Please note that references ("$0", "$1" , "$N" as well as "@id") must exist as standalone strings within arrays or objects and NOT nested within another string. 

If you want to respond to the user with variable outputs please use the format string function first to construct the output.

`,
    cortexRAMReferences: `
- Use "@id" to reference a value stored in CortexRAM (e.g., "@dc5a7a9940da")
`,
    templateParamReferences: `
- Use "&paramName" to reference template parameters provided at runtime
`,
}

// ==================================================
// SECTION BLOCKS
// ==================================================

const header = (title: string) => `
==================================================
${title}
==================================================
`

export const sections: Record<SectionName, ((...args: any[]) => string) | string> = {

    intro: (agentName: string = 'Cortex') => `${header('INTRO')}
You are an AI agent named ${agentName} that interacts with users via structured data.
`,

    cortexRAM: `${header('CORTEX RAM')}
CortexRAM is a key-value store for persisting values across calls.

To reference a stored value, use the @id syntax where id is the returned identifier.
You can pass CortexRAM references as parameters to any function.
`,

    callChains: `${header('CALL CHAINS')}
You can execute multiple function calls in series, which is referred to as running a call chain.

IMPORTANT: All calls must be included in a single CortexOutput object's "calls" array. Never output multiple JSON objects. Use the $N syntax to reference results within the same calls array.

${syntax.resultReferences}
${syntax.cortexRAMReferences}
`,

    templateCallChains: `${header('CALL CHAINS IN TEMPLATES')}
When defining a call chain template, specify the sequence of calls that will execute when the template runs.

${syntax.resultReferences}
${syntax.templateParamReferences}
`,

    returnIndices: `${header('RETURN INDICES')}
Specify which results to return using the return_indeces field.
Use this to filter output to only the final result, or extract specific intermediate results.
`,

    responseGuidance: (guidance?: string) => `${header('RESPONSE GUIDANCE')}
${guidance ?? 'Follow the instructions exactly as described.'}
`,

    functions: (fns: FunctionInfo[]) => `${header('AVAILABLE FUNCTIONS')}
Below are the available functions in JSON format.
Use the description field to determine if a function should be used.

${JSON.stringify(fns, null, 2)}
`,

    outputFormat: (typeDefinition: string, examples?: string) => `${header('OUTPUT FORMAT')}
${typeDefinition}
${examples ? `\n${examples}` : ''}
`,

    codeGeneration: (fns: FunctionInfo[]) => `${header('CODE GENERATION')}
You generate JavaScript code that executes in a sandboxed environment.

All cortex functions are async and available in global scope. Call them directly in your code.

CRITICAL RULES:
1. Always call functions with a SINGLE OBJECT parameter containing named properties
   Example: await compute_embedding({text: "hello"})
   NOT: await compute_embedding("hello")

2. Use console.log() for debugging - all logs will be returned to you in the result
   Example: console.log("Processing query:", userQuery);

3. A 'workspace' object is available for persisting state between executions
   Example: workspace.counter = (workspace.counter || 0) + 1;

4. Always call respond_to_user({response: "message"}) to send output back to the user

5. IMPORTANT: Use UNQUALIFIED ASSIGNMENTS for variables (no const/let/var)
   This enables variable tracking in the UI for observability.
   CORRECT: query = "What is AI?";
   CORRECT: results = await retrieve_declarative_knowledge({query: query});
   WRONG: const query = "What is AI?";
   WRONG: let results = await retrieve_declarative_knowledge({query: query});

   Exception: You can use const/let/var inside function definitions if needed.

6. Write natural async JavaScript code with control flow, error handling, etc.

7. IMPORTANT - Seeing Data in Future Turns:
   This is a turn-based system. You CANNOT see the results of async operations in the same turn.

   To see data in the NEXT turn, you must:
   - Return it directly (the return value becomes the function result)
   - OR console.log() it (logs are included in the result)
   - OR store it in workspace (persists between turns)

   Example - Multi-turn pattern:
   // Turn 1: Execute query and return results to see them
   results = await retrieve_declarative_knowledge({query: "AI"});
   console.log("Query results:", results);
   return results;  // You'll see this in the next turn

   // Turn 2: Now you can respond with verified data
   // The previous result is in your context
   await respond_to_user({response: "Based on the results, ..."});

Available Functions:
${JSON.stringify(fns, null, 2)}

Example Code:
query = "What is AI?";
console.log("Searching knowledge graph for:", query);
results = await retrieve_declarative_knowledge({query: query});
console.log("Found results:", results.length);

if (results.length > 0) {
    await respond_to_user({response: \`Found \${results.length} results: \${JSON.stringify(results)}\`});
} else {
    await respond_to_user({response: "No results found for your query."});
}
`,

    additional: (msg: string) => `${header('ADDITIONAL INSTRUCTIONS')}
${msg}
`,
}

// ==================================================
// CORTEX OUTPUT FORMAT (for main agent)
// ==================================================

export const cortexOutputFormat = {
    types: `
You receive UserInput messages and return CortexOutput messages, defined in TypeScript as:

type CortexOutput = {
    thoughts: string,
    calls: FunctionCall[],
    return_indeces: number[]
}

type FunctionCall = {
    name: string,
    parameters: FunctionParameters
}

type FunctionParameters = (Record<string, any> | null)
`,
    examples: `
[Example] Responding to user with text "Sounds great!"
{
  thoughts: "ready to respond to the user",
  calls: [
    { name: "respond_to_user", parameters: { response: "Sounds great!" } }
  ],
  return_indeces: [0]
}

[Example] Get 5th value of the embedding of the text "hello"
This demonstrates referencing the result of a prior call using $N syntax:
{
  thoughts: "Need to use compute_embedding and then array_nth_value",
  calls: [
    { name: "compute_embedding", parameters: { text: "hello" } },
    { name: "array_nth_value", parameters: { a: "$0", n: 5 } }
  ],
  return_indeces: [1]
}

[Example] Log a value in CortexRAM
This shows how to reference a value in CortexRAM using @ syntax:
{
  thoughts: "Need to reference the value in RAM to log it",
  calls: [
    { name: "console_log", parameters: { data: "@dc5a7a9940da" } }
  ],
  return_indeces: [0]
}
`
}

// ==================================================
// CODE OUTPUT FORMAT (for code generation mode)
// ==================================================

export const codeOutputFormat = {
    types: `
You receive UserInput messages and return CodeOutput messages, defined in TypeScript as:

type CodeOutput = {
    thoughts: string,
    code: string
}
`,
    examples: `
[Example] Responding to user with text "Sounds great!"
{
  thoughts: "ready to respond to the user",
  code: "await respond_to_user({response: \\"Sounds great!\\"});"
}

[Example] Computing embedding and responding with its length
{
  thoughts: "Need to compute embedding of 'hello' and tell user the length",
  code: "text = \\"hello\\";\\nconsole.log(\\"Computing embedding for:\\", text);\\nembedding = await compute_embedding({text: text});\\nconsole.log(\\"Embedding length:\\", embedding.length);\\nawait respond_to_user({response: \`Embedding has \${embedding.length} dimensions\`});"
}

[Example] Multi-step workflow with error handling
{
  thoughts: "Search knowledge graph and handle potential errors",
  code: "try {\\n  query = \\"What is AI?\\";\\n  console.log(\\"Searching for:\\", query);\\n  results = await retrieve_declarative_knowledge({query: query});\\n  \\n  if (results.length > 0) {\\n    await respond_to_user({response: \`Found \${results.length} results\`});\\n  } else {\\n    await respond_to_user({response: \\"No results found\\"});\\n  }\\n} catch (error) {\\n  console.error(\\"Search failed:\\", error);\\n  await respond_to_user({response: \\"Sorry, search encountered an error\\"});\\n}"
}
`
}

// ==================================================
// PROMPT BUILDER
// ==================================================

export function buildPrompt(ops: {
    sections: SectionName[]
    sectionArgs?: SectionArgs
}): string {
    return ops.sections.map(name => {
        const section = sections[name]
        if (typeof section === 'function') {
            const args = ops.sectionArgs?.[name as keyof SectionArgs] ?? []
            return section(...args)
        }
        return section
    }).join('\n')
}

// ==================================================
// DEFAULT SECTIONS FOR MAIN CORTEX AGENT
// ==================================================

// Legacy sections (for backward compatibility)
export const LEGACY_CORTEX_SECTIONS: SectionName[] = [
    'intro',
    'cortexRAM',
    'callChains',
    'returnIndices',
    'outputFormat',
    'responseGuidance',
    'functions'
]

// New code generation sections (default)
export const DEFAULT_CORTEX_SECTIONS: SectionName[] = [
    'intro',
    'codeGeneration',
    'outputFormat',
    'responseGuidance'
]
