/**
 * RAI Agent - Voice Agent for Medical Note Collection
 *
 * This agent uses the Cortex class with RAI-specific tools for collecting
 * clinical information and generating medical notes.
 */

import * as tsw from 'tidyscripts_web';
import { Cortex } from 'tidyscripts_common/src/apis/cortex/cortex';
import type { Function as CortexFunction, CortexOps } from 'tidyscripts_common/src/apis/cortex/types';
import type { NoteTemplate, InformationEntry } from '../types';
import { getExecutor } from '../../cortex_0/src/IframeSandbox';
import { createStructuredClient } from './llmClient';

const log = tsw.common.logger.get_logger({ id: 'rai_agent' });
const debug = tsw.common.util.debug;

// Store interface for RAI agent tools
export interface RaiStoreInterface {
  addInformationText: (text: string, suggestedVariable?: string | null) => void;
  updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => void;
  deleteInformationEntry: (id: string) => void;
  collectedInformation: InformationEntry[];
  setInformationComplete: (complete: boolean) => void;
  setCurrentView: (view: 'template_picker' | 'information_input' | 'note_generator' | 'settings') => void;
  addToolCallThought: (thought: { timestamp: Date; toolName: string; thoughts: string; parameters?: Record<string, any> }) => void;
  addTranscriptEntry: (entry: { timestamp: Date; speaker: 'user' | 'agent' | 'system'; text: string }) => void;
}

// Create RAI-specific functions
function createRaiFunctions(
  template: NoteTemplate | null,
  store: RaiStoreInterface,
  onComplete?: () => void
): CortexFunction[] {

  // Tool 1: Add patient information
  const addPatientInformation: CortexFunction = {
    name: 'add_patient_information',
    description: 'Record patient information for the clinical note. Call this when the physician provides any clinical information. If the information maps to a specific template field/variable, provide it in suggestedVariable (otherwise null).',
    parameters: {
      type: 'object',
      properties: {
        information: {
          type: 'string',
          description: 'The information provided by the physician in natural language'
        },
        thoughts: {
          type: 'string',
          description: 'Your internal reasoning about this information and how it relates to the clinical note'
        },
        suggestedVariable: {
          type: ['string', 'null'],
          description: 'The template variable/field name this information corresponds to (e.g., "chief_complaint"), or null if no clear match'
        }
      },
      required: ['information', 'thoughts']
    },
    return_type: 'string',
    enabled: true,
    fn: async (ops: any) => {
      const { information, thoughts, suggestedVariable } = ops.params;
      log('Tool called: add_patient_information');
      debug.add('voice_tool_add_info', { information, thoughts, suggestedVariable });

      // Add to store with suggestedVariable
      store.addInformationText(information, suggestedVariable);

      // Record thoughts for dev tools
      store.addToolCallThought({
        timestamp: new Date(),
        toolName: 'add_patient_information',
        thoughts,
        parameters: { information, suggestedVariable },
      });

      // Generate renumbered list
      const renumberedList = store.collectedInformation
        .map((e, idx) => `${idx + 1}. "${e.text}"`)
        .join('\n');

      return `Information recorded. Current list:\n${renumberedList}\n\nRespond with a brief acknowledgment like "noted" or "got it".`;
    }
  };

  // Tool 2: Review template
  const reviewTemplate: CortexFunction = {
    name: 'review_template',
    description: 'Call this when the physician says they are finished, BEFORE calling information_complete. Reviews the template for special instructions or required fields.',
    parameters: {
      type: 'object',
      properties: {
        thoughts: {
          type: 'string',
          description: 'Your assessment of what you are about to review'
        }
      },
      required: ['thoughts']
    },
    return_type: 'string',
    enabled: true,
    fn: async (ops: any) => {
      const { thoughts } = ops.params;
      log('Tool called: review_template');
      debug.add('voice_tool_review', { thoughts });

      // Record thoughts for dev tools
      store.addToolCallThought({
        timestamp: new Date(),
        toolName: 'review_template',
        thoughts,
        parameters: {},
      });

      // Generate collected information list
      const collectedList = store.collectedInformation
        .map((e, idx) => `${idx + 1}. "${e.text}"${e.suggestedVariable ? ` (-> ${e.suggestedVariable})` : ''}`)
        .join('\n');

      // Generate template text or indicate no template
      const templateText = template
        ? `${template.title}\n\n${template.template}`
        : 'No template selected';

      // Return structured review instructions
      return `TEMPLATE REVIEW INSTRUCTIONS:

1. CAREFULLY read the entire template text included here, paying special attention to any text that occurs after the @END_TEMPLATE marker.

2. If there is no @END_TEMPLATE marker then finish your review and call the information_complete tool. Do not prompt the user for confirmation or missing variables.

3. If there is an @END_TEMPLATE marker, then closely review the information after this marker to see if the user has provided special instructions. These may include reminders to fulfill specific variables before proceeding.

4. If these instructions need to be addressed, please address them prior to proceeding.

TEMPLATE TO REVIEW:
${templateText}

COLLECTED INFORMATION:
${collectedList || 'No information collected yet'}`;
    }
  };

  // Tool 3: Information complete
  const informationComplete: CortexFunction = {
    name: 'information_complete',
    description: 'Call this when the physician indicates they are finished providing information (e.g., says "finished", "done", "that\'s all"). Say "generating note" then STOP TALKING.',
    parameters: {
      type: 'object',
      properties: {
        confirmation: {
          type: 'string',
          description: 'Optional confirmation message'
        },
        thoughts: {
          type: 'string',
          description: 'Your assessment of the information collection process and readiness to generate the note'
        }
      },
      required: ['thoughts']
    },
    return_type: 'string',
    enabled: true,
    fn: async (ops: any) => {
      const { confirmation, thoughts } = ops.params;
      log('Tool called: information_complete');
      debug.add('voice_tool_complete', { confirmation, thoughts });

      // Record thoughts for dev tools
      store.addToolCallThought({
        timestamp: new Date(),
        toolName: 'information_complete',
        thoughts,
        parameters: { confirmation },
      });

      // Mark information as complete
      store.setInformationComplete(true);

      // Navigate to note generator
      store.setCurrentView('note_generator');

      // Call completion callback if provided
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1000);
      }

      return 'Generating note.';
    }
  };

  // Tool 4: Respond to user (for sending spoken responses)
  const respondToUser: CortexFunction = {
    name: 'respond_to_user',
    description: 'Send a spoken response to the physician. Use this for acknowledgments, clarifications, or questions.',
    parameters: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: 'The text to speak to the physician'
        }
      },
      required: ['response']
    },
    return_type: 'string',
    enabled: true,
    fn: async (ops: any) => {
      const { response } = ops.params;
      log(`respond_to_user: ${response}`);

      // Add to transcript
      store.addTranscriptEntry({
        timestamp: new Date(),
        speaker: 'agent',
        text: response,
      });

      return response;
    }
  };

  return [addPatientInformation, reviewTemplate, informationComplete, respondToUser];
}

