/**
 * InsightsClient - Unified event tracking system
 *
 * OTel-compatible event tracking for LLM invocations, executions,
 * user interactions, and errors with event chain support.
 */

import * as logger from "../logger";
import { is_browser } from "../util/index";
import {
  InsightsEvent,
  InsightsConfig,
  InsightsBatchResponse,
  AddEventOptions,
  LLMInvocationData,
  UserInputData,
  ExecutionData,
  CommonEventTypes,
} from "../types/insights";

const log = logger.get_logger({ id: "insights" });

/**
 * Generate a unique ID with prefix
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return generateId("ses");
}

/**
 * Generate event ID
 */
export function generateEventId(): string {
  return generateId("evt");
}

/**
 * Generate trace ID
 */
export function generateTraceId(): string {
  return generateId("trc");
}

/**
 * Get client info (browser only)
 */
function getClientInfo(): { user_agent: string; viewport_size: string; [key: string]: any } | undefined {
  if (!is_browser()) return undefined;

  const baseInfo: any = {
    user_agent: navigator.userAgent,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
  };

  // Add Firebase auth data if available
  try {
    if (typeof (window as any).getAuth === 'function') {
      const auth = (window as any).getAuth();
      if (auth?.currentUser) {
        baseInfo.firebase_uid = auth.currentUser.uid || null;
        baseInfo.firebase_email = auth.currentUser.email || null;
        baseInfo.firebase_display_name = auth.currentUser.displayName || null;
      }
    }
  } catch (error) {
    // Silent failure - don't break event creation if auth fails
    console.warn('[insights] Failed to capture Firebase auth data:', error);
  }

  return baseInfo;
}

/**
 * InsightsClient class - Main client for event tracking
 */
export class InsightsClient {
  private config: Required<InsightsConfig>;
  private eventBatch: InsightsEvent[] = [];
  private batchTimer: any = null;
  private chainStack: Array<{ event_id: string; trace_id: string }> = [];
  private enabled: boolean = true;

  constructor(config: InsightsConfig) {
    // Set defaults
    this.config = {
      app_name: config.app_name,
      app_version: config.app_version,
      user_id: config.user_id,
      session_id: config.session_id || generateSessionId(),
      endpoint: config.endpoint || "/api/insights/batch",
      batch_size: config.batch_size || 50,
      batch_interval_ms: config.batch_interval_ms || 5000,
      enabled: config.enabled !== undefined ? config.enabled : true,
    };

    this.enabled = this.config.enabled;

    log(`InsightsClient initialized for ${this.config.app_name} v${this.config.app_version}`);
    log(`Session ID: ${this.config.session_id}`);
    log(`Batch size: ${this.config.batch_size}, Interval: ${this.config.batch_interval_ms}ms`);

    // Start batch timer
    if (this.enabled && is_browser()) {
      this.startBatchTimer();
    }
  }

  /**
   * Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      if (this.eventBatch.length > 0) {
        this.flushBatch();
      }
    }, this.config.batch_interval_ms);
  }

  /**
   * Stop the batch timer
   */
  private stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Add a generic event
   */
  async addEvent(
    event_type: string,
    payload: Record<string, any>,
    options: AddEventOptions = {}
  ): Promise<string> {
    if (!this.enabled) {
      return generateEventId(); // Return dummy ID if disabled
    }

    try {
      const event_id = generateEventId();
      const timestamp = Date.now();

      // Determine parent_event_id and trace_id
      let parent_event_id = options.parent_event_id;
      let trace_id = options.trace_id;

      // If we're in a chain, use the top of the stack
      if (this.chainStack.length > 0) {
        const current_chain = this.chainStack[this.chainStack.length - 1];
        if (!parent_event_id) {
          parent_event_id = current_chain.event_id;
        }
        if (!trace_id) {
          trace_id = current_chain.trace_id;
        }
      }

      const event: InsightsEvent = {
        event_id,
        event_type,
        app_name: this.config.app_name,
        app_version: this.config.app_version,
        user_id: this.config.user_id,
        session_id: this.config.session_id,
        timestamp,
        payload,
        parent_event_id,
        trace_id,
        tags: options.tags,
        duration_ms: options.duration_ms,
        client_info: getClientInfo(),
      };

      // Add to batch
      this.eventBatch.push(event);

      // Flush if batch size reached
      if (this.eventBatch.length >= this.config.batch_size) {
        await this.flushBatch();
      }

      return event_id;
    } catch (error) {
      // Silent failure - never break the app
      log(`Error adding event: ${error}`);
      return generateEventId();
    }
  }

