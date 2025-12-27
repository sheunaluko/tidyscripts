/**
 * OpenAI Realtime API - Minimal Example: Updating Agent Instructions
 * 
 * Shows how to:
 * 1. Create a RealtimeAgent and RealtimeSession
 * 2. Update the agent's instructions mid-conversation
 * 3. Listen for confirmation that the update was applied
 */

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

// -----------------------------------------------------------------------------
// 1. Create the initial agent
// -----------------------------------------------------------------------------

const agent = new RealtimeAgent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant. Be concise.',
});

// -----------------------------------------------------------------------------
// 2. Create the session
// -----------------------------------------------------------------------------

const session = new RealtimeSession(agent);

// -----------------------------------------------------------------------------
// 3. Listen for the session.updated confirmation event
// -----------------------------------------------------------------------------

session.on('transport_event', (event) => {
  // The transport_event fires for ALL raw OpenAI Realtime API events
  
  if (event.type === 'session.updated') {
    // This confirms the session update was successfully applied
    console.log('✅ Instructions updated successfully!');
    console.log('New instructions:', event.session.instructions);
  }
  
  if (event.type === 'error') {
    // Handle any errors during the update
    console.error('❌ Error:', event.error.message);
  }
});

// Optional: Listen for agent-level events
session.on('agent_start', ({ agent }) => {
  console.log(`Agent started: ${agent.name}`);
});

// -----------------------------------------------------------------------------
// 4. Connect to the Realtime API
// -----------------------------------------------------------------------------

async function main() {
  // Get ephemeral key from your backend
  const ephemeralKey = await getEphemeralKey();
  
  await session.connect({ apiKey: ephemeralKey });
  console.log('Connected to Realtime API');
  
  // -----------------------------------------------------------------------------
  // 5. Update instructions (can be called anytime after connect)
  // -----------------------------------------------------------------------------
  
  // Method: Clone the agent with new instructions and call updateAgent()
  const updatedAgent = agent.clone({
    instructions: 'You are now a pirate! Speak like a pirate in all responses. Arrr!',
  });
  
  session.updateAgent(updatedAgent);
  console.log('Sent instruction update...');
  
  // The session.updated event (handled above) will confirm the update
}

// -----------------------------------------------------------------------------
// Helper: Get ephemeral key from your backend
// -----------------------------------------------------------------------------

async function getEphemeralKey(): Promise<string> {
  // In a real app, fetch this from your backend:
  // const response = await fetch('/api/realtime-token');
  // const { apiKey } = await response.json();
  // return apiKey;
  
  // For this example, using environment variable
  return process.env.OPENAI_EPHEMERAL_KEY || 'ek_...';
}

// -----------------------------------------------------------------------------
// Run
// -----------------------------------------------------------------------------

main().catch(console.error);


/**
 * NOTES:
 * 
 * How updateAgent() works under the hood:
 * - Calls session.update on the OpenAI Realtime API with new instructions/tools
 * - The API responds with a session.updated event confirming the change
 * - Instructions take effect immediately for the next model response
 * 
 * What you CAN update mid-session:
 * - instructions
 * - tools
 * - turn_detection settings
 * - input_audio_transcription settings
 * 
 * What you CANNOT update mid-session:
 * - voice (only before first audio output)
 * - model (fixed at session creation)
 * 
 * Alternative: Dynamic instructions function
 * Instead of updating, you can use a function that generates instructions:
 * 
 *   const agent = new RealtimeAgent({
 *     name: 'Assistant',
 *     instructions: (ctx) => `You are helping ${ctx.context?.userName}`,
 *   });
 */