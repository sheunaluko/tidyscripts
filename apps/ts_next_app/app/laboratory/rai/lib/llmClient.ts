// Unified LLM Client - Provider-agnostic abstraction for structured and unstructured calls

import { Provider } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LLMMode = 'structured' | 'unstructured';
export type StreamingMode = 'none' | 'text'; // Future: add 'structured'

export interface LLMClientConfig {
  mode: LLMMode;
  streaming?: StreamingMode;  // Default: 'none' (future-proofing)
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StructuredRequest {
  model: string;
  input: LLMMessage[];
  schema: object;              // JSON schema
  schema_name: string;
  max_tokens?: number;
}

export interface UnstructuredRequest {
  model: string;
  input: LLMMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface StructuredResponse {
  output_text: string;         // JSON string - needs parsing
  [key: string]: any;          // Provider-specific fields
}

export interface UnstructuredResponse {
  output_text: string;         // Plain text
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  model: string;
  finish_reason?: string;
  [key: string]: any;
}

// Future: Streaming interfaces
export interface StreamChunk {
  delta: string;
  done: boolean;
}

export type StreamCallback = (chunk: StreamChunk) => void;

// ============================================================================
// PROVIDER DETECTION
// ============================================================================

/**
 * Detect AI provider from model name
 * Same logic as noteGenerator.ts for consistency
 */
export function getProviderFromModel(model: string): Provider {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  return 'openai';
}

/**
 * Get endpoint URL for provider and mode
 */
export function getEndpoint(provider: Provider, mode: LLMMode): string {
  const endpoints: Record<Provider, Record<LLMMode, string>> = {
    anthropic: {
      structured: '/api/claude_structured_response',
      unstructured: '/api/claude_response',
    },
    gemini: {
      structured: '/api/gemini_structured_response',
      unstructured: '/api/gemini_response',
    },
    openai: {
      structured: '/api/openai_structured_response',
      unstructured: '/api/openai_response',
    },
  };

  return endpoints[provider][mode];
}

// ============================================================================
// UNIFIED LLM CLIENT
// ============================================================================

export class LLMClient {
  private config: LLMClientConfig;

  constructor(config: LLMClientConfig) {
    this.config = {
      streaming: 'none',  // Default
      ...config,
    };
  }

  /**
   * Send structured request (with JSON schema)
   * Returns parsed JSON object
   */
  async sendStructured<T = any>(
    request: StructuredRequest,
    retries: number = 3
  ): Promise<T> {
    if (this.config.mode !== 'structured') {
      throw new Error('Client not configured for structured mode');
    }

    const provider = getProviderFromModel(request.model);
    const endpoint = getEndpoint(provider, 'structured');

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error (${response.status}): ${errorText}`);
        }

        const data: StructuredResponse = await response.json();

        // Parse output_text (follows cortex_0 convention)
        let parsedOutput: any;
        if (data.output_text) {
          parsedOutput = JSON.parse(data.output_text);
        } else if (data.choices && (data as any).choices[0]?.message?.parsed) {
          parsedOutput = (data as any).choices[0].message.parsed;
        } else if (data.choices && (data as any).choices[0]?.message?.content) {
          const content = (data as any).choices[0].message.content;
          parsedOutput = typeof content === 'string' ? JSON.parse(content) : content;
        } else {
          throw new Error('Unexpected API response format');
        }

        return parsedOutput as T;

      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw new Error('Failed after all retries');
  }

  /**
   * Send unstructured request (plain text response)
   * Returns raw text string
   */
  async sendUnstructured(
    request: UnstructuredRequest,
    retries: number = 3
  ): Promise<string> {
    if (this.config.mode !== 'unstructured') {
      throw new Error('Client not configured for unstructured mode');
    }

    const provider = getProviderFromModel(request.model);
    const endpoint = getEndpoint(provider, 'unstructured');

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error (${response.status}): ${errorText}`);
        }

        const data: UnstructuredResponse = await response.json();

        if (!data.output_text) {
          throw new Error('Invalid API response: missing output_text');
        }

        return data.output_text;

      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw new Error('Failed after all retries');
  }

  /**
   * Future: Send streaming request
   * Currently throws - to be implemented later
   */
  async sendStreaming(
    request: UnstructuredRequest,
    callback: StreamCallback
  ): Promise<void> {
    if (this.config.streaming === 'none') {
      throw new Error('Streaming not enabled in client config');
    }

    throw new Error('Streaming not yet implemented - coming soon');

    // Future implementation outline:
    // 1. Get streaming endpoint variant (e.g., /api/claude_response_stream)
    // 2. Use fetch with ReadableStream
    // 3. Parse SSE events
    // 4. Call callback with each chunk
    // 5. Handle completion
  }

  /**
   * Convenience method: auto-detect mode and send request
   * Useful for migration without changing calling code
   */
  async send(
    request: StructuredRequest | UnstructuredRequest,
    retries: number = 3
  ): Promise<any> {
    if ('schema' in request) {
      return this.sendStructured(request as StructuredRequest, retries);
    } else {
      return this.sendUnstructured(request as UnstructuredRequest, retries);
    }
  }
}

// ============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// ============================================================================

/**
 * Create client for structured outputs
 */
export function createStructuredClient(): LLMClient {
  return new LLMClient({ mode: 'structured' });
}

/**
 * Create client for unstructured text
 */
export function createUnstructuredClient(): LLMClient {
  return new LLMClient({ mode: 'unstructured' });
}

/**
 * Create client with streaming (future)
 */
export function createStreamingClient(
  mode: LLMMode = 'unstructured'
): LLMClient {
  return new LLMClient({
    mode,
    streaming: 'text',  // Future: enable streaming
  });
}
