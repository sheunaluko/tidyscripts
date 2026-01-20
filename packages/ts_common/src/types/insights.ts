/**
 * InsightsClient Type Definitions
 *
 * OTel-compatible event tracking system for capturing LLM invocations,
 * executions, user interactions, and errors with event chain support.
 */

/**
 * Base event interface - all apps inherit this
 * OTel-compatible: maps to Span in OpenTelemetry
 */
export interface InsightsEvent {
  // Identity
  event_id: string;           // Span ID in OTel
  event_type: string;         // Span name in OTel (flexible string, not enum)
  app_name: string;           // "cortex", "rai", or any future app
  app_version: string;

  // Context
  user_id: string;
  session_id: string;
  timestamp: number;

  // Event chains (OTel: parent span + trace)
  parent_event_id?: string;   // Parent Span ID
  trace_id?: string;          // Trace ID (groups entire interaction)

  // Flexible payload (OTel: attributes)
  payload: Record<string, any>;

  // Metadata
  tags?: string[];            // ["error", "slow", "retry"] - flexible strings
  duration_ms?: number;

  // Client info
  client_info?: {
    user_agent: string;
    viewport_size: string;
    [key: string]: any; // Allow additional fields (e.g., Firebase auth data)
  };
}

/**
 * Common event types (examples - apps can use any string)
 */
export const CommonEventTypes = {
  // User interactions
  USER_INPUT: 'user_input',
  USER_INTERACTION: 'user_interaction',
  USER_OUTPUT: 'user_output',

  // LLM operations
  LLM_INVOCATION: 'llm_invocation',

  // Executions
  EXECUTION: 'execution',
  CODE_EXECUTION: 'code_execution',
  EXECUTION_COMPLETE: 'execution_complete',

  // RAI specific
  NOTE_GENERATION: 'note_generation',
  TEST_RUN: 'test_run',
  MODEL_TEST: 'model_test',
  MODEL_TEST_COMPLETE: 'model_test_complete',
} as const;

/**
 * LLM Invocation Data (convenience interface)
 */
export interface LLMInvocationData {
  model: string;
  provider: string;           // "openai", "anthropic", "gemini", etc. (flexible)
  mode?: string;              // "structured", "unstructured", "code_generation", etc.
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  status: string;             // "success", "error", "timeout", etc. (flexible)
  error?: string;
  context?: Record<string, any>;
}

/**
 * User Input Data (convenience interface)
 */
export interface UserInputData {
  input_mode: string;         // "voice", "text", "chat", etc. (flexible)
  input_length: number;
  transcription_confidence?: number;
  context?: Record<string, any>;
}

/**
 * Execution Data (convenience interface)
 */
export interface ExecutionData {
  execution_type: string;     // "code_sandbox", "note_generation", etc. (flexible)
  status: string;             // "success", "error", etc. (flexible)
  duration_ms: number;
  error?: string;
  function_calls?: number;
  variables_assigned?: number;
  logs_count?: number;
  context?: Record<string, any>;
}

/**
 * Options for adding events
 */
export interface AddEventOptions {
  tags?: string[];
  parent_event_id?: string;
  trace_id?: string;
  duration_ms?: number;
}

/**
 * Configuration for InsightsClient
 */
export interface InsightsConfig {
  app_name: string;
  app_version: string;
  user_id: string;
  session_id?: string;
  endpoint?: string;
  batch_size?: number;
  batch_interval_ms?: number;
  enabled?: boolean;
}

/**
 * Response from insights API
 */
export interface InsightsBatchResponse {
  success: boolean;
  events_received: number;
  events_stored: number;
  errors?: string[];
}
