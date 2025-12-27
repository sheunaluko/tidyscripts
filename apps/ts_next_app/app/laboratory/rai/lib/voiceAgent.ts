// Voice Agent Implementation with RealtimeAgent

import { RealtimeAgent } from '@openai/agents/realtime';
import { tool } from '@openai/agents';
import { z } from 'zod';
import * as tsw from 'tidyscripts_web';
import type { RaiState, NoteTemplate } from '../types';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

// Fetch ephemeral token for OpenAI Realtime API
export async function getEphemeralKey(): Promise<string> {
  try {
    log('Fetching ephemeral key for Realtime API...');
    const response = await fetch('/api/get-realtime-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to get ephemeral key: ${response.statusText}`);
    }

    const data = await response.json();
    debug.add('ephemeral_key_received', { success: true });
    return data.value;
  } catch (error) {
    log('Error fetching ephemeral key:');
    log(error);
    throw error;
  }
}

// Create voice agent tools with store access
export function createVoiceTools(
  template: NoteTemplate | null,
  store: {
    addInformationText: (text: string, suggestedVariable?: string | null) => void;
    updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => void;
    deleteInformationEntry: (id: string) => void;
    collectedInformation: Array<{ id: string; text: string; timestamp: Date; suggestedVariable?: string | null }>;
    setInformationComplete: (complete: boolean) => void;
    setCurrentView: (view: 'template_picker' | 'information_input' | 'note_generator' | 'settings') => void;
    addToolCallThought: (thought: { timestamp: Date; toolName: string; thoughts: string; parameters?: Record<string, any> }) => void;
    closeSession?: () => Promise<void>;
  }
) {


  // Tool 1: Add patient information
  const addPatientInformation = tool({
    name: 'add_patient_information',
    description: 'Record patient information for the clinical note. Call this when the physician provides any clinical information. If the information maps to a specific template field/variable, provide it in suggestedVariable (otherwise null). BE CONSISTENT AND ONLY RESPOND WITH noted or got it',
    parameters: z.object({
      information: z.string().describe('The information provided by the physician in natural language'),
      thoughts: z.string().describe('Your internal reasoning about this information, what you understand, and how it relates to the clinical note structure'),
      suggestedVariable: z.string().nullable().optional().describe('The template variable/field name this information corresponds to (e.g., "chief_complaint", "history_of_present_illness"), or null if no clear match'),
    }),
    async execute({ information, thoughts, suggestedVariable }) {
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

      return `The RENUMBERED current list is NOW:\n${renumberedList}\n\nSimply say added, and NOTHING else`;
    },
  });

  // Tool 2: Review template
  const reviewTemplate = tool({
    name: 'review_template',
    description: 'Call this when the physician says they are finished, BEFORE calling information_complete. Reviews the template for special instructions or required fields that must be completed.',
    parameters: z.object({
      thoughts: z.string().describe('Your assessment of what you are about to review'),
    }),
    async execute({ thoughts }) {
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
        .map((e, idx) => `${idx + 1}. "${e.text}"${e.suggestedVariable ? ` (→ ${e.suggestedVariable})` : ''}`)
        .join('\n');

      // Generate template text or indicate no template
      const templateText = template
        ? `${template.title}\n\n${template.template}`
        : 'No template selected';

      // Return structured review instructions
      return `TEMPLATE REVIEW INSTRUCTIONS:

1. CAREFULLY read the entire template text below, paying special attention to any instructions at the END of the template.

2. Look for:
   - Required variables or fields that MUST be completed (often marked as "REQUIRED:", "MUST INCLUDE:", etc.)
   - Special instructions about what information is mandatory
   - Specific requirements for note completion
   - Any conditional logic or required sections

3. Compare the template requirements against the information you have collected from the physician.

4. If ANY required information is missing:
   - Clearly notify the physician what specific information is still needed
   - Reference the template requirement directly
   - Ask if they want to provide it now or proceed without it

5. If ALL requirements are satisfied OR no special requirements exist:
   - Acknowledge that the information is complete
   - Proceed to call the information_complete tool

TEMPLATE TO REVIEW:
${templateText}

COLLECTED INFORMATION:
${collectedList || 'No information collected yet'}`;
    },
  });

  // Tool 3: Information complete
  const informationComplete = tool({
    name: 'information_complete',
    description: 'Call this when the physician indicates they are finished providing information (e.g., says "finished", "done", "that\'s all"). Do not say that the note is complete, just say generating note then STOP TALKING',
    parameters: z.object({
      confirmation: z.string().optional().describe('Optional confirmation message'),
      thoughts: z.string().describe('Your assessment of the information collection process and readiness to generate the note'),
    }),
    async execute({ confirmation, thoughts }) {
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

      // Close session after 5 seconds to allow agent to finish speaking
      if (store.closeSession) {
        setTimeout(async () => {
          try {
            await store.closeSession!();
            log('Session closed after information_complete');
          } catch (error) {
            log('Error closing session after information_complete:');
            log(error);
          }
        }, 5000);
      }

      return 'Generating note.';
    },
  });

  return [addPatientInformation, reviewTemplate, informationComplete];
}

