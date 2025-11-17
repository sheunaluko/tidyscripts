export const DEFAULT_MODEL = "o4-mini";

export const AVAILABLE_MODELS = [
  { value: "o4-mini", label: "o4-mini (reasoning)" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { value: "chatgpt-4o-latest", label: "chatgpt-4o-latest (used in chat.openai.com)" },
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4.1", label: "gpt-4.1" },
  { value: "o1", label: "o1 (reasoning)" },
  { value: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet-20241022" }
] as const;

export const VERBOSITY_LABELS = {
  1: 'Very Brief',
  2: 'Brief',
  3: 'Standard',
  4: 'Detailed',
  5: 'Very Detailed'
} as const;

export const VERBOSITY_GUIDANCE = {
  1: 'Be extremely concise. Use minimal words. Focus only on critical information.',
  2: 'Be concise. Include essential details but keep it brief.',
  3: 'Provide a balanced level of detail. Include important clinical information.',
  4: 'Be detailed. Include comprehensive clinical information and context.',
  5: 'Be very detailed. Include all relevant clinical information, reasoning, and context.'
} as const;
