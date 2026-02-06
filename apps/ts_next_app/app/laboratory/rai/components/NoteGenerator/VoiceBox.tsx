// Voice Box Component - Simple transcription using Web Speech API

import React, { useState, useEffect, useRef } from 'react';
import { formatTranscriptText } from '../../lib/noteGenerator';
import {
  Box,
  Stack,
  Button,
  TextField,
  Alert,
  Chip,
  Snackbar,
  Paper,
  Tooltip,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Mic,
  MicOff,
  ContentCopy,
  Circle,
  AutoAwesome,
} from '@mui/icons-material';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: (event: any) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onstart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import { useInsights } from '../../context/InsightsContext';

export const VoiceBox: React.FC = () => {
  const { client: insightsClient } = useInsights();
  const trackEvent = (type: string, payload: Record<string, any>) => {
    try { insightsClient?.addEvent(type, payload); } catch (_) {}
  };

  const [recognitionState, setRecognitionState] = useState<'idle' | 'listening'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [formatting, setFormatting] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const stateRef = useRef(recognitionState);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = recognitionState;
  }, [recognitionState]);

  // Error message helper
  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'no-speech':
        return 'No speech detected. Please try again.';
      case 'audio-capture':
        return 'No microphone found. Please check your device.';
      case 'not-allowed':
        return 'Microphone permission denied. Please allow access.';
      case 'network':
        return 'Network error. Please check your connection.';
      default:
        return `Recognition error: ${error}`;
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    // Check browser support
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;     // Keep listening
    recognition.interimResults = true; // Show real-time results
    recognition.lang = 'en-US';

    // Event handlers
    recognition.onstart = () => {
      setRecognitionState('listening');
      setErrorMessage(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText);
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      setRecognitionState('idle');
      const errorMsg = getErrorMessage(event.error);
      setErrorMessage(errorMsg);
    };

    recognition.onend = () => {
      // Auto-restart if still in listening state (Web Speech API stops after silence)
      if (stateRef.current === 'listening') {
        try {
          recognition.start();
        } catch (e) {
          setRecognitionState('idle');
        }
      } else {
        setRecognitionState('idle');
      }
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Toggle recording (start/stop)
  const handleToggle = () => {
    if (!recognitionRef.current) return;

    if (recognitionState === 'listening') {
      // Stop recording
      recognitionRef.current.stop();
      setRecognitionState('idle');
      setInterimTranscript('');
      trackEvent('voicebox_recording_stopped', { transcript });
    } else {
      // Start recording
      try {
        recognitionRef.current.start();
        trackEvent('voicebox_recording_started', {});
      } catch (error) {
        setErrorMessage('Failed to start recording');
      }
    }
  };

  // Copy to clipboard (and stop)
  const handleCopy = async () => {
    // Stop recording when copying
    if (recognitionState === 'listening' && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecognitionState('idle');
      setInterimTranscript('');
    }

    try {
      await navigator.clipboard.writeText(transcript);
      setCopySuccess(true);
      trackEvent('voicebox_copy', { text: transcript });
    } catch (error) {
      setErrorMessage('Failed to copy to clipboard');
    }
  };

  // Format text with AI
  const handleFormat = async () => {
    if (!transcript) return;

    // Stop recording when formatting
    if (recognitionState === 'listening' && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecognitionState('idle');
      setInterimTranscript('');
    }

    setFormatting(true);
    setErrorMessage(null);

    const inputText = transcript;
    try {
      const formatted = await formatTranscriptText(transcript);
      setTranscript(formatted);
      trackEvent('voicebox_format', { inputText, outputText: formatted, status: 'success' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to format text';
      setErrorMessage(`Formatting error: ${errorMsg}`);
      trackEvent('voicebox_format', { inputText, error: errorMsg, status: 'error' });
    } finally {
      setFormatting(false);
    }
  };

  // Manual text editing
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTranscript(e.target.value);
  };

  return (
    <Paper sx={{ p: 3, position: 'relative', border: '1px solid', borderColor: 'divider', height: '100%' }}>
      {/* Mic button - top right */}
      <IconButton
        onClick={handleToggle}
        disabled={!isSupported}
        size="large"
        color={recognitionState === 'listening' ? 'error' : 'primary'}
        sx={{ position: 'absolute', top: 12, right: 64, zIndex: 1 }}
      >
        {recognitionState === 'listening' ? <MicOff /> : <Mic />}
      </IconButton>

      {/* Format button - top right */}
      <Tooltip title="Format with AI">
        <IconButton
          onClick={handleFormat}
          disabled={!transcript || formatting}
          sx={{ position: 'absolute', top: 16, right: 112, zIndex: 1 }}
          color="primary"
        >
          {formatting ? (
            <CircularProgress size={20} color="primary" />
          ) : (
            <AutoAwesome />
          )}
        </IconButton>
      </Tooltip>

      {/* Copy button - top right */}
      <Tooltip title="Copy to clipboard">
        <IconButton
          onClick={handleCopy}
          disabled={!transcript}
          sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
          color="primary"
        >
          <ContentCopy />
        </IconButton>
      </Tooltip>

      {/* Title */}
      <Typography variant="h6" gutterBottom>
        Dictation
      </Typography>

      {/* Header with status */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        {recognitionState === 'listening' && (
          <Chip
            icon={<Circle sx={{ fontSize: 12 }} />}
            label="Recording"
            color="error"
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
      </Stack>

      {/* Browser support warning */}
      {!isSupported && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
        </Alert>
      )}

      {/* Error messages */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Text area */}
      <TextField
        fullWidth
        multiline
        rows={6}
        variant="outlined"
        placeholder="generate text to include in your note"
        value={transcript + (interimTranscript ? ' ' + interimTranscript : '')}
        onChange={handleTextChange}
        inputRef={textAreaRef}
        disabled={recognitionState === 'listening'}
        sx={{ mb: 2 }}
        InputProps={{
          sx: {
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            backgroundColor: recognitionState === 'listening' ? 'action.hover' : 'background.paper',
          },
        }}
      />

      {/* Copy success notification */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Copied to clipboard!"
      />
    </Paper>
  );
};
