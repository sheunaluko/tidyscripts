/**
 * Token Counter - Character-based token estimation
 *
 * Uses character-to-token ratios to estimate token counts.
 * These ratios can be calibrated over time by comparing estimates
 * against actual prompt_tokens from API responses.
 *
 * Note: tiktokenEncoding field in model_registry.ts is available
 * for future integration with accurate token counting APIs.
 */

import { Provider } from './types'

/**
 * Characters per token ratio by provider.
 * Based on empirical observations:
 * - OpenAI GPT models: ~4 chars/token for English text
 * - Anthropic Claude: slightly more efficient, ~3.5 chars/token
 * - Gemini: similar to OpenAI, ~4 chars/token
 */
const CHARS_PER_TOKEN: Record<Provider | 'default', number> = {
  openai: 4,
  anthropic: 3.5,
  gemini: 4,
  default: 4
}

/**
 * Overhead tokens per message (for role, formatting, etc.)
 * This accounts for the JSON structure around each message.
 */
const MESSAGE_OVERHEAD_TOKENS = 4

/**
 * Count estimated tokens in a text string.
 */
export function countTokens(text: string, provider?: Provider): number {
  if (!text) return 0
  const ratio = CHARS_PER_TOKEN[provider || 'default']
  return Math.ceil(text.length / ratio)
}

/** Alias for countTokens */
export const countTokensEstimate = countTokens

/**
 * Count estimated tokens in an array of messages.
 * Includes overhead for message structure.
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>,
  provider?: Provider
): number {
  if (!messages || messages.length === 0) return 0

  const overhead = messages.length * MESSAGE_OVERHEAD_TOKENS
  const contentTokens = messages.reduce(
    (sum, msg) => sum + countTokens(msg.content, provider),
    0
  )
  return contentTokens + overhead
}

/**
 * Token breakdown by message role
 */
export interface TokenBreakdown {
  systemMessage: number
  userMessages: number
  assistantMessages: number
  total: number
}

/**
 * Get detailed token breakdown by message role.
 */
export function getTokenBreakdown(
  messages: Array<{ role: string; content: string }>,
  provider?: Provider
): TokenBreakdown {
  let systemMessage = 0
  let userMessages = 0
  let assistantMessages = 0

  for (const msg of messages) {
    const tokens = countTokens(msg.content, provider) + MESSAGE_OVERHEAD_TOKENS

    switch (msg.role) {
      case 'system':
        systemMessage += tokens
        break
      case 'user':
        userMessages += tokens
        break
      case 'assistant':
        assistantMessages += tokens
        break
      default:
        // Unknown roles counted as user messages
        userMessages += tokens
    }
  }

  return {
    systemMessage,
    userMessages,
    assistantMessages,
    total: systemMessage + userMessages + assistantMessages
  }
}

/**
 * Calculate estimation drift compared to actual token count.
 * Returns the percentage difference (0.1 = 10% drift).
 */
export function calculateDrift(estimated: number, actual: number): number {
  if (actual === 0) return 0
  return Math.abs(actual - estimated) / actual
}

/**
 * Suggest adjusted chars-per-token ratio based on observed drift.
 * Useful for calibrating estimates over time.
 */
export function suggestRatioAdjustment(
  text: string,
  actualTokens: number,
  currentProvider?: Provider
): { currentRatio: number; suggestedRatio: number; drift: number } {
  const currentRatio = CHARS_PER_TOKEN[currentProvider || 'default']
  const estimated = countTokens(text, currentProvider)
  const drift = calculateDrift(estimated, actualTokens)

  // Calculate what ratio would have given the correct answer
  const suggestedRatio = text.length / actualTokens

  return { currentRatio, suggestedRatio, drift }
}
