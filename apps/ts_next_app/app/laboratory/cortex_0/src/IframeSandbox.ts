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
  private executionId: string | null = null
  private messageHandler: ((event: MessageEvent) => void) | null = null

  /**
   * Executes JavaScript code in isolated iframe sandbox
   *
   * @param code - JavaScript code to execute
   * @param context - Variables and functions to inject
   * @param timeout - Execution timeout in milliseconds
   * @returns Promise resolving to execution result with observability data
   */
  async execute(
    code: string,
    context: Record<string, any> = {},
    timeout: number = 5000
  ): Promise<IframeSandboxResult> {
    const startTime = Date.now()
    this.executionId = generateExecutionId()

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
      return {
        ok: false,
        error: error.message || String(error),
        executionId: this.executionId,
        logs,
        events,
        duration: Date.now() - startTime
      }
    } finally {
      // Always cleanup
      this.cleanup()
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

      // Create and inject iframe
      this.iframe = document.createElement('iframe')
      this.iframe.setAttribute('sandbox', 'allow-scripts')
      this.iframe.style.display = 'none'
      this.iframe.srcdoc = srcdoc

      // Handle iframe load errors
      this.iframe.onerror = (error) => {
        reject(new Error(`Iframe load failed: ${error}`))
      }

      // Append to DOM to trigger execution
      document.body.appendChild(this.iframe)
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

    // Escape user code for safe injection
    const escapedCode = code.replace(/<\/script>/gi, '<\\/script>')

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <script>
    (function() {
      const executionId = '${executionId}'

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

            throw new Error(\`Access to '\${String(prop)}' is not allowed in sandbox\`)
          },

          has(target, prop) {
            return target.hasOwnProperty(prop)
          },

          set(target, prop, value) {
            // Track variable assignments
            emitEvent('variable_set', { name: String(prop), value })
            target[prop] = value
            return true
          }
        })

        // Execute user code with membrane scope
        let __result
        with (membrane) {
          __result = (async function() {
            return eval(\`${escapedCode}\`)
          })()
        }

        // Handle async results
        Promise.resolve(__result).then(
          (result) => {
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
   * Cleans up iframe and message listener after execution
   */
  private cleanup(): void {
    // Remove message listener
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler)
      this.messageHandler = null
    }

    // Remove iframe from DOM
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
    this.iframe = null

    this.executionId = null
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
