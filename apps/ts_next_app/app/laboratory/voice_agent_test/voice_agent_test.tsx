'use client';

import React, {useEffect} from 'react';

import { Button, Typography, Container, Box, TextField, Stack } from '@mui/material';


import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime';

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
  if (!data.client_secret || !data.client_secret.value) {
    console.error('Unexpected API response structure:', data);
    throw new Error('Invalid API response structure');
  }

  return data.client_secret.value; // The ephemeral key
}

export async function start_agent(providedKey?: string) {
  try {
    // Use provided key or get a fresh ephemeral key
    const key = providedKey || await getEphemeralKey();
    console.log('Using ephemeral key:', key);

    const agent = new RealtimeAgent({
      name: 'Assistant',
      instructions: 'You are a helpful assistant.',
    });

    const session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
      config: {
        inputAudioFormat: 'pcm16',
        outputAudioFormat: 'pcm16',
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

    const handleInitialize = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            let tmp = await start_agent();
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

        try {
            let tmp = await start_agent(providedKey.trim());
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
        <Container>
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='100%'>
                <Stack spacing={2} sx={{ maxWidth: 500 }}>
                    <Typography variant='h4' gutterBottom>
                        Voice Agent Test
                    </Typography>
                    <Typography variant='body1' gutterBottom>
                        Tests Openai Realtime VoiceAgent
                    </Typography>

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

                    {error && (
                        <Typography variant='body2' color='error' sx={{ mt: 2 }}>
                            Error: {error}
                        </Typography>
                    )}
                    {isConnected && (
                        <Typography variant='body2' color='success' sx={{ mt: 2 }}>
                            Voice agent is ready!
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Container>
    );
};

export default VoiceAgentTest;
