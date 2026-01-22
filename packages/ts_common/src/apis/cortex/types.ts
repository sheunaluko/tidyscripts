/**
 * Cortex type definitions
 */

import { SandboxExecutor, SandboxEvent } from './sandbox_interface'

/* Provider types */
export type Provider = 'openai' | 'anthropic' | 'gemini'

/* Function types */
export type FunctionParameters = Record<string, any> | null
export type FunctionReturnType = any

export interface Function {
  description: string
  name: string
  parameters: FunctionParameters
  return_type: FunctionReturnType
  fn: (p: FunctionParameters) => FunctionReturnType
  enabled?: boolean
}

export interface FunctionCall {
  name: string
  parameters: FunctionParameters
}

export interface FunctionResult {
  name: string
  error: boolean | string
  result: FunctionReturnType
  events?: SandboxEvent[]
}

export interface CodeExecutionResult {
  name: string
  error: boolean | string
  result: FunctionReturnType
}

/* User input types */
export interface UserInput {
  kind: "text" | "CodeExecutionResult"
  text: string | null
  codeExecutionResult: CodeExecutionResult | null
}

/* Cortex output types */
export interface CortexOutput {
  thoughts: string
  calls: FunctionCall[]
  return_indeces: number[]
}

export interface CodeOutput {
  thoughts: string
  code: string
}

/* Function dictionary */
export type FunctionDictionary = {
  [key: string]: Function
}

/* Message types */
export interface SystemMessage {
  role: 'system'
  content: string
}

export interface UserMessage {
  role: 'user'
  content: string
}

export interface CortexMessage {
  role: 'assistant'
  content: string
}

export type IOMessage = UserMessage | CortexMessage
export type IOMessages = IOMessage[]

/* Platform-specific utilities */
export interface CortexUtilities {
  get_embedding?: (text: string) => Promise<number[]>  // Optional embedding function
  sounds?: {  // Optional sound feedback
    error: () => void
    activated: () => void
    ok: () => void
    success: () => void
  }
}

/* Cortex constructor options */
export interface CortexOps {
  model: string
  name: string
  functions: Function[]
  additional_system_msg: string
  provider?: Provider
  insights?: any
  sandbox: SandboxExecutor  // Required sandbox implementation
  apiBaseUrl?: string      // Optional API base URL (default: browser origin or production)
  utilities?: CortexUtilities  // Optional platform-specific utilities
}
