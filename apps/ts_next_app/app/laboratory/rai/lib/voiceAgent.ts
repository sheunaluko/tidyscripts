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
  addInformationText: (text: string) => void;
  updateInformationText: (id: string, newText: string) => void;
  deleteInformationEntry: (id: string) => void;
  collectedInformation: Array<{ id: string; text: string; timestamp: Date }>;
  setInformationComplete: (complete: boolean) => void;
  setCurrentView: (view: 'template_picker' | 'information_input' | 'note_generator' | 'settings') => void;
  addToolCallThought: (thought: { timestamp: Date; toolName: string; thoughts: string; parameters?: Record<string, any> }) => void;
  closeSession?: () => Promise<void>;
}) {


  // Tool 1: Add patient information
  const addPatientInformation = tool({
    name: 'add_patient_information',
    description: 'Record patient information for the clinical note. Call this when the physician provides any clinical information. BE CONSISTENT AND ONLY RESPOND WITH noted or got it',
    parameters: z.object({
      information: z.string().describe('The information provided by the physician in natural language'),
      thoughts: z.string().describe('Your internal reasoning about this information, what you understand, and how it relates to the clinical note structure'),
    }),
    async execute({ information, thoughts }) {
      log('Tool called: add_patient_information');
      debug.add('voice_tool_add_info', { information, thoughts });

      // Add to store
      store.addInformationText(information);

      // Record thoughts for dev tools
      store.addToolCallThought({
        timestamp: new Date(),
        toolName: 'add_patient_information',
        thoughts,
        parameters: { information },
      });

      return 'Noted.';
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

  // Tool 3: Update patient information
  const updatePatientInformation = tool({
    name: 'update_information',
    description: 'Update a previously recorded information entry. Use this to correct or modify information that was recorded incorrectly.',
    parameters: z.object({
      item_number: z.number().describe('The item number to update (1-based, as displayed to the physician)'),
      new_information: z.string().describe('The updated/corrected information'),
      thoughts: z.string().describe('Your reasoning for updating this information'),
    }),
    async execute({ item_number, new_information, thoughts }) {
      log('Tool called: update_information');
      debug.add('voice_tool_update_info', { item_number, new_information, thoughts });

      // Convert 1-based item number to 0-based index
      const index = item_number - 1;

      // Validate index
      if (index < 0 || index >= store.collectedInformation.length) {
        log(`Invalid item number: ${item_number}`);
        return `Error: Item ${item_number} does not exist. There are ${store.collectedInformation.length} items.`;
      }

      // Get the entry ID
      const entry = store.collectedInformation[index];

      // Update the entry
      store.updateInformationText(entry.id, new_information);

      // Record thoughts for dev tools
      store.addToolCallThought({
        timestamp: new Date(),
        toolName: 'update_information',
        thoughts,
        parameters: { item_number, new_information },
      });

      return `Updated item ${item_number}.`;
    },
  });

  // Tool 4: Delete patient information
  const deletePatientInformation = tool({
    name: 'delete_information',
    description: 'Delete a previously recorded information entry. Use this when information was recorded incorrectly or is not needed.',
    parameters: z.object({
      item_number: z.number().describe('The item number to delete (1-based, as displayed to the physician)'),
      thoughts: z.string().describe('Your reasoning for deleting this information'),
    }),
    async execute({ item_number, thoughts }) {
      log('Tool called: delete_information');
      debug.add('voice_tool_delete_info', { item_number, thoughts });

      // Convert 1-based item number to 0-based index
      const index = item_number - 1;

      // Validate index
      if (index < 0 || index >= store.collectedInformation.length) {
        log(`Invalid item number: ${item_number}`);
        return `Error: Item ${item_number} does not exist. There are ${store.collectedInformation.length} items.`;
      }

      // Get the entry ID
      const entry = store.collectedInformation[index];

      // Delete the entry
      store.deleteInformationEntry(entry.id);

      // Record thoughts for dev tools
      store.addToolCallThought({
        timestamp: new Date(),
        toolName: 'delete_information',
        thoughts,
        parameters: { item_number },
      });

      return `Deleted item ${item_number}.`;
    },
  });

  return [addPatientInformation, updatePatientInformation, deletePatientInformation, informationComplete];
}

// Generate instructions for the agent based on selected template
export function generateInstructions(template: NoteTemplate | null): string {
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
- You can update previously recorded information using update_information with the item number
- You can delete information using delete_information with the item number
- If the physician asks to correct, change, or remove information, use these tools

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
    addInformationText: (text: string) => void;
    updateInformationText: (id: string, newText: string) => void;
    deleteInformationEntry: (id: string) => void;
    collectedInformation: Array<{ id: string; text: string; timestamp: Date }>;
    setInformationComplete: (complete: boolean) => void;
    setCurrentView: (view: 'template_picker' | 'information_input' | 'note_generator' | 'settings') => void;
    addToolCallThought: (thought: { timestamp: Date; toolName: string; thoughts: string; parameters?: Record<string, any> }) => void;
    closeSession?: () => Promise<void>;
  }
): RealtimeAgent {
  log('Creating RealtimeAgent...');

  const tools = createVoiceTools(store);
  const instructions = generateInstructions(template);

  debug.add('voice_agent_instructions', instructions);
  debug.add('voice_agent_tools', tools.map(t => t.name));

  const agent = new RealtimeAgent({
    name: 'Medical Assistant',
    instructions,
    tools,
  });

  log('RealtimeAgent created');
  return agent;
}
