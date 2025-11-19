'use client';

import React, {useEffect} from 'react';

import { Button, Typography, Container, Box, TextField, Stack, Paper } from '@mui/material';
import ReactMarkdown from 'react-markdown';

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { tool } from '@openai/agents';
import { z } from 'zod';

import * as tsc from 'tidyscripts_common'
import * as tsw from 'tidyscripts_web'

const log = tsc.logger.get_logger({id:"neocortex"}) ;

/*
	Todo: enable ability to fetch source code for a node so that the implementation can be retrieved
	- get_source_for_node(id) ;
	- FYI neo_cortex writes logs using tes to ./info , and claude can read these (errors, can fix)
	- start working toward MVP of storing logs into surreal backend
	  	- need to teach the agent how to craft the sql queries

	- do some meta thinking about web agent <-> local claude interface - what are architectural opporunities for automated local code development, esp leveraging the queryable code-base
	
*/

declare var window : any ;



// ============================================================================
// CUSTOM TOOLS SECTION - Add your tools here
// ============================================================================
// Define your custom tools below using the tool() helper from @openai/agents
// Each tool should have: name, description, parameters (zod schema), and execute function
//
// Example:
// const myTool = tool({
//   name: 'my_tool_name',
//   description: 'What this tool does - the AI uses this to decide when to call it',
//   parameters: z.object({
//     param1: z.string().describe('Description of param1'),
//     param2: z.number().optional().describe('Description of param2'),
//   }),
//   async execute({ param1, param2 }) {
//     // Your implementation here
//     const result = await doSomething(param1, param2);
//     return `Result: ${result}`;
//   },
// });

// Example Tool 1: Get current time
const getCurrentTime = tool({
  name: 'get_current_time',
  description: 'Get the current date and time',
  parameters: z.object({}),
  async execute() {
    const now = new Date();
    return `Current time: ${now.toLocaleString()}`;
  },
});

// ADD YOUR CUSTOM TOOLS HERE


const tidyscripts_search = tool({
  name: 'search_tidyscripts_codebase',
  description: 'Searches the tidyscripts codebase for modules, functions, etc that match a query',
  parameters: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 10)'),
  }),
  async execute({ query, limit = 10 }) {
    try {
      let result = await tsc.tes.localhost.dev.surreal.get_node_info_for_query(query, limit);
      log(`Got search result for "${query}":`)
      log(result);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      log(`Error in tidyscripts_search: ${error}`);
      throw error; // Let the agent handle it with report_error
    }
  },
});

const report_error = tool({
  name: 'report_error',
  description: 'Report errors encountered during tool execution or conversation. Use this to log debugging information when something goes wrong.',
  parameters: z.object({
    error_type: z.string().describe('Type of error (e.g., "tool_execution_error", "parameter_error", "unexpected_result")'),
    tool_name: z.string().optional().describe('Name of the tool that caused the error, if applicable'),
    error_message: z.string().describe('Description of what went wrong'),
    context: z.string().optional().describe('Additional context or debugging information'),
    attempted_action: z.string().optional().describe('What you were trying to do when the error occurred'),
  }),
  async execute({ error_type, tool_name, error_message, context, attempted_action }) {
    const timestamp = new Date().toISOString();
    const errorReport = {
      timestamp,
      error_type,
      tool_name,
      error_message,
      context,
      attempted_action,
    };

    console.error('🔴 Agent Error Report:', errorReport);
    log('Agent reported error:'); log(errorReport);

    // Write error to timestamped JSON file
    const filename = `error_${timestamp.replace(/:/g, '-').replace(/\./g, '-')}.json`;
    const filepath = `./apps/ts_next_app/app/laboratory/neo_cortex/info/${filename}`;

    try {
      await tsc.tes.localhost.node.io.write_json(filepath, errorReport);
      log(`Error report saved to: ${filepath}`);
    } catch (writeError) {
      console.error('Failed to write error report to file:', writeError);
    }

    return 'Error has been logged. I will try a different approach or let you know what went wrong.';
  },
});


// Array of all custom tools to be loaded into the agent
// Add or remove tools from this array to enable/disable them
const CUSTOM_TOOLS = [
    getCurrentTime,
    tidyscripts_search,
    report_error, 
];

// ============================================================================
// END CUSTOM TOOLS SECTION
// ============================================================================

// Default prompts - Generic and customizable
const DEFAULT_INSTRUCTIONS = `You are a helpful AI assistant having a voice conversation with a user.
Maintain a conversational and friendly tone.
Be helpful, concise, and engaging in your responses.
You have access to various tools - use them when appropriate to help the user.

IMPORTANT: If you encounter any errors while using tools or during the conversation:
- Use the report_error tool to log detailed information about what went wrong
- Include the error type, tool name (if applicable), error message, and any relevant context
- After reporting, try an alternative approach or inform the user about the issue
- Always report errors before informing the user so we have proper debugging information`;