  /**
   * Start an event chain
   * Returns the event_id which becomes the parent for subsequent events
   */
  async startChain(event_type: string, payload: Record<string, any>): Promise<string> {
    if (!this.enabled) {
      return generateEventId();
    }

    try {
      const event_id = await this.addEvent(event_type, payload, {
        trace_id: generateTraceId(),
      });

      // Get the trace_id from the event we just created
      const event = this.eventBatch.find((e) => e.event_id === event_id);
      const trace_id = event?.trace_id || generateTraceId();

      // Push to chain stack
      this.chainStack.push({ event_id, trace_id });

      return event_id;
    } catch (error) {
      log(`Error starting chain: ${error}`);
      return generateEventId();
    }
  }

  /**
   * End the current event chain
   */
  endChain(): void {
    if (this.chainStack.length > 0) {
      this.chainStack.pop();
    }
  }

  /**
   * Add an event in the current chain
   */
  async addInChain(
    event_type: string,
    payload: Record<string, any>,
    options: AddEventOptions = {}
  ): Promise<string> {
    // addEvent will automatically use the chain stack
    return this.addEvent(event_type, payload, options);
  }

  /**
   * Convenience method: Add LLM invocation event
   */
  async addLLMInvocation(data: LLMInvocationData): Promise<string> {
    const tags = data.status === "error" ? ["error"] : [];
    if (data.latency_ms > 5000) {
      tags.push("slow");
    }

    return this.addEvent(CommonEventTypes.LLM_INVOCATION, data, {
      tags,
      duration_ms: data.latency_ms,
    });
  }

  /**
   * Convenience method: Add execution event
   */
  async addExecution(data: ExecutionData): Promise<string> {
    const tags = data.status === "error" ? ["error"] : [];
    if (data.duration_ms > 10000) {
      tags.push("slow");
    }

    return this.addEvent(CommonEventTypes.EXECUTION, data, {
      tags,
      duration_ms: data.duration_ms,
    });
  }

  /**
   * Convenience method: Add user input event
   */
  async addUserInput(data: UserInputData): Promise<string> {
    return this.addEvent(CommonEventTypes.USER_INPUT, data);
  }

  /**
   * Flush the current batch to the API
   */
  async flushBatch(): Promise<void> {
    if (this.eventBatch.length === 0) {
      return;
    }

    // Take the current batch and clear it
    const eventsToSend = [...this.eventBatch];
    this.eventBatch = [];

    try {
      log(`Flushing ${eventsToSend.length} events to ${this.config.endpoint}`);

      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: InsightsBatchResponse = await response.json();
      log(
        `Batch sent successfully: ${result.events_stored}/${result.events_received} stored`
      );

      if (result.errors && result.errors.length > 0) {
        log(`Batch had errors: ${result.errors.join(", ")}`);
      }
    } catch (error) {
      // Silent failure - log but don't throw
      log(`Error flushing batch: ${error}`);

      // Put events back in the batch to try again later
      // But limit the size to prevent infinite growth
      if (this.eventBatch.length < this.config.batch_size * 2) {
        this.eventBatch.unshift(...eventsToSend);
      }
    }
  }

  /**
   * Manually flush and cleanup
   */
  async shutdown(): Promise<void> {
    this.stopBatchTimer();
    await this.flushBatch();
    log("InsightsClient shutdown complete");
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.config.session_id;
  }

  /**
   * Get current chain depth
   */
  getChainDepth(): number {
    return this.chainStack.length;
  }

  /**
   * Enable/disable event tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && is_browser()) {
      this.startBatchTimer();
    } else {
      this.stopBatchTimer();
    }
  }
}

/**
 * Singleton instance for default client
 */
let defaultClient: InsightsClient | null = null;

/**
 * Create a new InsightsClient
 */
export function createClient(config: InsightsConfig): InsightsClient {
  return new InsightsClient(config);
}

/**
 * Get or create the default client
 */
export function getDefaultClient(): InsightsClient {
  if (!defaultClient) {
    throw new Error(
      "Default InsightsClient not initialized. Call createClient() first or set defaultClient."
    );
  }
  return defaultClient;
}

/**
 * Set the default client
 */
export function setDefaultClient(client: InsightsClient): void {
  defaultClient = client;
}

/**
 * Export all types for convenience
 */
export * from "../types/insights";