// Generate instructions for the RAI agent
export function generateRaiInstructions(
  template: NoteTemplate | null,
  collectedInformation: InformationEntry[]
): string {
  let templateInfo = 'No template selected';

  if (template) {
    templateInfo = `Template: ${template.title}
${template.description}

Template structure:
\`\`\`
${template.template}
\`\`\``;
  }

  return `You are a medical assistant helping a physician collect information for a clinical note.

${templateInfo}

When the session starts, greet the physician briefly and say "Ready for input. Say 'finished' when done."

CRITICAL: You MUST use the respond_to_user tool to send ALL your spoken responses. Never respond with plain text.

Information Management:
- Each piece of information you record is numbered (starting from 1)
- When you record information, you will receive confirmation with the current numbered list

When the physician provides any clinical information:
1. Call the add_patient_information tool with the information as natural language text
2. Call respond_to_user with a brief acknowledgment like "noted" or "got it"
3. BE CONSISTENT AND ONLY RESPOND WITH noted or got it via respond_to_user
4. You can see the template structure above - listen for information related to those fields, but accept any clinical information the physician provides

When the physician indicates they are finished (says "finished", "done", "that's all", etc.):
1. FIRST call the review_template tool to check for any required information
2. The review_template tool will return instructions and the template text for you to analyze
3. Follow the review instructions (text after @END_TEMPLATE) carefully to determine if all required information is present
4. If any required information specified after @END_TEMPLATE is missing, call respond_to_user to notify the physician and ask if they want to provide it
5. If all requirements are satisfied or there is no @END_TEMPLATE marker, acknowledge and call the information_complete tool
6. Only after calling information_complete, call respond_to_user with "generating note"

Keep all responses brief and professional. You don't need to extract structured data - just collect what the physician says naturally and use the tools to record it.`;
}

// Use IframeSandbox for actual code execution (tool calls are generated as JS code by Cortex)
const raiSandbox = getExecutor();

/**
 * Create and return an RAI agent instance
 */
