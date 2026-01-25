/**
 * Node.js VM-based Sandbox Implementation
 *
 * Provides isolated JavaScript execution using Node's vm module.
 * Implements the SandboxExecutor interface from common package.
 */

import * as vm from 'vm'
import * as tsc from 'tidyscripts_common'
import type { SandboxExecutor, SandboxResult, SandboxLog, SandboxEvent, SandboxRuntimeEvent } from 'tidyscripts_common'
const { DEFAULT_SANDBOX_TIMEOUT } = tsc.apis.cortex

/**
 * Logger for NodeSandbox
 */
const log = tsc.logger.get_logger({ id: 'NodeSandbox' })

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
  private eventStreamHandler: ((event: SandboxRuntimeEvent) => void) | undefined

  /**
   * Initialize persistent VM context
   */
  async initializePersistent(): Promise<void> {
    if (this.isInitialized && this.vmContext) {
      log('Already initialized')
      return
    }

    log('Initializing VM context...')

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
    log('Initialized successfully')
  }

  /**
   * Reset VM context, clearing all variables
   */
  async reset(): Promise<void> {
    log('Resetting VM context...')
    this.vmContext = null
    this.isInitialized = false
    await this.initializePersistent()
    log('Reset complete')
  }

  /**
   * Destroy VM context
   */
  destroy(): void {
    log('Destroying VM context...')
    this.vmContext = null
    this.isInitialized = false
    log('Destroyed')
  }

  /**
   * Setup real-time event stream for logs and events
   * Events are emitted synchronously during VM execution
   */
  setupEventStream(handler: (event: SandboxRuntimeEvent) => void): () => void {
    this.eventStreamHandler = handler

    return () => {
      this.eventStreamHandler = undefined
    }
  }

  /**
   * Wraps a function to emit observability events
   */
  private wrapFunctionWithTracking(
    fn: Function,
    name: string,
    events: SandboxEvent[],
    eventStreamHandler?: (event: SandboxRuntimeEvent) => void
  ): Function {
    return async (...args: any[]) => {
      const callId = Math.random().toString(36).substring(2, 11)
      const startTime = Date.now()

      // Emit function_start event
      const startEvent: SandboxEvent = {
        type: 'function_start',
        data: { name, args, callId },
        timestamp: startTime
      }
      events.push(startEvent)

      // Emit to stream handler if present
      if (eventStreamHandler) {
        eventStreamHandler({ type: 'event', payload: startEvent })
      }

      try {
        const result = await fn(...args)

        // Emit function_end event
        const endEvent: SandboxEvent = {
          type: 'function_end',
          data: {
            name,
            callId,
            duration: Date.now() - startTime,
            result
          },
          timestamp: Date.now()
        }
        events.push(endEvent)

        if (eventStreamHandler) {
          eventStreamHandler({ type: 'event', payload: endEvent })
        }

        return result

      } catch (error: any) {
        // Emit function_error event
        const errorEvent: SandboxEvent = {
          type: 'function_error',
          data: {
            name,
            callId,
            error: error.message || String(error)
          },
          timestamp: Date.now()
        }
        events.push(errorEvent)

        if (eventStreamHandler) {
          eventStreamHandler({ type: 'event', payload: errorEvent })
        }

        throw error
      }
    }
  }

  /**
   * Marks any in-flight function calls as errored when execution fails
   */
  private markActiveCallsAsErrored(events: SandboxEvent[], errorMessage: string): void {
    // Track which function calls have completed
    const completedCalls = new Set<string>()

    for (const event of events) {
      if (event.type === 'function_end' || event.type === 'function_error') {
        completedCalls.add(event.data.callId)
      }
    }

    // Find active (incomplete) function calls
    const activeCalls: Array<{name: string, callId: string}> = []
    for (const event of events) {
      if (event.type === 'function_start') {
        const callId = event.data.callId
        if (!completedCalls.has(callId)) {
          activeCalls.push({ name: event.data.name, callId })
        }
      }
    }

    // Mark active calls as errored
    for (const call of activeCalls) {
      events.push({
        type: 'function_error',
        data: {
          name: call.name,
          callId: call.callId,
          error: errorMessage
        },
        timestamp: Date.now()
      })
    }
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
      log(`Executing code (timeout: ${timeout}ms)`)

      // Wrap all context functions with event tracking
      const wrappedContext: Record<string, any> = {}

      for (const [key, value] of Object.entries(context)) {
        if (typeof value === 'function') {
          // Wrap function with tracking
          wrappedContext[key] = this.wrapFunctionWithTracking(
            value,
            key,
            events,
            this.eventStreamHandler
          )
        } else {
          // Pass through non-function values
          wrappedContext[key] = value
        }
      }

      // Create execution context by merging base context with wrapped user context
      const executionContext = vm.createContext({
        ...this.vmContext,
        ...wrappedContext,
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

      log('Execution successful')

      return {
        ok: true,
        data: result,
        executionId,
        logs,
        events,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      log(`Execution failed: ${error}`)

      // Mark any in-flight function calls as errored
      this.markActiveCallsAsErrored(events, error.message || String(error))

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
