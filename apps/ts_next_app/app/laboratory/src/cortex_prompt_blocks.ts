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
    | 'additional'

export type SectionArgs = {
    intro?: [string]
    functions?: [FunctionInfo[]]
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

export const DEFAULT_CORTEX_SECTIONS: SectionName[] = [
    'intro',
    'cortexRAM',
    'callChains',
    'returnIndices',
    'outputFormat',
    'responseGuidance',
    'functions'
]
