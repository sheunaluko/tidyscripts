/**
 * Sandboxed JavaScript Execution using QuickJS WASM
 *
 * This module provides secure, isolated JavaScript execution using the QuickJS
 * WebAssembly engine. Code executed in the sandbox cannot access the DOM,
 * localStorage, cookies, or any browser APIs unless explicitly provided.
 *
 * @module sandbox
 */

import variant from "@jitl/quickjs-ng-wasmfile-release-sync"
import { loadQuickJs, type SandboxOptions } from "@sebastianwessel/quickjs"

/**
 * Result of a sandboxed execution
 */
export interface SandboxResult<T = any> {
  ok: boolean
  data?: T
  error?: string
}

/**
 * Options for sandboxed execution
 */
export interface SandboxExecutionOptions {
  timeout?: number                    // Execution timeout in milliseconds (default: 5000)
  context?: Record<string, any>       // Variables to inject into sandbox context
}

// Singleton QuickJS instance
let sandboxInstance: any = null
let initPromise: Promise<void> | null = null

const DEFAULT_TIMEOUT = 5000 // 5 seconds

/**
 * Initializes the QuickJS sandbox (one-time operation)
 *
 * This function loads the QuickJS WASM module and caches it for reuse.
 * It's automatically called by execution functions, but can be called
 * manually to preload the sandbox during app initialization.
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeSandbox(): Promise<void> {
  if (sandboxInstance) {
    return // Already initialized
  }

  if (initPromise) {
    return initPromise // Currently initializing
  }

  initPromise = (async () => {
    try {
      console.log('[Sandbox] Initializing QuickJS...')
      const { runSandboxed } = await loadQuickJs(variant)
      sandboxInstance = runSandboxed
      console.log('[Sandbox] Initialized successfully')
    } catch (error: any) {
      console.error('[Sandbox] Initialization failed:', error)
      throw new Error(`Failed to initialize QuickJS sandbox: ${error.message}`)
    }
  })()

  return initPromise
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
    const contextCode = buildContextCode(options.context ?? {})
    const fullCode = contextCode ? `${contextCode}\n${code}` : code

    console.log(`[Sandbox] Executing code (timeout: ${timeout}ms)`)

    // Execute in sandbox with timeout
    const result = await sandboxInstance(
      async ({ evalCode }: any) => evalCode(fullCode),
      {
        timeout,
        allowFetch: false,  // Block network access
        allowFs: false,     // Block filesystem access
        env: {}
      } as SandboxOptions
    )

    console.log('[Sandbox] Execution successful')
    return { ok: true, data: result.data }

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