const DEFAULT_SUMMARIZATION_PROMPT = `Generate a summary of the key points of the conversation for review`;

// Function to generate summary using conversation history
async function generateSummary(history: any[], summarizationPrompt: string): Promise<string> {
  console.log('Full conversation history:', history);
  console.log('History JSON:', JSON.stringify(history, null, 2));

  // Just stringify the entire history and let the AI parse it
  const historyJSON = JSON.stringify(history, null, 2);

  // Call the chat API
  const response = await fetch('/api/open_ai_chat_2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: summarizationPrompt + '\n\nExtract the conversation from the JSON history provided. Look for user messages and assistant responses, including any transcripts or text content.',
        },
        {
          role: 'user',
          content: `Here is the conversation history in JSON format:\n\n${historyJSON}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Function to get a fresh ephemeral key from your backend
async function getEphemeralKey() {
  const response = await fetch('/api/get-realtime-token', {
    method: 'POST',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API error response:', errorText);
    throw new Error(`Failed to get ephemeral key: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('API response:', data);

  // Check if the response has the expected structure
  // The API can return either { value: "ek_...", ... } or { client_secret: { value: "ek_..." } }
  let ephemeralKey: string;

  if (data.value) {
    // New format: direct value
    ephemeralKey = data.value;
  } else if (data.client_secret?.value) {
    // Old format: nested under client_secret
    ephemeralKey = data.client_secret.value;
  } else {
    console.error('Unexpected API response structure:', data);
    throw new Error('Invalid API response structure - no ephemeral key found');
  }

  return ephemeralKey;
}

export async function start_agent(
  providedKey: string | undefined,
  instructions: string,
  onDoneCallback: () => void,
  customTools: any[] = [] // Accept custom tools array
) {
  try {
    // Use provided key or get a fresh ephemeral key
    const key = providedKey || await getEphemeralKey();
    console.log('Using ephemeral key:', key);

    // Create a tool to detect when user says they're done
    const conversationComplete = tool({
      name: 'conversation_complete',
      description: 'Call this when the user indicates they are done with the conversation (e.g., says "Im done", "thats all", "goodbye", etc.)',
      parameters: z.object({
        reason: z.string().optional().describe('Why the conversation is ending'),
      }),
      async execute({ reason }) {
        console.log('User indicated conversation is complete:', reason);
        // Trigger the done callback
        onDoneCallback();
        return 'Thank you for your time. Generating summary...';
      },
    });

    // Combine built-in tools with custom tools
    const allTools = [conversationComplete, ...customTools];

    const agent = new RealtimeAgent({
      name: 'Assistant',
      instructions: instructions,
      tools: allTools,
    });

    const session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
      config: {
        inputAudioFormat: 'pcm16',
        outputAudioFormat: 'pcm16',
        inputAudioTranscription: {
          model: 'whisper-1',
        },
      },
    });

    console.log('Attempting to connect with session config...');

    // Automatically connects your microphone and audio output in the browser via WebRTC.
    await session.connect({
      apiKey: key,
    });

    console.log('Agent connected successfully!');
    return { agent, session };
  } catch (e) {
    console.error('Failed to start agent:', e);
    throw e; // Re-throw to handle it in the component
  }
}



// Props interface for custom tools support
interface NeoCortexProps {
    customTools?: any[];
    defaultInstructions?: string;
    defaultSummarizationPrompt?: string;
}