// Generate instructions for the agent based on selected template and current information
export function generateInstructions(
  template: NoteTemplate | null,
  collectedInformation: Array<{ id: string; text: string; timestamp: Date }>
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

Information Management:
- Each piece of information you record is numbered (starting from 1)
- When you record information, you will receive confirmation with the current numbered list

When the physician provides any clinical information:
1. Call the add_patient_information tool with the information as natural language text
2. Respond with a brief acknowledgment like "noted" or "got it"
3. BE CONSISTENT AND ONLY RESPOND WITH noted or got it
4. You can see the template structure above - listen for information related to those fields, but accept any clinical information the physician provides

When the physician indicates they are finished (says "finished", "done", "that's all", etc.):
1. FIRST call the review_template tool to check for any required information
2. The review_template tool will return instructions and the template text for you to analyze
3. Follow the review instructions carefully to determine if all required information is present
4. If any required information is missing, notify the physician and ask if they want to provide it
5. If all requirements are satisfied, acknowledge and call the information_complete tool
6. Only after calling information_complete, say "generating note"

Keep all responses brief and professional. You don't need to extract structured data - just collect what the physician says naturally and use the tools to record it.`;
}

// Create and initialize the RealtimeAgent
export function createRealtimeAgent(
  template: NoteTemplate | null,
  store: {
    addInformationText: (text: string, suggestedVariable?: string | null) => void;
    updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => void;
    deleteInformationEntry: (id: string) => void;
    collectedInformation: Array<{ id: string; text: string; timestamp: Date; suggestedVariable?: string | null }>;
    setInformationComplete: (complete: boolean) => void;
    setCurrentView: (view: 'template_picker' | 'information_input' | 'note_generator' | 'settings') => void;
    addToolCallThought: (thought: { timestamp: Date; toolName: string; thoughts: string; parameters?: Record<string, any> }) => void;
    closeSession?: () => Promise<void>;
  }
): RealtimeAgent {
  log('Creating RealtimeAgent...');

  const tools = createVoiceTools(template, store);

  // Initial instructions (will be updated automatically by useEffect in useVoiceAgent)
  const initialInstructions = generateInstructions(template, store.collectedInformation);

  debug.add('voice_agent_tools', tools.map(t => t.name));
  debug.add('voice_agent_created', {
    itemCount: store.collectedInformation.length,
    instructionsLength: initialInstructions.length,
    timestamp: new Date().toISOString(),
  });

  const agent = new RealtimeAgent({
    name: 'Medical Assistant',
    instructions: initialInstructions,  // Static string, updated via session.update
    tools,
  });

  log('RealtimeAgent created with initial instructions');
  return agent;
}