export function get_agent(
  modelName: string = 'gpt-5-mini',
  template: NoteTemplate | null,
  store: RaiStoreInterface,
  insightsClient?: any,
  onComplete?: () => void
): Cortex {
  log(`Creating RAI agent with model: ${modelName}`);

  const functions = createRaiFunctions(template, store, onComplete);
  const instructions = generateRaiInstructions(template, store.collectedInformation);

  const ops: CortexOps = {
    model: modelName,
    name: 'rai_assistant',
    functions,
    additional_system_msg: instructions,
    insights: insightsClient,
    sandbox: raiSandbox,
    utilities: {
      sounds: {
        error: tsw.util.sounds.error,
        activated: tsw.util.sounds.input_ready,
        ok: tsw.util.sounds.proceed,
        success: tsw.util.sounds.success
      }
    }
  };

  const agent = new Cortex(ops);

  // Configure user output handler
  agent.configure_user_output((text: string) => {
    log(`Agent output: ${text}`);
    store.addTranscriptEntry({
      timestamp: new Date(),
      speaker: 'agent',
      text,
    });
  });

  debug.add('rai_agent_created', {
    model: modelName,
    templateId: template?.id,
    functionCount: functions.length,
    timestamp: new Date().toISOString(),
  });

  return agent;
}

/**
 * Update agent instructions (for when template or information changes)
 */
export function updateAgentInstructions(
  agent: Cortex,
  template: NoteTemplate | null,
  collectedInformation: InformationEntry[]
): void {
  const newInstructions = generateRaiInstructions(template, collectedInformation);
  // Note: Cortex doesn't have a direct method to update system message,
  // but the functions already have access to the store which has current data
  log('Agent instructions context updated');
}

// ============================================================================
// STANDALONE REVIEW FUNCTION (for simplified voice flow)
// ============================================================================

export interface ReviewResult {
  action: 'proceed' | 'user_message';
  message?: string;
}

/**
 * Review collected information against template requirements.
 * Makes a single structured LLM call to check if @END_TEMPLATE
 * requirements are satisfied.
 *
 * If no @END_TEMPLATE marker exists in the template, returns { action: 'proceed' }.
 */
export async function reviewTemplate(
  template: NoteTemplate | null,
  collectedInformation: InformationEntry[],
  model: string = 'gpt-5-mini',
  insightsClient?: any
): Promise<ReviewResult> {
  // No template or no @END_TEMPLATE marker → proceed directly
  if (!template) {
    return { action: 'proceed' };
  }

  if (!template.template.includes('@END_TEMPLATE')) {
    log('No @END_TEMPLATE marker found, proceeding directly');
    return { action: 'proceed' };
  }

  // Extract the text after @END_TEMPLATE
  const endMarkerIndex = template.template.indexOf('@END_TEMPLATE');
  const instructionsAfterMarker = template.template.substring(
    endMarkerIndex + '@END_TEMPLATE'.length
  ).trim();

  if (!instructionsAfterMarker) {
    log('@END_TEMPLATE marker found but no instructions after it');
    return { action: 'proceed' };
  }

  // Build collected information list
  const collectedList = collectedInformation
    .map((e, idx) => `${idx + 1}. "${e.text}"`)
    .join('\n');

  const systemPrompt = `You are a medical assistant reviewing collected patient information before generating a clinical note. You must determine if the collected information satisfies the requirements specified in the template instructions.

Respond with a JSON object: { "action": "proceed" } if requirements are met, or { "action": "user_message", "message": "<brief message about what's missing>" } if not.

Keep any user_message very brief (one sentence max) — it will be spoken aloud.`;

  const userPrompt = `TEMPLATE: ${template.title}

INSTRUCTIONS AFTER @END_TEMPLATE (requirements to check):
${instructionsAfterMarker}

COLLECTED INFORMATION:
${collectedList || 'No information collected yet'}

Are the requirements in the instructions satisfied by the collected information? Respond with the appropriate JSON action.`;

  const startTime = Date.now();
  try {
    const client = createStructuredClient();
    const result = await client.sendStructured<ReviewResult>({
      model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['proceed', 'user_message'],
          },
          message: {
            type: 'string',
          },
        },
        required: ['action', 'message'],
        additionalProperties: false,
      },
      schema_name: 'review_result',
    }, 2); // 2 retries

    const latency = Date.now() - startTime;
    log(`Review result: ${JSON.stringify(result)} (${latency}ms)`);

    try {
      insightsClient?.addEvent('voice_review_llm', {
        model, action: result.action, message: result.message,
        latency_ms: latency, status: 'success',
      });
    } catch (_) {}

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    log(`Review LLM call failed (${latency}ms): ${error}`);

    try {
      insightsClient?.addEvent('voice_review_llm', {
        model, error: String(error), latency_ms: latency, status: 'error',
      }, { tags: ['error'] });
    } catch (_) {}

    // On error, proceed anyway rather than blocking the user
    return { action: 'proceed' };
  }
}