const NeoCortex: React.FC<NeoCortexProps> = ({
    customTools = CUSTOM_TOOLS, // Use built-in tools by default
    defaultInstructions = DEFAULT_INSTRUCTIONS,
    defaultSummarizationPrompt = DEFAULT_SUMMARIZATION_PROMPT,
}) => {
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [isConnected, setIsConnected] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [providedKey, setProvidedKey] = React.useState('');
    const [instructions, setInstructions] = React.useState(defaultInstructions);
    const [summarizationPrompt, setSummarizationPrompt] = React.useState(defaultSummarizationPrompt);
    const [summary, setSummary] = React.useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false);


    useEffect( ()=> {
	Object.assign(window, {tsc,tsw}) ;
    },[])

    const handleGenerateSummary = async () => {
        if (!window.session?.history) {
            setError('No conversation history available');
            return;
        }

        setIsGeneratingSummary(true);
        setError(null);

        try {
            const summaryText = await generateSummary(window.session.history, summarizationPrompt);
            setSummary(summaryText);
            console.log('Summary generated successfully');
        } catch (error: any) {
            console.error('Error generating summary:', error);
            setError(error.message || 'Failed to generate summary');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleInitialize = async () => {
        setIsConnecting(true);
        setError(null);
        setSummary(null); // Clear previous summary

        try {
            let tmp = await start_agent(undefined, instructions, handleGenerateSummary, customTools);
            window.agent = tmp.agent;
            window.session = tmp.session;
            setIsConnected(true);
            console.log('Voice agent initialized successfully');
        } catch (error: any) {
            console.error('Error initializing voice agent:', error);
            setError(error.message || 'Failed to initialize voice agent');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleInitializeWithKey = async () => {
        if (!providedKey.trim()) {
            setError('Please enter an API key');
            return;
        }

        setIsConnecting(true);
        setError(null);
        setSummary(null); // Clear previous summary

        try {
            let tmp = await start_agent(providedKey.trim(), instructions, handleGenerateSummary, customTools);
            window.agent = tmp.agent;
            window.session = tmp.session;
            setIsConnected(true);
            console.log('Voice agent initialized successfully with provided key');
        } catch (error: any) {
            console.error('Error initializing voice agent:', error);
            setError(error.message || 'Failed to initialize voice agent');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Stack spacing={3}>
                    <Typography variant='h4' gutterBottom>
                        Neo Cortex - Voice Agent
                    </Typography>
                    <Typography variant='body1' gutterBottom>
                        Generic configurable voice agent powered by OpenAI Realtime API
                    </Typography>
                    {customTools.length > 0 && (
                        <Typography variant='body2' color='text.secondary'>
                            {customTools.length} custom tool{customTools.length > 1 ? 's' : ''} loaded
                        </Typography>
                    )}

                    {/* Instructions and Summarization Prompts */}
                    <TextField
                        label='Instructions Prompt'
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        disabled={isConnecting || isConnected}
                        fullWidth
                        multiline
                        rows={6}
                        helperText="This prompt guides the agent's behavior during the conversation"
                    />

                    <TextField
                        label='Summarization Prompt'
                        value={summarizationPrompt}
                        onChange={(e) => setSummarizationPrompt(e.target.value)}
                        disabled={isConnecting || isConnected}
                        fullWidth
                        multiline
                        rows={2}
                        helperText="This prompt is used to generate the conversation summary"
                    />

                    {/* Initialize Buttons */}
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={handleInitialize}
                        disabled={isConnecting || isConnected}
                        fullWidth
                    >
                        {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Initialize (with backend)'}
                    </Button>

                    <Typography variant='body2' sx={{ textAlign: 'center' }}>
                        OR
                    </Typography>

                    <TextField
                        label='Ephemeral Key'
                        placeholder='ek_...'
                        value={providedKey}
                        onChange={(e) => setProvidedKey(e.target.value)}
                        disabled={isConnecting || isConnected}
                        fullWidth
                        size='small'
                    />

                    <Button
                        variant='outlined'
                        color='primary'
                        onClick={handleInitializeWithKey}
                        disabled={isConnecting || isConnected || !providedKey.trim()}
                        fullWidth
                    >
                        Initialize with provided key
                    </Button>

                    {/* Status Messages */}
                    {error && (
                        <Typography variant='body2' color='error' sx={{ mt: 2 }}>
                            Error: {error}
                        </Typography>
                    )}
                    {isConnected && (
                        <Typography variant='body2' color='success' sx={{ mt: 2 }}>
                            Voice agent is ready! Say Im done when finished, or click Generate Summary below.
                        </Typography>
                    )}

                    {/* Generate Summary Button */}
                    {isConnected && (
                        <Button
                            variant='contained'
                            color='secondary'
                            onClick={handleGenerateSummary}
                            disabled={isGeneratingSummary}
                            fullWidth
                        >
                            {isGeneratingSummary ? 'Generating Summary...' : 'Generate Summary'}
                        </Button>
                    )}

                    {/* Summary Display */}
                    {summary && (
                        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
                            <Typography variant='h5' gutterBottom>
                                Conversation Summary
                            </Typography>
                            <Box sx={{
                                '& p': { mb: 1 },
                                '& ul, & ol': { ml: 2, mb: 1 },
                                '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 2, mb: 1 }
                            }}>
                                <ReactMarkdown>{summary}</ReactMarkdown>
                            </Box>
                        </Paper>
                    )}
                </Stack>
            </Box>
        </Container>
    );
};

export default NeoCortex;

// Export the start_agent function and CUSTOM_TOOLS for advanced use cases
export { CUSTOM_TOOLS };
