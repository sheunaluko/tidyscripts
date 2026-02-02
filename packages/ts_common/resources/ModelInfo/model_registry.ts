/**
 * Model Registry - Token limits and pricing for AI models
 * Updated: 2026-02-01 from official provider documentation
 * Prices are in USD per million tokens (MTok)
 */

export type Provider = 'openai' | 'anthropic' | 'gemini'

export interface ModelInfo {
  id: string
  provider: Provider
  contextWindow: number
  maxOutputTokens: number
  inputPricePer1M: number
  outputPricePer1M: number
  description?: string
}

export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  // ============================================
  // ANTHROPIC MODELS
  // ============================================
  "claude-opus-4-5": {
    id: "claude-opus-4-5-20251101",
    provider: "anthropic",
    inputPricePer1M: 5,
    outputPricePer1M: 25,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    description: "Premium model combining maximum intelligence with practical performance",
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5-20250929",
    provider: "anthropic",
    inputPricePer1M: 3,
    outputPricePer1M: 15,
    contextWindow: 200000,  // 1M tokens available in beta
    maxOutputTokens: 64000,
    description: "Smart model for complex agents and coding",
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    inputPricePer1M: 1,
    outputPricePer1M: 5,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    description: "Fastest model with near-frontier intelligence",
  },

  // ============================================
  // GOOGLE GEMINI MODELS
  // ============================================
  "gemini-3-pro-preview": {
    id: "gemini-3-pro-preview",
    provider: "gemini",
    inputPricePer1M: 2,         // $4/MTok for >200k tokens
    outputPricePer1M: 12,       // $18/MTok for >200k tokens
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    description: "Best for complex tasks requiring broad world knowledge and advanced reasoning",
  },
  "gemini-3-flash-preview": {
    id: "gemini-3-flash-preview",
    provider: "gemini",
    inputPricePer1M: 0.5,
    outputPricePer1M: 3,
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    description: "Pro-level intelligence at Flash speed and pricing",
  },
  "gemini-3-pro-image-preview": {
    id: "gemini-3-pro-image-preview",
    provider: "gemini",
    inputPricePer1M: 2,
    outputPricePer1M: 0.134,    // per image output
    contextWindow: 65000,
    maxOutputTokens: 32000,
    description: "Highest quality image generation model",
  },

  // ============================================
  // OPENAI MODELS
  // ============================================
  "gpt-4.1": {
    id: "gpt-4.1-2025-04-14",
    provider: "openai",
    inputPricePer1M: 2,
    outputPricePer1M: 8,
    contextWindow: 1047576,
    maxOutputTokens: 32768,
    description: "Smartest non-reasoning model with 1M context window",
  },
  "gpt-5": {
    id: "gpt-5-2025-08-07",
    provider: "openai",
    inputPricePer1M: 1.25,
    outputPricePer1M: 10,
    contextWindow: 400000,
    maxOutputTokens: 128000,
    description: "Intelligent reasoning model for coding and agentic tasks",
  },
  "gpt-5-mini": {
    id: "gpt-5-mini-2025-08-07",
    provider: "openai",
    inputPricePer1M: 0.25,
    outputPricePer1M: 2,
    contextWindow: 400000,
    maxOutputTokens: 128000,
    description: "Faster, cost-efficient version of GPT-5",
  },
  "gpt-5-nano": {
    id: "gpt-5-nano-2025-08-07",
    provider: "openai",
    inputPricePer1M: 0.05,
    outputPricePer1M: 0.4,
    contextWindow: 400000,
    maxOutputTokens: 128000,
    description: "Fastest, most cost-efficient version of GPT-5",
  },
  "gpt-5.2": {
    id: "gpt-5.2-2025-12-11",
    provider: "openai",
    inputPricePer1M: 1.75,
    outputPricePer1M: 14,
    contextWindow: 400000,
    maxOutputTokens: 128000,
    description: "Best model for coding and agentic tasks across industries",
  },
  "gpt-5.2-pro": {
    id: "gpt-5.2-pro-2025-12-11",
    provider: "openai",
    inputPricePer1M: 21,
    outputPricePer1M: 168,
    contextWindow: 400000,
    maxOutputTokens: 128000,
    description: "Smarter, more precise version of GPT-5.2",
  },
  "gpt-5.2-codex": {
    id: "gpt-5.2-codex",
    provider: "openai",
    inputPricePer1M: 1.75,
    outputPricePer1M: 14,
    contextWindow: 400000,
    maxOutputTokens: 128000,
    description: "Most intelligent coding model for long-horizon agentic tasks",
  },
  "o4-mini": {
    id: "o4-mini-2025-04-16",
    provider: "openai",
    inputPricePer1M: 1.1,
    outputPricePer1M: 4.4,
    contextWindow: 200000,
    maxOutputTokens: 100000,
    description: "Fast, cost-efficient reasoning model for coding and visual tasks",
  },
}

const DEFAULT_MODEL_INFO: Record<Provider, Omit<ModelInfo, 'id'>> = {
  openai: {
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricePer1M: 2,
    outputPricePer1M: 8,
  },
  anthropic: {
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 64000,
    inputPricePer1M: 3,
    outputPricePer1M: 15,
  },
  gemini: {
    provider: 'gemini',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    inputPricePer1M: 0.5,
    outputPricePer1M: 3,
  },
}

/**
 * Get model info by name, with optional provider for fallback defaults
 */
export function getModelInfo(model: string, provider?: Provider): ModelInfo {
  // Direct lookup
  if (MODEL_REGISTRY[model]) {
    return MODEL_REGISTRY[model]
  }

  // Try prefix matching (e.g., "gpt-5.2-2025-12-11" matches "gpt-5.2")
  for (const [key, info] of Object.entries(MODEL_REGISTRY)) {
    if (model.startsWith(key) || key.startsWith(model)) {
      return { ...info, id: model }
    }
  }

  // Fall back to defaults
  const inferredProvider = provider || inferProviderFromModel(model)
  const defaults = DEFAULT_MODEL_INFO[inferredProvider]
  return { id: model, ...defaults }
}

function inferProviderFromModel(model: string): Provider {
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gemini-')) return 'gemini'
  return 'openai'
}

/**
 * Get list of all registered model names
 */
export function getRegisteredModels(): string[] {
  return Object.keys(MODEL_REGISTRY)
}

/**
 * Calculate cost for a request in USD
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  provider?: Provider
): number {
  const info = getModelInfo(model, provider)
  const inputCost = (inputTokens / 1_000_000) * info.inputPricePer1M
  const outputCost = (outputTokens / 1_000_000) * info.outputPricePer1M
  return inputCost + outputCost
}

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(provider: Provider): ModelInfo[] {
  return Object.values(MODEL_REGISTRY).filter(m => m.provider === provider)
}
