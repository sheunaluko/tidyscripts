/**
 * Iframe-Based Secure JavaScript Sandbox with Observability
 *
 * Provides isolated JavaScript execution using hidden iframe with strict
 * sandboxing attributes, postMessage communication, and comprehensive
 * observability tracking.
 *
 * @module IframeSandbox
 */

/**
 * Log entry captured from sandbox
 */
export interface SandboxLog {
  level: 'log' | 'error' | 'warn' | 'info'
  args: any[]
  timestamp: number
}

/**
 * Event emitted during sandbox execution
 */
export interface SandboxEvent {
  type: string
  data: any
  timestamp: number
}

/**
 * Result of sandboxed iframe execution with observability
 */
export interface IframeSandboxResult<T = any> {
  ok: boolean
  data?: T
  error?: string
  executionId: string
  logs: SandboxLog[]
  events: SandboxEvent[]
  duration?: number
}

/**
 * Default execution timeout: 1 hour (3,600,000 milliseconds)
 */
export const DEFAULT_SANDBOX_TIMEOUT = 60 * 60 * 1000;

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Iframe-based JavaScript sandbox executor
 *
 * Uses hidden iframe with null origin for isolation, postMessage for
 * cross-origin communication, proxy membrane for controlled access,
 * and comprehensive observability tracking.
 */
export class IframeSandboxExecutor {
  private iframe: HTMLIFrameElement | null = null
  private persistentIframe: HTMLIFrameElement | null = null
  private executionId: string | null = null
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private isInitialized: boolean = false

  /**
   * Initializes persistent iframe for reuse across executions
   */
  async initializePersistent(): Promise<void> {
    if (this.isInitialized && this.persistentIframe) {
      console.log('[Sandbox] Already initialized, skipping')
      return
    }

    console.log('[Sandbox] Initializing persistent iframe...')

    // Create persistent iframe
    this.persistentIframe = document.createElement('iframe')
    this.persistentIframe.setAttribute('sandbox', 'allow-scripts')
    this.persistentIframe.style.display = 'none'

    // Initialize with empty document
    this.persistentIframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>`

    // Append to DOM
    document.body.appendChild(this.persistentIframe)

    // Wait for iframe to load
    await new Promise<void>((resolve) => {
      this.persistentIframe!.onload = () => resolve()
    })

    this.isInitialized = true
    console.log('[Sandbox] Persistent iframe initialized')
  }

  /**
   * Resets the sandbox environment, clearing all variables but keeping iframe alive
   */
  async reset(): Promise<void> {
    console.log('[Sandbox] Resetting sandbox environment...')

    if (!this.persistentIframe || !this.isInitialized) {
      console.warn('[Sandbox] Not initialized, nothing to reset')
      return
    }

    // Reload iframe to clear all state
    if (this.persistentIframe.contentWindow) {
      this.persistentIframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>`

      // Wait for reload
      await new Promise<void>((resolve) => {
        this.persistentIframe!.onload = () => resolve()
      })
    }

