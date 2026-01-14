/**
 * Sandboxed JavaScript Execution using Iframe Isolation
 *
 * This module provides secure, isolated JavaScript execution using a hidden
 * iframe with strict sandboxing attributes. Code executed in the sandbox
 * cannot access the DOM, localStorage, cookies, or any browser APIs unless
 * explicitly provided.
 *
 * @module sandbox
 */

import { getExecutor, type SandboxLog, type SandboxEvent } from './IframeSandbox'

/**
 * Log entry captured from sandbox
 */
export type { SandboxLog, SandboxEvent }

/**
 * Result of a sandboxed execution with observability
 */
export interface SandboxResult<T = any> {
  ok: boolean
  data?: T
  error?: string
  executionId: string
  logs: SandboxLog[]
  events: SandboxEvent[]
  duration?: number
}

/**
 * Options for sandboxed execution
 */
export interface SandboxExecutionOptions {
  timeout?: number                    // Execution timeout in milliseconds (default: 5000)
  context?: Record<string, any>       // Variables to inject into sandbox context
}

// Singleton initialization flag
let initialized = false

const DEFAULT_TIMEOUT = 5000 // 5 seconds

/**
 * Initializes the sandbox (one-time operation)
 *
 * This function is maintained for API compatibility but is essentially
 * a no-op for iframe-based sandboxing (no pre-initialization needed).
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeSandbox(): Promise<void> {
  if (initialized) {
    return // Already initialized
  }

  try {
    console.log('[Sandbox] Initializing iframe sandbox...')
    // Iframe sandbox doesn't need pre-initialization
    // Just set flag for compatibility
    initialized = true
    console.log('[Sandbox] Initialized successfully')
  } catch (error: any) {
    console.error('[Sandbox] Initialization failed:', error)
    throw new Error(`Failed to initialize sandbox: ${error.message}`)
  }
}

/**
 * Builds JavaScript code to inject context variables
 *
 * Serializes context object to JavaScript variable declarations.
 * Only serializable values are injected; functions and circular
 * references are skipped with warnings.
 *
 * @param context - Object containing variables to inject
 * @returns JavaScript code string with variable declarations
 */
function buildContextCode(context: Record<string, any>): string {
  const assignments: string[] = []

  for (const [key, value] of Object.entries(context)) {
    try {
      const serialized = JSON.stringify(value)
      assignments.push(`const ${key} = ${serialized};`)
    } catch (error: any) {
      console.warn(`[Sandbox] Cannot serialize context key "${key}":`, error.message)
    }
  }

  return assignments.join('\n')
}

/**
 * Evaluates JavaScript code in a secure sandboxed environment
 *
 * The code runs in complete isolation with no access to:
 * - Browser APIs (window, document, fetch, etc.)
 * - Node.js APIs (process, require, etc.)
 * - File system or network (unless explicitly enabled)
 *
 * @param code - JavaScript code to execute
 * @param options - Execution options (timeout, context)
 * @returns Promise resolving to SandboxResult with data or error
 *
 * @example
 * ```typescript
 * // Basic evaluation
 * const result = await evaluateJavaScriptSandboxed('2 + 2')
 * console.log(result) // { ok: true, data: 4 }
 *
 * // With context injection
 * const result = await evaluateJavaScriptSandboxed('x + y', {
 *   context: { x: 10, y: 20 }
 * })
 * console.log(result) // { ok: true, data: 30 }
 *
 * // Error handling
 * const result = await evaluateJavaScriptSandboxed('throw new Error("test")')
 * console.log(result) // { ok: false, error: "..." }
 * ```
 */
export async function evaluateJavaScriptSandboxed(
  code: string,
  options: SandboxExecutionOptions = {}
): Promise<SandboxResult> {
  try {
    // Ensure sandbox is initialized
    await initializeSandbox()

    const timeout = options.timeout ?? DEFAULT_TIMEOUT
    const context = options.context ?? {}

    console.log(`[Sandbox] Executing code (timeout: ${timeout}ms)`)

    // Execute in iframe sandbox
    const executor = getExecutor()
    const result = await executor.execute(code, context, timeout)

    if (result.ok) {
      console.log('[Sandbox] Execution successful')
    }

    return result

  } catch (error: any) {
    console.error('[Sandbox] Execution failed:', error)
    return {
      ok: false,
      error: `Sandbox execution failed: ${error.message || String(error)}`
    }
  }
}

/**
 * Updates a workspace object using sandboxed JavaScript code
 *
 * This function creates an isolated copy of the workspace, executes
 * code against it, and returns the modified workspace. The original
 * workspace is never directly modified.
 *
 * The code should reference and manipulate a `workspace` variable,
 * which will be automatically injected into the sandbox context.
 *
 * @param code - JavaScript code that manipulates the workspace variable
 * @param workspace - Current workspace object to update
 * @param options - Execution options (timeout only, context is auto-set)
 * @returns Promise resolving to SandboxResult with updated workspace or error
 *
 * @example
 * ```typescript
 * const workspace = { count: 0 }
 * const result = await updateWorkspaceSandboxed(
 *   'workspace.count++',
 *   workspace
 * )
 * console.log(result) // { ok: true, data: { count: 1 } }
 * ```
 */
export async function updateWorkspaceSandboxed(
  code: string,
  workspace: any,
  options: Omit<SandboxExecutionOptions, 'context'> = {}
): Promise<SandboxResult> {
  try {
    // Create isolated copy of workspace
    const workspaceCopy = structuredClone(workspace)

    // Wrap code to return workspace after execution
    const wrappedCode = `
${code}
workspace; // Return modified workspace
`

    return await evaluateJavaScriptSandboxed(wrappedCode, {
      ...options,
      context: { workspace: workspaceCopy }
    })

  } catch (error: any) {
    console.error('[Sandbox] Workspace update failed:', error)
    return {
      ok: false,
      error: `Workspace update failed: ${error.message || String(error)}`
    }
  }
}

// Auto-initialize on module load for better performance
if (typeof window !== 'undefined') {
  // Warm up the sandbox in the background
  initializeSandbox().catch(err => {
    console.warn('[Sandbox] Background initialization failed:', err)
  })
}
