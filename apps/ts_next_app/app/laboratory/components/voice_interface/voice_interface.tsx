'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  TextField,
  Chip,
  Alert,
  Stack,
  Slider,
  Collapse,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import { alpha, useTheme } from '@mui/material/styles';
import { useInterruptibleVoice } from './lib';
import * as tsw from 'tidyscripts_web';

export interface VoiceInterfaceProps {
  /**
   * Callback when transcription is completed
   */
  onTranscription?: (text: string) => void;

  /**
   * Callback when TTS is interrupted
   */
  onInterrupt?: () => void;

  // Silero VAD Configuration (optional - uses sensible defaults)
  /**
   * Speech detection sensitivity (0-1). Lower = more sensitive.
   * Default: 0.3
   */
  positiveSpeechThreshold?: number;

  /**
   * Silence detection threshold (0-1).
   * Default: 0.25
   */
  negativeSpeechThreshold?: number;

  /**
   * Minimum speech duration in ms to trigger transcription.
   * Default: 400
   */
  minSpeechMs?: number;

  /**
   * Language for WebSpeech API transcription (e.g., 'en-US', 'es-ES').
   * Default: 'en-US'
   */
  language?: string;
}

/**
 * VoiceInterface - Test component for client-side interruptible voice
 *
 * Features:
 * - Client-side VAD using Silero VAD v5 (no server required!)
 * - Browser speech recognition via WebSpeech API
 * - Display transcription (interim + final)
 * - Test TTS button to trigger cortex speech
 * - Visual feedback for interruptions
 * - Connection status display
 * - Fully offline-capable after initial load
 *
 * @example
 * ```tsx
 * <VoiceInterface
 *   onTranscription={(text) => console.log(text)}
 *   onInterrupt={() => console.log('Interrupted!')}
 *   positiveSpeechThreshold={0.3}  // Optional: tune VAD sensitivity
 * />
 * ```
 */