    console.log('[Sandbox] Sandbox environment reset')
  }

  /**
   * Destroys the persistent iframe completely
   */
  destroy(): void {
    console.log('[Sandbox] Destroying persistent iframe...')

    if (this.persistentIframe && this.persistentIframe.parentNode) {
      this.persistentIframe.parentNode.removeChild(this.persistentIframe)
    }
    this.persistentIframe = null
    this.isInitialized = false

    console.log('[Sandbox] Persistent iframe destroyed')
  }

  /**
   * Executes JavaScript code in persistent isolated iframe sandbox
   *
   * @param code - JavaScript code to execute
   * @param context - Variables and functions to inject
   * @param timeout - Execution timeout in milliseconds
   * @returns Promise resolving to execution result with observability data
   */
  async execute(
    code: string,
    context: Record<string, any> = {},
    timeout: number = DEFAULT_SANDBOX_TIMEOUT
  ): Promise<IframeSandboxResult> {
    // Initialize if not already done
    if (!this.isInitialized) {
      await this.initializePersistent()
    }

    const startTime = Date.now()
    this.executionId = generateExecutionId()

    // Use persistent iframe
    this.iframe = this.persistentIframe

    // Observability collectors
    const logs: SandboxLog[] = []
    const events: SandboxEvent[] = []

    try {
      // Build execution promise with postMessage communication
      const executionPromise = this.executeInIframe(code, context, logs, events)

      // Build timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Sandbox execution timeout after ${timeout}ms`))
        }, timeout)
      })

      // Race execution against timeout
      const result = await Promise.race([executionPromise, timeoutPromise])

      return {
        ok: true,
        data: result,
        executionId: this.executionId,
        logs,
        events,
        duration: Date.now() - startTime
      }

    } catch (error: any) {
      console.error('[Sandbox] Execution failed:', error)

      // Mark any in-flight function calls as errored
      this.markActiveCallsAsErrored(events, error.message || String(error))

      return {
        ok: false,
        error: error.message || String(error),
        executionId: this.executionId,
        logs,
        events,
        duration: Date.now() - startTime
      }
    } finally {
      // Cleanup message listener only (keep iframe alive)
      this.cleanupExecution()
    }
  }

  /**
   * Executes code in iframe with postMessage communication
   */
  private async executeInIframe(
    code: string,
    context: Record<string, any>,
    logs: SandboxLog[],
    events: SandboxEvent[]
  ): Promise<any> {
    const executionId = this.executionId!

    return new Promise((resolve, reject) => {
      // Setup message handler for this execution
      this.messageHandler = (event: MessageEvent) => {
        // Only process messages for this execution
        if (event.data.executionId !== executionId) {
          return
        }

        const { type, payload } = event.data

        switch (type) {
          case 'success':
            resolve(payload)
            break

          case 'error':
            reject(new Error(payload))
            break

          case 'log':
            logs.push(payload)
            break

          case 'event':
            events.push(payload)
            break

          case 'functionCall':
            // Execute function in parent context and send result back
            this.handleFunctionCall(payload, context, executionId)
            break
        }
      }

      window.addEventListener('message', this.messageHandler)

      // Build iframe srcdoc with embedded code
      const srcdoc = this.buildSrcDoc(code, context, executionId)

      // Inject code into persistent iframe
      if (!this.iframe) {
        reject(new Error('Persistent iframe not available'))
        return
      }

      this.iframe.srcdoc = srcdoc

      // Handle iframe load errors
      this.iframe.onerror = (error) => {
        reject(new Error(`Iframe load failed: ${error}`))
      }
    })
  }

  /**
   * Handles function call requests from iframe
   */
  private async handleFunctionCall(
    payload: { name: string; args: any[]; callId: string },
    context: Record<string, any>,
    executionId: string
  ): Promise<void> {
    const { name, args, callId } = payload

    try {
      // Execute function in parent context
      const fn = context[name]
      if (typeof fn !== 'function') {
        throw new Error(`Context function '${name}' not found`)
      }

      const result = await fn(...args)

      // Send result back to iframe
      if (this.iframe?.contentWindow) {
        this.iframe.contentWindow.postMessage({
          executionId,
          callId,
          type: 'functionResult',
          payload: result
        }, '*')
      }
    } catch (error: any) {
      // Send error back to iframe
      if (this.iframe?.contentWindow) {
        this.iframe.contentWindow.postMessage({
          executionId,
          callId,
          type: 'functionError',
          payload: error.message || String(error)
        }, '*')
      }
    }
  }

  /**
   * Builds complete iframe srcdoc HTML with embedded sandbox code
   */
  private buildSrcDoc(
    code: string,
    context: Record<string, any>,
    executionId: string
  ): string {
    // Build context code (inject primitives and function stubs)
    const contextCode = this.buildContextCode(context, executionId)

    // JSON.stringify the code to safely escape all special characters
    const escapedCode = JSON.stringify(code)

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <script>
    (function() {
      const executionId = '${executionId}'
      const __userCode = ${escapedCode}

      // Helper to send messages to parent
      function sendMessage(type, payload) {
        window.parent.postMessage({ executionId, type, payload }, '*')
      }

      // Helper to emit observability events
      function emitEvent(type, data) {
        sendMessage('event', { type, data, timestamp: Date.now() })
      }

      try {
        // Override console methods to capture logs
        const originalConsole = {
          log: console.log.bind(console),
          error: console.error.bind(console),
          warn: console.warn.bind(console),
          info: console.info.bind(console)
        }

        console.log = (...args) => {
          originalConsole.log('[Sandbox]', ...args)
          sendMessage('log', { level: 'log', args, timestamp: Date.now() })
        }

        console.error = (...args) => {
          originalConsole.error('[Sandbox]', ...args)
          sendMessage('log', { level: 'error', args, timestamp: Date.now() })
        }

        console.warn = (...args) => {
          originalConsole.warn('[Sandbox]', ...args)
          sendMessage('log', { level: 'warn', args, timestamp: Date.now() })
        }

        console.info = (...args) => {
          originalConsole.info('[Sandbox]', ...args)
          sendMessage('log', { level: 'info', args, timestamp: Date.now() })
        }

        ${contextCode}

        // Create proxy membrane with observability
        const membrane = new Proxy(allowedGlobals, {
          get(target, prop) {
            if (prop === Symbol.unscopables) {
              return undefined
            }

            // Track property access
            emitEvent('property_access', { property: String(prop) })

            if (target.hasOwnProperty(prop)) {
              const value = target[prop]

              // Wrap functions to track calls
              if (typeof value === 'function') {
                return function(...args) {
                  const callId = Math.random().toString(36)
                  emitEvent('function_start', { name: String(prop), args, callId })

                  const startTime = Date.now()
                  try {
                    const result = value.apply(this, args)

                    // Handle async results
                    if (result instanceof Promise) {
                      return result.then(
                        (res) => {
                          emitEvent('function_end', {
                            name: String(prop),
                            callId,
                            duration: Date.now() - startTime
                          })
                          return res
                        },
                        (err) => {
                          emitEvent('function_error', {
                            name: String(prop),
                            callId,
                            error: String(err)
                          })
                          throw err
                        }
                      )
                    }

                    emitEvent('function_end', {
                      name: String(prop),
                      callId,
                      duration: Date.now() - startTime
                    })
                    return result
                  } catch (error) {
                    emitEvent('function_error', {
                      name: String(prop),
                      callId,
                      error: String(error)
                    })
                    throw error
                  }
                }
              }

              return value
            }

            // Return undefined for non-existent properties (normal JavaScript behavior)
            // Don't throw error, as has() now returns true for all properties
            return undefined
          },

          has(target, prop) {
            // Always return true so unqualified assignments go through set trap
            // This enables variable tracking in the Variable Inspector
            return true
          },

          set(target, prop, value) {
            // Track variable assignments
            emitEvent('variable_set', { name: String(prop), value })
            target[prop] = value
            return true
          }
        })

        // Execute user code with membrane scope
        // Use AsyncFunction constructor for top-level await
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor

        // Wrap code to execute user code and then return both result and workspace
        // This allows unqualified assignments to go through the proxy
        const wrappedCode = 'with (this) { return (async () => { const __userResult = await (async () => { ' + __userCode + ' })(); return { __userResult, __workspace: workspace }; })(); }'
        const fn = new AsyncFunction(wrappedCode)
        const __result = fn.call(membrane)

        // Handle async results
        Promise.resolve(__result).then(
          (result) => {
            // Send the full result (includes __userResult and __workspace)
            sendMessage('success', result)
          },
          (error) => {
            sendMessage('error', error.message || String(error))
          }
        )

      } catch (error) {
        sendMessage('error', error.message || String(error))
      }
    })()
  </script>
</body>
</html>`
  }

  /**
   * Builds context code to inject into iframe
   */
  private buildContextCode(
    context: Record<string, any>,
    executionId: string
  ): string {
    // Separate primitives and functions
    const primitiveEntries: string[] = []
    const functionNames: string[] = []

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'function') {
        functionNames.push(key)
      } else {
        // Serialize primitives directly
        try {
          primitiveEntries.push(`${JSON.stringify(key)}: ${JSON.stringify(value)}`)
        } catch (error) {
          console.warn(`[Sandbox] Cannot serialize context key "${key}"`)
        }
      }
    }

    // Build function wrappers that call parent via postMessage
    const functionCode = functionNames.map(name => {
      return `${JSON.stringify(name)}: async (...args) => {
        const callId = Math.random().toString(36)

        // Send function call request to parent
        window.parent.postMessage({
          executionId: '${executionId}',
          type: 'functionCall',
          payload: { name: ${JSON.stringify(name)}, args, callId }
        }, '*')

        // Wait for response from parent
        return new Promise((resolve, reject) => {
          const handler = (event) => {
            if (event.data.executionId === '${executionId}' && event.data.callId === callId) {
              window.removeEventListener('message', handler)
              if (event.data.type === 'functionResult') {
                resolve(event.data.payload)
              } else if (event.data.type === 'functionError') {
                reject(new Error(event.data.payload))
              }
            }
          }
          window.addEventListener('message', handler)
        })
      }`
    }).join(',\n        ')

    // Combine primitives and functions
    const contextSection = [...primitiveEntries, functionCode]
      .filter(Boolean)
      .join(',\n        ')

    return `
        // Create allowlist of exposed globals
        const allowedGlobals = {
          ${contextSection ? contextSection + ',\n\n' : ''}
          // Safe built-ins
          console: {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
          },
          JSON: JSON,
          Math: Math,
          Array: Array,
          Object: Object,
          String: String,
          Number: Number,
          Boolean: Boolean,
          Date: Date,
          RegExp: RegExp,
          Error: Error,
          Promise: Promise,
          setTimeout: setTimeout,
          setInterval: setInterval,
          clearTimeout: clearTimeout,
          clearInterval: clearInterval,
        }
    `
  }

  /**
   * Cleans up message listener after execution (keeps iframe alive)
   */
  private cleanupExecution(): void {
    // Remove message listener
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }

    // Don't remove iframe - it's persistent
    // Just clear the reference
    this.iframe = null
    this.executionId = null
  }

  /**
   * Marks any in-flight function calls as errored when execution fails
   *
   * Scans events array for function_start events without corresponding
   * function_end or function_error events, and adds error events for them.
   * Also emits these events to parent window for real-time UI updates.
   */
  private markActiveCallsAsErrored(events: SandboxEvent[], errorMessage: string): void {
    // Track which function calls have completed
    const completedCalls = new Set<string>()

    // First pass: collect all callIds that have finished
    for (const event of events) {
      if (event.type === 'function_end' || event.type === 'function_error') {
        completedCalls.add(event.data.callId)
      }
    }

    // Second pass: find active (incomplete) function calls
    const activeCalls: Array<{name: string, callId: string}> = []
    for (const event of events) {
      if (event.type === 'function_start') {
        const callId = event.data.callId
        if (!completedCalls.has(callId)) {
          activeCalls.push({
            name: event.data.name,
            callId: callId
          })
        }
      }
    }

    // Mark active calls as errored
    const timestamp = Date.now()
    for (const call of activeCalls) {
      const errorEvent: SandboxEvent = {
        type: 'function_error',
        data: {
          name: call.name,
          callId: call.callId,
          error: errorMessage
        },
        timestamp
      }

      // Add to events array
      events.push(errorEvent)

      // Also emit to parent window for real-time UI update
      if (this.executionId && typeof window !== 'undefined') {
        window.postMessage({
          executionId: this.executionId,
          type: 'event',
          payload: errorEvent
        }, '*')
      }
    }

    if (activeCalls.length > 0) {
      console.log(`[Sandbox] Marked ${activeCalls.length} active function calls as errored`)
    }
  }

  /**
   * Legacy cleanup method for backward compatibility
   * @deprecated Use cleanupExecution() instead
   */
  private cleanup(): void {
    this.cleanupExecution()
  }
}

/**
 * Singleton instance for reuse
 */
let executorInstance: IframeSandboxExecutor | null = null

/**
 * Gets or creates singleton executor instance
 */
export function getExecutor(): IframeSandboxExecutor {
  if (!executorInstance) {
    executorInstance = new IframeSandboxExecutor()
  }
  return executorInstance
}
