// Note Generator - Provider-agnostic structured LLM calls

import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import * as tsw from 'tidyscripts_web';
import { Provider } from '../types';
import { TEMPLATE_SYNTAX } from '../constants';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

// Note output schema
const NoteOutputSchema = z.object({
  note: z.string().describe('Formatted markdown note with all template variables filled'),
});

type NoteOutput = z.infer<typeof NoteOutputSchema>;

/**
 * Helper to extract raw JSON schema from zodResponseFormat result
 * Follows cortex_0 convention
 */
function extractJsonSchema(zodFormat: ReturnType<typeof zodResponseFormat>) {
  return {
    schema: zodFormat.json_schema.schema,
    schema_name: zodFormat.json_schema.name
  };
}

/**
 * Detect AI provider from model name
 */
export function getProviderFromModel(model: string): Provider {
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  return 'openai';
}

/**
 * Get API endpoint for provider
 */
export function getEndpointForProvider(provider: Provider): string {
  const endpoints: Record<Provider, string> = {
    anthropic: '/api/claude_structured_response',
    gemini: '/api/gemini_structured_response',
    openai: '/api/openai_structured_response',
  };
  return endpoints[provider];
}

/**
 * Format TEMPLATE_SYNTAX constant into prompt-friendly text
 */
function formatTemplateSyntaxForPrompt(): string {
  const labels = ['A', 'B'];
  let syntaxText = '';

  TEMPLATE_SYNTAX.patterns.forEach((pattern, index) => {
    const label = labels[index];
    syntaxText += `\n   ${label}. ${pattern.name.toUpperCase()}:\n`;
    syntaxText += `      ${pattern.syntax}\n`;
    if (pattern.syntax.includes('prefix') || pattern.notes.includes('prefix')) {
      syntaxText += `      {{ prefix @variable postfix | fallback }}\n`;
    }
    syntaxText += '\n';

    pattern.rules.forEach(rule => {
      syntaxText += `      - ${rule}\n`;
    });

    if (pattern.examples.length > 0) {
      syntaxText += '\n      Examples:\n';
      pattern.examples.forEach(example => {
        syntaxText += `      - ${example}\n`;
      });
    }

    if (index < TEMPLATE_SYNTAX.patterns.length - 1) {
      syntaxText += '\n';
    }
  });

  return syntaxText;
}

/**
 * Remove everything from @END_TEMPLATE marker onwards
 * Allows template authors to include voice agent instructions that won't be sent to LLM
 * Voice agent sees full template; note generator only sees content before marker
 */
function truncateTemplateAtEndMarker(template: string): string {
  const endMarkerIndex = template.indexOf('@END_TEMPLATE');

  if (endMarkerIndex === -1) {
    // No marker found, return full template
    return template;
  }

  // Return everything before the marker
  return template.substring(0, endMarkerIndex).trimEnd();
}

/**
 * Build the prompt for note generation
 */
