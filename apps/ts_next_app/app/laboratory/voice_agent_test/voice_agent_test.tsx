'use client';

import React, {useEffect} from 'react';

import { Button, Typography, Container, Box, TextField, Stack, Paper } from '@mui/material';
import ReactMarkdown from 'react-markdown';

import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';
import { tool } from '@openai/agents';
import { z } from 'zod';

// Default prompts
const DEFAULT_INSTRUCTIONS = `You are a health care patient liason whose goal is talk with a patient who is currently hospitalized and get their perspective on various issues.
Maintain a conversational and patient friendly tone.
You should find out about the following: general experience, particular side effects (and which meds) they have experienced, any great experiences or poor experiences that stand out, things we could do better, what they wished the doctors and staff knew but couldnt tell them , etc
In general ask further questions to get a bit more detailed information`;

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

export async function start_agent(providedKey: string | undefined, instructions: string, onDoneCallback: () => void) {
  try {
    // Use provided key or get a fresh ephemeral key
    const key = providedKey || await getEphemeralKey();
    console.log('Using ephemeral key:', key);

    // Create a tool to detect when user says they're done
    const conversationComplete = tool({
      name: 'conversation_complete',
      description: 'Call this when the user indicates they are done with the conversation (e.g., says "I\'m done", "that\'s all", "goodbye", etc.)',
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

    const agent = new RealtimeAgent({
      name: 'Assistant',
      instructions: instructions,
      tools: [conversationComplete],
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

declare var window : any ; 

const VoiceAgentTest = () => {
    const [isConnecting, setIsConnecting] = React.useState(false);
    const [isConnected, setIsConnected] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [providedKey, setProvidedKey] = React.useState('');
    const [instructions, setInstructions] = React.useState(DEFAULT_INSTRUCTIONS);
    const [summarizationPrompt, setSummarizationPrompt] = React.useState(DEFAULT_SUMMARIZATION_PROMPT);
    const [summary, setSummary] = React.useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false);

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
            let tmp = await start_agent(undefined, instructions, handleGenerateSummary);
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
            let tmp = await start_agent(providedKey.trim(), instructions, handleGenerateSummary);
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
                        Voice Agent Test
                    </Typography>
                    <Typography variant='body1' gutterBottom>
                        Tests Openai Realtime VoiceAgent
                    </Typography>

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
                            Voice agent is ready! Say "I'm done" when finished, or click Generate Summary below.
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

export default VoiceAgentTest;
