// VoiceMode Component - Voice agent interface

import React, { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import { Mic, MicOff, Circle } from '@mui/icons-material';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { useRaiStore } from '../../store/useRaiStore';

export const VoiceMode: React.FC = () => {
  const { startAgent, stopAgent, connected } = useVoiceAgent();
  const { voiceAgentTranscript, settings } = useRaiStore();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Auto-scroll to bottom when new transcript entries arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    } else {
      startAgent();
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
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, marginTop : '10px' }}>
        <Typography variant="h6" >Voice Mode</Typography>

        {connected && (
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

        {!connected && hasStartedRef.current && (
          <Chip
            label="Disconnected"
            color="default"
            size="small"
          />
        )}
      </Stack>

      {/* Control buttons */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant={connected ? 'outlined' : 'contained'}
          color={connected ? 'error' : 'primary'}
          startIcon={connected ? <MicOff /> : <Mic />}
          onClick={handleToggle}
          size="large"
        >
          {connected ? 'STOP' : 'START'}
        </Button>
      </Box>

      {/* Transcript display */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          minHeight: 400,
          maxHeight: 500,
          overflowY: 'auto',
          bgcolor: 'background.default',
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
                  Click &ldquo;Start Agent&rdquo; to begin voice input
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
            <div ref={transcriptEndRef} />
          </Stack>
        )}
      </Paper>

      {/* Instructions */}
      {connected && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Speak naturally about the patient information. Say &ldquo;finished&rdquo; when done.
          </Typography>
        </Box>
      )}
    </Box>
  );
};
