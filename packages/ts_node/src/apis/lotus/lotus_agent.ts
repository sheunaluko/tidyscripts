/**
 * Lotus Agent - Local AI Agent for Node.js
 *
 * Creates a Cortex agent configured for local execution with
 * file system access, shell commands, and Node-specific utilities.
 */

import * as tsc from 'tidyscripts_common'
import type { Cortex } from 'tidyscripts_common'
const CortexClass = tsc.apis.cortex.Cortex
import { NodeSandbox } from './node_sandbox'
import { lotus_functions } from './functions'

/**
 * Create a Lotus agent instance with local functions
 *
 * @param modelName - LLM model to use (default: gpt-4o-mini)
 * @param insightsClient - Optional InsightsClient for tracking
 * @param apiBaseUrl - Base URL for API calls (default: https://www.tidyscripts.com)
 * @returns Configured Cortex instance
 */
export function get_lotus_agent(
  modelName: string = "gpt-4o-mini",
  insightsClient?: any,
  apiBaseUrl: string = "https://www.tidyscripts.com"
): Cortex {
  const sandbox = new NodeSandbox()

  // Node utilities (no embedding or sounds by default in CLI)
  const utilities = {
    get_embedding: undefined, // Can be added if needed
    sounds: {
      error: () => {},
      activated: () => {},
      ok: () => {},
      success: () => {}
    }
  }

  const agent = new CortexClass({
    model: modelName,
    name: "lotus",
    functions: lotus_functions,
    additional_system_msg: `
You are Lotus, a local AI agent running on the user's machine.

You have access to:
- Local file system (read, write, list, delete files and directories)
- Shell command execution
- Full JavaScript sandbox for computation

Guidelines:
- Always confirm before destructive operations (delete, overwrite files)
- Use absolute paths when possible for clarity
- Be mindful of security - avoid executing untrusted commands
- When executing shell commands, explain what they will do

Your responses go to the terminal/console, so be concise and clear.
    `,
    insights: insightsClient,
    sandbox,
    utilities,
    apiBaseUrl
  })

  return agent
}

/**
 * Configure user output for Lotus agent
 * Default: console.log with formatting
 *
 * @param agent - The Lotus agent instance
 * @param outputFn - Custom output function (optional)
 */
export function configure_lotus_output(
  agent: Cortex,
  outputFn?: (text: string) => void
) {
  agent.configure_user_output(outputFn || ((text: string) => {
    console.log(`\n[Lotus]: ${text}\n`)
  }))
}

/**
 * Configure custom embedding function for Lotus
 *
 * @param agent - The Lotus agent instance
 * @param embeddingFn - Function that returns embeddings for text
 */
export function configure_lotus_embedding(
  agent: Cortex,
  embeddingFn: (text: string) => Promise<number[]>
) {
  // Update utilities with embedding function
  ;(agent as any).utilities.get_embedding = embeddingFn
}
