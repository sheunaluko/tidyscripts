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
export function createVoiceTools(store: {
  addInformationText: (text: string, suggestedVariable?: string | null) => void;
  updateInformationText: (id: string, newText: string, suggestedVariable?: string | null) => void;
  deleteInformationEntry: (id: string) => void;
  collectedInformation: Array<{ id: string; text: string; timestamp: Date; suggestedVariable?: string | null }>;
  setInformationComplete: (complete: boolean) => void;
  setCurrentView: (view: 'template_picker' | 'information_input' | 'note_generator' | 'settings') => void;
  addToolCallThought: (thought: { timestamp: Date; toolName: string; thoughts: string; parameters?: Record<string, any> }) => void;
  closeSession?: () => Promise<void>;
}) {


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

  // Tool 2: Information complete
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

  return [addPatientInformation, informationComplete];
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
1. Say some form of acknowledgement then say "generating note"
2. Call the information_complete tool

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

  const tools = createVoiceTools(store);

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
