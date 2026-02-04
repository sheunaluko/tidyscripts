// VoiceMode Component - Voice agent interface

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';
import { Mic, MicOff, Circle, Pause, PlayArrow, VolumeUp } from '@mui/icons-material';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { useRaiStore } from '../../store/useRaiStore';
import { useInsights } from '../../context/InsightsContext';

declare var window: any;

export const VoiceMode: React.FC = () => {
  // Get insights client from context
  const { client: insightsClient } = useInsights();

  // Initialize voice agent with insights
  const { startAgent, stopAgent, connected, tivi, agentLoading, agentError } = useVoiceAgent({
    insightsClient,
  });
  const { voiceAgentTranscript, settings } = useRaiStore();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Audio level visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Update audio level from Tivi ref
  useEffect(() => {
    if (!connected) {
      setAudioLevel(0);
      return;
    }

    const updateLevel = () => {
      if (tivi?.audioLevelRef?.current !== undefined) {
        // Scale the audio level for better visualization
        const scaledLevel = Math.min(tivi.audioLevelRef.current * 10, 1);
        setAudioLevel(scaledLevel);
      }
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [connected, tivi?.audioLevelRef]);

  // Auto-scroll to bottom when new transcript entries arrive
  useEffect(() => {
    // Scroll only within the transcript container, not the whole page
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [voiceAgentTranscript]);

  // Auto-start agent if enabled in settings
  useEffect(() => {
    if (settings.autostartAgent && !hasStartedRef.current && !connected) {
      hasStartedRef.current = true;
      startAgent();
    }
  }, [settings.autostartAgent, startAgent, connected]);

  const handleToggle = () => {
    if (connected) {
      stopAgent();
      setIsPaused(false); // Reset pause state when stopping
    } else {
      startAgent();
    }
  };

  const handlePause = () => {
    try {
      // With Tivi, we can cancel speech if speaking
      if (tivi?.isSpeaking) {
        tivi.cancelSpeech();
      }
      setIsPaused(!isPaused);
      console.log(`Voice agent ${!isPaused ? 'paused' : 'resumed'}`);
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const getTranscriptColor = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return 'primary.main';
      case 'agent':
        return 'secondary.main';
      case 'system':
        return 'text.secondary';
      default:
        return 'text.primary';
    }
  };

  const getTranscriptLabel = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return 'You';
      case 'agent':
        return 'Agent';
      case 'system':
        return 'System';
      default:
        return speaker;
    }
  };

  return (
    <Box>
      {/* Header with connection status */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, marginTop : '10px' }}>
        <Typography variant="h6" >Voice Mode</Typography>

        {connected && !isPaused && (
          <Chip
            icon={<Circle sx={{ fontSize: 12 }} />}
            label="Connected"
            color="success"
            size="small"
            sx={{
              '& .MuiChip-icon': {
                animation: 'pulse 2s infinite',
              },
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
        )}

        {connected && isPaused && (
          <Chip
            icon={<Circle sx={{ fontSize: 12 }} />}
            label="Paused"
            color="warning"
            size="small"
          />
        )}

        {tivi?.isSpeaking && (
          <Chip
            icon={<VolumeUp sx={{ fontSize: 12 }} />}
            label="Speaking"
            color="info"
            size="small"
          />
        )}

        {tivi?.isListening && !tivi?.isSpeaking && (
          <Chip
            icon={<Mic sx={{ fontSize: 12 }} />}
            label="Listening"
            color="primary"
            size="small"
          />
        )}

        {!connected && hasStartedRef.current && (
          <Chip
            label="Disconnected"
            color="default"
            size="small"
          />
        )}

        {agentLoading && (
          <Chip
            icon={<CircularProgress size={12} />}
            label="Loading Agent..."
            size="small"
          />
        )}
      </Stack>

      {/* Audio Level Indicator */}
      {connected && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={audioLevel * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: tivi?.isSpeaking ? 'secondary.main' : 'primary.main',
              },
            }}
          />
        </Box>
      )}

      {/* Agent error display */}
      {agentError && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.dark', color: 'error.contrastText' }}>
          <Typography variant="body2">
            Agent Error: {agentError.message}
          </Typography>
        </Paper>
      )}

      {/* Instructions */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Speak naturally about the patient information. Say &ldquo;finished&rdquo; when done.
        {tivi?.interimResult && (
          <Box component="span" sx={{ ml: 1, fontStyle: 'italic', color: 'text.disabled' }}>
            {tivi.interimResult}...
          </Box>
        )}
      </Typography>

      {/* Control buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {connected && (
          <Button
            variant="outlined"
            color="warning"
            startIcon={isPaused ? <PlayArrow /> : <Pause />}
            onClick={handlePause}
            size="large"
          >
            {isPaused ? 'RESUME' : 'PAUSE'}
          </Button>
        )}
        <Button
          variant={connected ? 'outlined' : 'contained'}
          color={connected ? 'error' : 'primary'}
          startIcon={connected ? <MicOff /> : <Mic />}
          onClick={handleToggle}
          size="large"
          disabled={agentLoading}
        >
          {connected ? 'STOP' : 'START'}
        </Button>
      </Stack>

      {/* Transcript display */}
      <Paper
        ref={transcriptContainerRef}
        elevation={2}
        sx={{
          p: 2,
          minHeight: 400,
          maxHeight: 500,
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '1px solid transparent',
          borderRadius: 1,
          background: (theme) => `
            linear-gradient(${theme.palette.background.default}, ${theme.palette.background.default}) padding-box,
            linear-gradient(to right, #2196F3, #00BCD4, #9C27B0, #EA4335) border-box
          `,
        }}
      >
        {voiceAgentTranscript.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 350,
              color: 'text.secondary',
            }}
          >
            {!connected && (
              <>
                <Mic sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                <Typography variant="body1">
                  Click &ldquo;Start&rdquo; to begin voice input
                </Typography>
              </>
            )}
            {connected && (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1">
                  Initializing voice agent...
                </Typography>
              </>
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            {voiceAgentTranscript.map((entry, index) => (
              <Box
                key={index}
                sx={{
                  p: 1.5,
                  borderLeft: 3,
                  borderColor: getTranscriptColor(entry.speaker),
                  bgcolor:
                    entry.speaker === 'system'
                      ? 'action.hover'
                      : 'background.paper',
                  borderRadius: 1,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: getTranscriptColor(entry.speaker),
                    }}
                  >
                    {getTranscriptLabel(entry.speaker)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.timestamp.toLocaleTimeString()}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    fontStyle: entry.speaker === 'system' ? 'italic' : 'normal',
                  }}
                >
                  {entry.text}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};
