/**
 * Platform-agnostic sandbox execution interface
 * Implemented by IframeSandbox (web) and NodeSandbox (node)
 */

/**
 * Sandbox executor interface - must be implemented by platform-specific sandboxes
 */
export interface SandboxExecutor {
  /**
   * Execute JavaScript code in isolated environment
   * @param code - JavaScript code to execute
   * @param context - Variables and functions to inject
   * @param timeout - Execution timeout in milliseconds
   * @returns Promise with execution result
   */
  execute(
    code: string,
    context: Record<string, any>,
    timeout: number
  ): Promise<SandboxResult>

  /**
   * Initialize persistent sandbox environment
   */
  initializePersistent(): Promise<void>

  /**
   * Reset sandbox environment, clearing all state
   */
  reset(): Promise<void>

  /**
   * Destroy sandbox completely
   */
  destroy(): void

  /**
   * Setup real-time event stream listener (optional)
   * Only implemented by sandboxes that support real-time streaming (e.g., IframeSandbox)
   * NodeSandbox uses synchronous execution and doesn't implement this.
   *
   * @param handler - Callback to receive real-time log/event messages
   * @returns Cleanup function to remove the listener
   */
  setupEventStream?(handler: (event: SandboxRuntimeEvent) => void): () => void
}

/**
 * Result from sandbox execution with observability
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
 * Runtime event emitted during sandbox execution (for real-time streaming)
 */
export interface SandboxRuntimeEvent {
  type: 'log' | 'event'
  payload: SandboxLog | SandboxEvent
}

/**
 * Default execution timeout: 1 hour (3,600,000 milliseconds)
 */
export const DEFAULT_SANDBOX_TIMEOUT = 60 * 60 * 1000
