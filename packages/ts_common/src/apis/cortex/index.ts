/**
 * Cortex API - Platform-agnostic AI agent framework
 *
 * This package provides the core Cortex agent implementation that works
 * in both browser and Node.js environments via dependency injection.
 */

// Core classes and functions
export { Cortex } from './cortex'
export {
  get_function_dictionary,
  get_functions_string,
  generate_system_msg,
  get_variable_hash_id,
  extractJsonSchema,
  CortexOutputResponseFormat,
  CortexOutputSchema,
  CortexOutputSchemaName,
  CodeOutputResponseFormat,
  CodeOutputSchema,
  CodeOutputSchemaName
} from './cortex'

// Sandbox interface and types
export type {
  SandboxExecutor,
  SandboxResult,
  SandboxLog,
  SandboxEvent
} from './sandbox_interface'
export { DEFAULT_SANDBOX_TIMEOUT } from './sandbox_interface'

// Type definitions
export type {
  Provider,
  Function,
  FunctionCall,
  FunctionResult,
  CodeExecutionResult,
  UserInput,
  CortexOutput,
  CodeOutput,
  FunctionDictionary,
  SystemMessage,
  UserMessage,
  CortexMessage,
  IOMessage,
  IOMessages,
  CortexOps,
  CortexUtilities
} from './types'

// Channel for async communication
export { Channel } from './channel'

// Prompt management
export { buildPrompt, sections, syntax, codeOutputFormat, cortexOutputFormat, DEFAULT_CORTEX_SECTIONS, LEGACY_CORTEX_SECTIONS } from './cortex_prompt_blocks'
export type { SectionName, SectionArgs } from './cortex_prompt_blocks'

export { PromptManager } from './prompt_manager'
export type { SectionOverrides } from './prompt_manager'