export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onTranscription,
  onInterrupt,
  positiveSpeechThreshold,
  negativeSpeechThreshold,
  minSpeechMs,
  language,
}) => {
  const theme = useTheme();

  // Local state
  const [testTTSText, setTestTTSText] = useState('Hello! This is a test of the text to speech system. Try speaking while I am talking to interrupt me.');
  const [interruptCount, setInterruptCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // VAD parameters with localStorage persistence
  const [vadParams, setVadParams] = useState({
    positiveSpeechThreshold: positiveSpeechThreshold ?? 0.9,
    negativeSpeechThreshold: negativeSpeechThreshold ?? 0.65,
    minSpeechMs: minSpeechMs ?? 500,
    verbose: false,
  });

  // Load VAD parameters from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('vad-params');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVadParams(parsed);
      } catch (error) {
        console.error('[VoiceInterface] Failed to parse stored VAD params:', error);
      }
    }
  }, []);

  // Save VAD parameters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('vad-params', JSON.stringify(vadParams));
  }, [vadParams]);

  // Update VAD parameter
  const updateVadParam = useCallback((key: keyof typeof vadParams, value: number) => {
    setVadParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Memoize callbacks to prevent WebSpeech re-initialization on every render
  const handleTranscription = useCallback(
    (text: string) => {
      console.log('[VoiceInterface] Transcription:', text);
      onTranscription?.(text);
    },
    [onTranscription]
  );

  const handleInterrupt = useCallback(() => {
    console.log('[VoiceInterface] Interrupted!');
    setInterruptCount((prev) => prev + 1);
    onInterrupt?.();
  }, [onInterrupt]);

  const handleError = useCallback((error: Error) => {
    console.error('[VoiceInterface] Error:', error);
  }, []);

  // Use the interruptible voice hook with Silero VAD
  const voice = useInterruptibleVoice({
    // VAD parameters from state (persisted in localStorage)
    positiveSpeechThreshold: vadParams.positiveSpeechThreshold,
    negativeSpeechThreshold: vadParams.negativeSpeechThreshold,
    minSpeechMs: vadParams.minSpeechMs,
    verbose: vadParams.verbose,
    language,

    // Callbacks
    onTranscription: handleTranscription,
    onInterrupt: handleInterrupt,
    onError: handleError,
  });

  /**
   * Test TTS function - triggers tidyscripts TTS
   */
  const handleTestTTS = () => {
    try {
      const vi = tsw?.util?.voice_interface;
      if (vi?.speak) {
        vi.speak(testTTSText);
      } else {
        console.warn('[VoiceInterface] speak function not available');
        alert('tidyscripts TTS speak() function not available.');
      }
    } catch (error) {
      console.error('[VoiceInterface] TTS error:', error);
      alert('Error calling tidyscripts TTS: ' + (error as Error).message);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" color="primary" fontWeight="bold">
            Interruptible Voice Interface
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={voice.isConnected ? 'Connected' : 'Disconnected'}
              color={voice.isConnected ? 'success' : 'default'}
              size="small"
            />
            {interruptCount > 0 && (
              <Chip
                label={`Interruptions: ${interruptCount}`}
                color="warning"
                size="small"
              />
            )}
          </Stack>
        </Box>

        {/* Status Display */}
        <Box
          sx={{
            p: 2,
            background: alpha(theme.palette.background.paper, 0.5),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: voice.isListening
                    ? theme.palette.success.main
                    : theme.palette.grey[400],
                  animation: voice.isListening ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {voice.isListening ? 'Listening' : 'Idle'}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: voice.isSpeaking
                    ? theme.palette.info.main
                    : theme.palette.grey[400],
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {voice.isSpeaking ? 'Speaking' : 'Silent'}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Controls */}
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color={voice.isListening ? 'error' : 'primary'}
            startIcon={voice.isListening ? <MicOffIcon /> : <MicIcon />}
            onClick={voice.isListening ? voice.stopListening : voice.startListening}
            fullWidth
          >
            {voice.isListening ? 'Stop Listening' : 'Start Listening'}
          </Button>

          <IconButton
            onClick={voice.clearTranscription}
            disabled={!voice.transcription}
            color="default"
          >
            <DeleteIcon />
          </IconButton>
        </Box>

        {/* Test TTS Controls */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Test TTS (for testing interruption)
          </Typography>
          <Stack spacing={1}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={testTTSText}
              onChange={(e) => setTestTTSText(e.target.value)}
              placeholder="Enter text to speak..."
            />
            <Button
              variant="outlined"
              startIcon={<VolumeUpIcon />}
              onClick={handleTestTTS}
              disabled={!testTTSText.trim()}
            >
              Test TTS (Speak while this is playing to interrupt)
            </Button>
          </Stack>
        </Box>

        {/* Transcription Display */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Transcription
          </Typography>
          <Box
            sx={{
              minHeight: 150,
              maxHeight: 300,
              overflowY: 'auto',
              p: 2,
              background: alpha(theme.palette.background.default, 0.5),
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            {voice.transcription || voice.interimResult ? (
              <>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  {voice.transcription}
                </Typography>
                {voice.interimResult && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: alpha(theme.palette.text.primary, 0.5),
                      fontStyle: 'italic',
                    }}
                  >
                    {voice.interimResult}
                  </Typography>
                )}
              </>
            ) : (
              <Typography color="text.secondary" variant="body2">
                {voice.isListening
                  ? 'Speak to see transcription...'
                  : 'Click "Start Listening" to begin'}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Error Display */}
        {voice.error && (
          <Alert severity="error" onClose={() => {}}>
            {voice.error}
          </Alert>
        )}

        {/* VAD Settings */}
        <Box>
          <Button
            startIcon={<SettingsIcon />}
            onClick={() => setShowSettings(!showSettings)}
            variant="outlined"
            size="small"
            fullWidth
          >
            {showSettings ? 'Hide' : 'Show'} VAD Settings
          </Button>

          <Collapse in={showSettings}>
            <Paper
              sx={{
                mt: 2,
                p: 2,
                background: alpha(theme.palette.background.default, 0.3),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Stack spacing={3}>
                <Typography variant="subtitle2" color="primary">
                  Voice Activity Detection Parameters
                </Typography>

                {/* Positive Speech Threshold */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Speech Threshold: {vadParams.positiveSpeechThreshold.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Higher = less sensitive (reduces false positives from TTS feedback)
                  </Typography>
                  <Slider
                    value={vadParams.positiveSpeechThreshold}
                    onChange={(_, value) => updateVadParam('positiveSpeechThreshold', value as number)}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    marks
                    valueLabelDisplay="auto"
                    disabled={voice.isListening}
                  />
                </Box>

                {/* Negative Speech Threshold */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Silence Threshold: {vadParams.negativeSpeechThreshold.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Should be ~0.15 below speech threshold
                  </Typography>
                  <Slider
                    value={vadParams.negativeSpeechThreshold}
                    onChange={(_, value) => updateVadParam('negativeSpeechThreshold', value as number)}
                    min={0.35}
                    max={0.8}
                    step={0.05}
                    marks
                    valueLabelDisplay="auto"
                    disabled={voice.isListening}
                  />
                </Box>

                {/* Minimum Speech Duration */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Min Speech Duration: {vadParams.minSpeechMs}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Minimum duration to avoid false positives (misfires)
                  </Typography>
                  <Slider
                    value={vadParams.minSpeechMs}
                    onChange={(_, value) => updateVadParam('minSpeechMs', value as number)}
                    min={100}
                    max={1500}
                    step={100}
                    marks
                    valueLabelDisplay="auto"
                    disabled={voice.isListening}
                  />
                </Box>

                {/* Verbose Logging Toggle */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={vadParams.verbose}
                      onChange={(e) => updateVadParam('verbose', e.target.checked ? 1 : 0)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Verbose Logging (shows all debug logs)
                    </Typography>
                  }
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    <strong>Echo cancellation:</strong> Enabled (prevents TTS feedback)
                    <br />
                    <strong>Note:</strong> Stop listening before changing parameters
                  </Typography>
                </Alert>
              </Stack>
            </Paper>
          </Collapse>
        </Box>
      </Stack>
    </Paper>
  );
};

export default VoiceInterface;
