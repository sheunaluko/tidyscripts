// Note Generator - Provider-agnostic structured LLM calls

import { z } from 'zod';
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
 * Build the prompt for note generation
 */
export function buildNotePrompt(
  systemPrompt: string,
  template: string,
  collectedText: string[]
): { system: string; user: string } {
  const freeTextEntries = collectedText.map((text, i) => `${i + 1}. ${text}`).join('\n');
  const syntaxInstructions = formatTemplateSyntaxForPrompt();

  const userPrompt = `Template:
${template}

Collected Information (free text from physician):
${freeTextEntries}

Task:
1. Extract relevant information from the collected text to fill template variables
2. The template uses TWO types of conditional syntax:
${syntaxInstructions}

3. For each {{ ... }} block:
   - Check if it has one | (presence/absence) or two | (boolean with ?)
   - Extract the relevant information from collected text
   - Apply the appropriate conditional logic
   - Substitute with the correct text

4. Format as clean, professional markdown for medical documentation
5. Preserve the natural flow of the note

Output only the completed note with all substitutions made.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}

/**
 * Convert Zod schema to JSON Schema format for API
 */
function zodToJsonSchema(schema: z.ZodType): any {
  // Simple conversion for our use case
  // For production, use zod-to-json-schema library
  return {
    type: 'object',
    properties: {
      note: {
        type: 'string',
        description: 'Formatted markdown note with all template variables filled',
      },
    },
    required: ['note'],
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
  retries: number = 3
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

  for (let attempt = 0; attempt < retries; attempt++) {
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
          schema: zodToJsonSchema(NoteOutputSchema),
          schema_name: 'NoteOutput',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      debug.add('note_generation_raw_response', data);

      // Parse the response based on API format
      let parsedOutput: any;
      if (data.output) {
        // New format from structured response APIs
        parsedOutput = typeof data.output === 'string' ? JSON.parse(data.output) : data.output;
      } else if (data.choices && data.choices[0]?.message?.content) {
        // Fallback format
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

      log('Note generated successfully');
      return validated.note;
    } catch (error) {
      log(`Error generating note (attempt ${attempt + 1}):` );
      log(error);

      if (attempt === retries - 1) {
        debug.add('note_generation_failed', { error: String(error) });
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error('Failed to generate note after all retries');
}
