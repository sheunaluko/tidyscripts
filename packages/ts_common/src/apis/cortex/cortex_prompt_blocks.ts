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
    | 'dynamicFunctions'
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

    dynamicFunctions: `${header('DYNAMIC FUNCTIONS')}
Dynamic functions are reusable JavaScript functions stored in the database which you have access to.
These are noted here again and pay special attention to
run_dynamic_function which was not noted previously. 

Functions available:
- create_dynamic_function({name, description, code, params_schema})
- load_dynamic_function({name})
- list_dynamic_functions()
- update_dynamic_function({name, code?, description?, params_schema?})
- delete_dynamic_function({name})

One special function is:
- run_dynamic_function({name, args})
This is available as well and should be used to run a dynamic function 

Code format:
- Named async function: async function my_func(args) { ... }
- Takes single args object parameter
- Has access to all cortex functions 
- Use destructuring: const {text, category} = args;

Example:
async function embed_and_store(args) {
  const {text, category} = args;
  const embedding = await compute_embedding({text});
  return await access_database_with_surreal_ql({
    query: 'INSERT INTO logs {text: $text, category: $category, embedding: $emb}',
    variables: {text, category, emb: embedding}
  });
}

Data does not automatically persist between execution turns unless explicitly returned or stored in the workspace.
1. The 'Return' Requirement
To access the result of an asynchronous operation (like accumulate_text or retrieve_declarative_knowledge) in the next turn, the current script must include a return statement for that value.

// Turn 1
result = await some_async_function();
return result; // Required to populate 'last_result' in Turn 2

// Turn 2
console.log(last_result); // Accessing the data
2. Avoiding the 'Null Turn'
If a script concludes with respond_to_user but does not return a value, last_result will be null in the subsequent turn. This clears the chain of logic.

3. Workspace vs. Last Result
Workspace: Use for long-term state that needs to survive multiple turns without manual passing.
Last Result: Use for sequential function outputs where the immediate next turn depends on the current turn's findings.

IMPORTANT: if you encounter an error with code execution PLEASE STOP EXECUTION AND NOTIFY the user rather than trying to re-run the code 

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

2. You can use console.log() for debugging - all logs will be returned to you in the result
   Example: console.log("Processing query:", userQuery);

3. A 'workspace' object is available for persisting state between executions
   Example: workspace.counter = (workspace.counter || 0) + 1;

4. A 'last_result' variable contains the result from the previous code execution
   - On the first execution, last_result is null
   - Use this to reference previous computation results
   Example: if (last_result) { console.log("Previous result was:", last_result); }

5. You can call respond_to_user({response: "message"}) to send output back to the user.
   If you do this at the end then we will assume you are done computing.

   CRITICAL RULE: Never call respond_to_user in the same turn as other function calls!

   You CANNOT see the results of function calls until the NEXT turn. If you call
   respond_to_user in the same turn, you're composing a response BEFORE knowing what
   the functions returned - this leads to generic, unhelpful responses.

   BAD (responding before seeing results):
     results = await retrieve_declarative_knowledge({query: "AI"});
     await respond_to_user({response: "I found some relevant information about AI."});
     // ^ You wrote this response BEFORE seeing what 'results' contains!

   GOOD (return data, respond next turn):
     // Turn 1: Execute and return
     results = await retrieve_declarative_knowledge({query: "AI"});
     return results;

     // Turn 2: Now you've SEEN the results in your context, respond accurately
     await respond_to_user({response: "I found 3 entries about AI: ..."});

   The ONLY exception is simple acknowledgments like "Starting the task now..."
   followed by actual work, where you're not claiming to know any results


6. IMPORTANT: Use UNQUALIFIED ASSIGNMENTS for variables (no const/let/var)
   This enables variable tracking in the UI for observability.
   CORRECT: query = "What is AI?";
   CORRECT: results = await retrieve_declarative_knowledge({query: query});
   WRONG: const query = "What is AI?";
   WRONG: let results = await retrieve_declarative_knowledge({query: query});

   Exception: You can use const/let/var inside function definitions IF NEEDED

7. Write natural async JavaScript code with control flow, error handling, etc.

8. IMPORTANT - Turn-Based Execution:
   This is a turn-based system. You CANNOT see results until the NEXT turn.

   ALWAYS use this pattern when calling functions:

   // Turn 1: Execute and return (DO NOT respond yet)
   results = await retrieve_declarative_knowledge({query: "AI"});
   return results;

   // Turn 2: Use last_result to access previous data, then respond accurately
   await respond_to_user({response: "I found " + last_result.length + " entries about AI."});

   To pass data to the next turn:
   - Return it directly (becomes last_result in next turn)
   - Store in workspace (persists across multiple turns)
   - Use console.log() only for ancillary debug info, not the main return value

   NEVER call respond_to_user in the same turn as other function calls.
   You must SEE the data before you can accurately describe it to the user 

Available Functions:
${JSON.stringify(fns, null, 2)}


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
[Example] Simple response (no function calls needed)
{
  thoughts: "User greeted me, responding directly",
  code: "await respond_to_user({response: \\"Sounds great!\\"});"
}

[Example] Turn 1 - Execute function and return results (DO NOT respond yet)
{
  thoughts: "Need to list available functions first. Will return results and respond next turn after seeing them.",
  code: "functions = await list_dynamic_functions();\\nreturn functions;"
}

[Example] Turn 2 - Use last_result to access previous data, then respond accurately
{
  thoughts: "I can see last_result contains 5 dynamic functions. Now I can give an accurate response.",
  code: "names = last_result.map(f => f.name);\\nawait respond_to_user({response: \\"You have \\" + names.length + \\" dynamic functions: \\" + names.join(\\", \\")});"
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
    'dynamicFunctions', 
    'outputFormat',
    'responseGuidance'
]
