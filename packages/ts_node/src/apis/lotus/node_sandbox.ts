/**
 * Node.js VM-based Sandbox Implementation
 *
 * Provides isolated JavaScript execution using Node's vm module.
 * Implements the SandboxExecutor interface from common package.
 */

import * as vm from 'vm'
import * as tsc from 'tidyscripts_common'
import type { SandboxExecutor, SandboxResult, SandboxLog, SandboxEvent } from 'tidyscripts_common'
const { DEFAULT_SANDBOX_TIMEOUT } = tsc.apis.cortex

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Node.js VM-based sandbox executor
 * Uses vm.createContext for isolated code execution
 */
export class NodeSandbox implements SandboxExecutor {
  private vmContext: vm.Context | null = null
  private isInitialized: boolean = false

  /**
   * Initialize persistent VM context
   */
  async initializePersistent(): Promise<void> {
    if (this.isInitialized && this.vmContext) {
      console.log('[NodeSandbox] Already initialized')
      return
    }

    console.log('[NodeSandbox] Initializing VM context...')

    // Create context with safe built-ins only
    this.vmContext = vm.createContext({
      // Safe JavaScript built-ins
      console: {
        log: (...args: any[]) => console.log('[Sandbox]', ...args),
        error: (...args: any[]) => console.error('[Sandbox]', ...args),
        warn: (...args: any[]) => console.warn('[Sandbox]', ...args),
        info: (...args: any[]) => console.info('[Sandbox]', ...args)
      },
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      RegExp,
      Error,
      JSON,
      Promise,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      // Allow structuredClone for workspace handling
      structuredClone: (obj: any) => JSON.parse(JSON.stringify(obj))
    })

    this.isInitialized = true
    console.log('[NodeSandbox] Initialized successfully')
  }

  /**
   * Reset VM context, clearing all variables
   */
  async reset(): Promise<void> {
    console.log('[NodeSandbox] Resetting VM context...')
    this.vmContext = null
    this.isInitialized = false
    await this.initializePersistent()
    console.log('[NodeSandbox] Reset complete')
  }

  /**
   * Destroy VM context
   */
  destroy(): void {
    console.log('[NodeSandbox] Destroying VM context...')
    this.vmContext = null
    this.isInitialized = false
    console.log('[NodeSandbox] Destroyed')
  }

  /**
   * Execute JavaScript code in VM context
   */
  async execute(
    code: string,
    context: Record<string, any> = {},
    timeout: number = DEFAULT_SANDBOX_TIMEOUT
  ): Promise<SandboxResult> {
    // Initialize if needed
    if (!this.isInitialized) {
      await this.initializePersistent()
    }

    const startTime = Date.now()
    const executionId = generateExecutionId()
    const logs: SandboxLog[] = []
    const events: SandboxEvent[] = []

    try {
      console.log(`[NodeSandbox] Executing code (timeout: ${timeout}ms)`)

      // Create execution context by merging base context with user context
      const executionContext = vm.createContext({
        ...this.vmContext,
        ...context,
        // Override console to capture logs
        console: {
          log: (...args: any[]) => {
            console.log('[Sandbox]', ...args)
            logs.push({ level: 'log', args, timestamp: Date.now() })
          },
          error: (...args: any[]) => {
            console.error('[Sandbox]', ...args)
            logs.push({ level: 'error', args, timestamp: Date.now() })
          },
          warn: (...args: any[]) => {
            console.warn('[Sandbox]', ...args)
            logs.push({ level: 'warn', args, timestamp: Date.now() })
          },
          info: (...args: any[]) => {
            console.info('[Sandbox]', ...args)
            logs.push({ level: 'info', args, timestamp: Date.now() })
          }
        }
      })

      // Wrap code to handle workspace return (same pattern as IframeSandbox)
      const wrappedCode = `
(async () => {
  const __userResult = await (async () => {
    ${code}
  })()
  return { __userResult, __workspace: workspace }
})()
`

      // Compile script
      const script = new vm.Script(wrappedCode, {
        filename: 'sandbox.js'
      })

      // Execute with timeout using Promise.race
      const executePromise = script.runInContext(executionContext, {
        timeout,
        breakOnSigint: true
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Sandbox execution timeout after ${timeout}ms`))
        }, timeout)
      })

      const result = await Promise.race([executePromise, timeoutPromise])

      console.log('[NodeSandbox] Execution successful')

      return {
        ok: true,
        data: result,
        executionId,
        logs,
        events,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      console.error('[NodeSandbox] Execution failed:', error)

      return {
        ok: false,
        error: error.message || String(error),
        executionId,
        logs,
        events,
        duration: Date.now() - startTime
      }
    }
  }
}

/**
 * Singleton instance
 */
let executorInstance: NodeSandbox | null = null

/**
 * Get or create singleton executor
 */
export function getExecutor(): NodeSandbox {
  if (!executorInstance) {
    executorInstance = new NodeSandbox()
  }
  return executorInstance
}