export function buildNotePrompt(
  systemPrompt: string,
  template: string,
  collectedText: string[]
): { system: string; user: string } {
  // Truncate template at @END_TEMPLATE marker if present
  const processedTemplate = truncateTemplateAtEndMarker(template);

  const freeTextEntries = collectedText.map((text, i) => `${i + 1}. ${text}`).join('\n');
  const syntaxInstructions = formatTemplateSyntaxForPrompt();

  const userPrompt = `Template:
${processedTemplate}

Collected Information (free text from physician):
${freeTextEntries}

Task:
1. Extract relevant information from the collected text to fill template variables
2. The template uses TWO types of conditional syntax:
${syntaxInstructions}

3. For each {{ ... }} block:
   - Check if it has one | (presence/absence) or three | (boolean with ?)
   - For boolean conditionals (three | separators):
     * First text: use when variable is explicitly true/yes
     * Second text: use when variable is explicitly false/no
     * Third text: use when variable is undefined/missing/unknown
   - Extract the relevant information from collected text
   - Apply the appropriate conditional logic based on the variable's state
   - Substitute with the correct text

4. Format as clean, professional plain text for medical documentation
5. Preserve the natural flow of the note
6. PRESERVE any [ ] brackets in the template exactly as they appear - these are todo items that must remain intact

IMPORTANT: Output ONLY the completed note as plain text. Do NOT use markdown syntax (no **, ##, -, backticks, etc.). Do NOT wrap your response in code blocks or fences. Do NOT include any preamble, explanation, or meta-commentary. Start directly with the note content in plain text format.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}


/**
 * Generate note using structured LLM API
 */
export async function generateNote(
  model: string,
  template: string,
  collectedText: string[],
  systemPrompt: string,
  retries: number = 3,
  insightsClient?: any
): Promise<string> {
  const provider = getProviderFromModel(model);
  const endpoint = getEndpointForProvider(provider);
  const { system, user } = buildNotePrompt(systemPrompt, template, collectedText);

  debug.add('note_generation_request', {
    model,
    provider,
    endpoint,
    templateLength: template.length,
    collectedTextCount: collectedText.length,
  });

  debug.add('note_generation_prompt', { system, user });

  // Extract JSON schema using cortex_0 convention
  const zodFormat = zodResponseFormat(NoteOutputSchema, 'NoteOutput');
  const { schema: jsonSchema, schema_name: schemaName } = extractJsonSchema(zodFormat);

  // Start note generation event chain
  let noteGenerationEventId: string | undefined;
  if (insightsClient) {
    try {
      noteGenerationEventId = await insightsClient.startChain('note_generation', {
        template_length: template.length,
        collected_text_count: collectedText.length,
      });
    } catch (err) {
      log(`Error starting insights chain: ${err}`);
    }
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    const startTime = Date.now();
    try {
      log(`Generating note with ${model} (attempt ${attempt + 1}/${retries})...`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          schema: jsonSchema,
          schema_name: schemaName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      debug.add('note_generation_raw_response', data);

      // Parse the response based on API format (following cortex_0 pattern)
      let parsedOutput: any;
      if (data.output_text) {
        // New Responses API format (cortex_0 convention)
        parsedOutput = JSON.parse(data.output_text);
      } else if (data.output) {
        // Alternative format
        parsedOutput = typeof data.output === 'string' ? JSON.parse(data.output) : data.output;
      } else if (data.choices && data.choices[0]?.message?.parsed) {
        // Fallback for old API format (cortex_0 convention)
        parsedOutput = data.choices[0].message.parsed;
      } else if (data.choices && data.choices[0]?.message?.content) {
        // Additional fallback
        const content = data.choices[0].message.content;
        parsedOutput = typeof content === 'string' ? JSON.parse(content) : content;
      } else {
        throw new Error('Unexpected API response format');
      }

      // Validate with Zod
      const validated = NoteOutputSchema.parse(parsedOutput);

      debug.add('note_generation_success', {
        noteLength: validated.note.length,
      });

      // Add successful LLM invocation event
      if (insightsClient) {
        try {
          await insightsClient.addInChain('llm_invocation', {
            model,
            provider,
            mode: 'structured',
            prompt_tokens: data.usage?.prompt_tokens || 0,
            completion_tokens: data.usage?.completion_tokens || 0,
            latency_ms: latency,
            status: 'success',
            context: {
              note_length: validated.note.length,
              attempt: attempt + 1,
            }
          });
        } catch (err) {
          log(`Error adding LLM invocation event: ${err}`);
        }
      }

      // End the chain
      if (insightsClient && noteGenerationEventId) {
        try {
          insightsClient.endChain();
        } catch (err) {
          log(`Error ending insights chain: ${err}`);
        }
      }

      log('Note generated successfully');
      return validated.note;
    } catch (error) {
      log(`Error generating note (attempt ${attempt + 1}):` );
      log(error);

      if (attempt === retries - 1) {
        debug.add('note_generation_failed', { error: String(error) });

        // Add error event before throwing
        if (insightsClient) {
          try {
            await insightsClient.addInChain('llm_invocation', {
              model,
              provider,
              mode: 'structured',
              prompt_tokens: 0,
              completion_tokens: 0,
              latency_ms: Date.now() - startTime,
              status: 'error',
              error: String(error),
            });
            insightsClient.endChain();
          } catch (err) {
            log(`Error adding error insights event: ${err}`);
          }
        }

        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // End chain if we reach this point
  if (insightsClient && noteGenerationEventId) {
    try {
      insightsClient.endChain();
    } catch (err) {
      log(`Error ending insights chain: ${err}`);
    }
  }

  throw new Error('Failed to generate note after all retries');
}

/**
 * Generate note using unstructured LLM API (faster, no schema)
 * Alternative to generateNote() for testing performance
 */
export async function generateNoteUnstructured(
  model: string,
  template: string,
  collectedText: string[],
  systemPrompt: string,
  retries: number = 3
): Promise<string> {
  const { createUnstructuredClient } = await import('./llmClient');

  const provider = getProviderFromModel(model);
  const endpoint = getEndpointForProvider(provider).replace('_structured_', '_');
  const { system, user } = buildNotePrompt(systemPrompt, template, collectedText);

  debug.add('note_generation_unstructured_request', {
    model,
    provider,
    endpoint,
    templateLength: template.length,
    collectedTextCount: collectedText.length,
  });

  debug.add('note_generation_unstructured_prompt', { system, user });

  const client = createUnstructuredClient();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      log(`Generating note (unstructured) with ${model} (attempt ${attempt + 1}/${retries})...`);

      const noteText = await client.sendUnstructured({
        model,
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 4096,
      });

      debug.add('note_generation_unstructured_success', {
        noteLength: noteText.length,
      });

      log('Note generated successfully (unstructured mode)');
      return noteText;

    } catch (error) {
      log(`Error generating note (unstructured, attempt ${attempt + 1}):`);
      log(error);

      if (attempt === retries - 1) {
        debug.add('note_generation_unstructured_failed', { error: String(error) });
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error('Failed to generate note (unstructured) after all retries');
}

/**
 * Format transcribed text using GPT-5-nano
 * Fixes grammatical errors and adds proper punctuation
 * Uses simple OpenAI Responses API for speed
 */
export async function formatTranscriptText(
  text: string,
  retries: number = 3
): Promise<string> {
  const model = 'gpt-5-nano';
  const endpoint = '/api/openai_response';  // New simpler endpoint

  const instructions = "You are a grammar and punctuation correction assistant. Fix grammatical errors and add proper punctuation while preserving the original meaning and medical terminology. Only include the corrected text and nothing else in your response";
  const input = text;  // Just pass the text directly

  let attempt = 0;
  let lastError: Error | null = null;

  // Retry loop (same pattern as before)
  while (attempt < retries) {
    try {
      log(`[formatTranscriptText] Attempt ${attempt + 1}/${retries} with ${model}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: [
            { role: 'system', content: instructions },
            { role: 'user', content: input },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Simple parsing - just get output_text
      if (!data.output_text) {
        throw new Error('Invalid API response: missing output_text');
      }

      log('[formatTranscriptText] Successfully formatted text');
      return data.output_text;  // Direct text response, no JSON parsing needed

    } catch (error) {
      lastError = error as Error;
      log(`[formatTranscriptText] Attempt ${attempt + 1} failed: ${lastError.message}`);

      attempt++;
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to format text after ${retries} attempts: ${lastError?.message}`);
}
