'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { alpha, useTheme } from '@mui/material/styles';
import { useTivi } from './lib';
import type { TiviProps, TiviMode } from './lib';
import * as tsw from 'tidyscripts_web';
import { VizComponent } from './VizComponent';
import { VoiceSelector } from './VoiceSelector';
import { VADMonitor } from './VADMonitor';

const log = tsw.common.logger.get_logger({ id: 'tivi' });

/**
 * Tivi - Tidyscripts Voice Interface Component
 *
 * Features:
 * - VAD-based voice activity detection using Silero VAD v5
 * - Browser speech recognition via WebSpeech API
 * - Text-to-speech with automatic interruption on user speech
 * - Real-time audio level visualization
 * - Adjustable VAD parameters with localStorage persistence
 *
 * @example
 * ```tsx
 * <Tivi
 *   onTranscription={(text) => console.log(text)}
 *   onInterrupt={() => console.log('Interrupted!')}
 *   positiveSpeechThreshold={0.3}
 * />
 * ```
 */
export const Tivi: React.FC<TiviProps> = ({
  onTranscription,
  onInterrupt,
  onAudioLevel,
  onError,
  positiveSpeechThreshold: propPositiveThreshold,
  negativeSpeechThreshold: propNegativeThreshold,
  minSpeechStartMs: propMinSpeechStartMs,
  language,
}) => {
  const theme = useTheme();

  // Local state
  const [testTTSText, setTestTTSText] = useState(
    'Hello! This is a test of the text to speech system. Try speaking while I am talking to interrupt me.'
  );
  const [interruptCount, setInterruptCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // VAD parameters with localStorage persistence
  // Always initialize with defaults to match SSR
  const [vadParams, setVadParams] = useState({
    positiveSpeechThreshold: propPositiveThreshold ?? 0.7,
    negativeSpeechThreshold: propNegativeThreshold ?? 0.45,
    minSpeechStartMs: propMinSpeechStartMs ?? 150,
    verbose: false,
    mode: 'guarded' as TiviMode,
    powerThreshold: 0.01,
  });

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem('tivi-vad-params');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        log(`Loaded VAD params from localStorage: ${stored}`);
        // Migrate old minSpeechMs to minSpeechStartMs if needed
        const migrated = {
          positiveSpeechThreshold: parsed.positiveSpeechThreshold ?? 0.7,
          negativeSpeechThreshold: parsed.negativeSpeechThreshold ?? 0.45,
          minSpeechStartMs: parsed.minSpeechStartMs ?? parsed.minSpeechMs ?? 150,
          verbose: parsed.verbose ?? false,
          mode: parsed.mode ?? 'guarded',
          powerThreshold: parsed.powerThreshold ?? 0.01,
        };
        setVadParams(migrated);
        // Save migrated params back to localStorage
        if (!parsed.minSpeechStartMs && parsed.minSpeechMs) {
          localStorage.setItem('tivi-vad-params', JSON.stringify(migrated));
          log('Migrated localStorage: minSpeechMs -> minSpeechStartMs');
        }
      } catch (error) {
        console.error('[Tivi] Failed to parse stored VAD params:', error);
      }
    }
  }, []);

  // Update VAD parameter and save to localStorage
  const updateVadParam = useCallback((key: keyof typeof vadParams, value: number | boolean | TiviMode) => {
    setVadParams((prev) => {
      const updated = { ...prev, [key]: value };
      const stringified = JSON.stringify(updated);
      log(`Saving VAD params to localStorage: ${stringified}`);
      localStorage.setItem('tivi-vad-params', stringified);
      return updated;
    });
  }, []);

  // Restore VAD parameters to defaults and save to localStorage
  const restoreDefaults = useCallback(() => {
    const defaults = {
      positiveSpeechThreshold: 0.7,
      negativeSpeechThreshold: 0.45,
      minSpeechStartMs: 150,
      verbose: false,
      mode: 'guarded' as TiviMode,
      powerThreshold: 0.01,
    };
    log('Restoring VAD defaults');
    localStorage.setItem('tivi-vad-params', JSON.stringify(defaults));
    setVadParams(defaults);
  }, []);

  // Memoize callbacks
  const handleTranscription = useCallback(
    (text: string) => {
      log(`Transcription: ${text}`);
      onTranscription?.(text);
    },
    [onTranscription]
  );

  const handleInterrupt = useCallback(() => {
    log('Interrupted!');
    setInterruptCount((prev) => prev + 1);
    onInterrupt?.();
  }, [onInterrupt]);

  const handleAudioLevel = useCallback(
    (level: number) => {
      onAudioLevel?.(level);
    },
    [onAudioLevel]
  );

  const handleError = useCallback(
    (error: Error) => {
      console.error('[Tivi] Error:', error);
      onError?.(error);
    },
    [onError]
  );

  // Use the tivi hook with VAD
  const voice = useTivi({
    positiveSpeechThreshold: vadParams.positiveSpeechThreshold,
    negativeSpeechThreshold: vadParams.negativeSpeechThreshold,
    minSpeechStartMs: vadParams.minSpeechStartMs,
    verbose: vadParams.verbose,
    mode: vadParams.mode,
    powerThreshold: vadParams.powerThreshold,
    language,
    onTranscription: handleTranscription,
    onInterrupt: handleInterrupt,
    onAudioLevel: handleAudioLevel,
    onError: handleError,
  });

  /**
   * Test TTS function
   */
  const handleTestTTS = () => {
    if (testTTSText.trim()) {
      voice.speak(testTTSText, 1.0);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(
          theme.palette.secondary.main,
          0.05
        )} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" color="primary" fontWeight="bold">
            Tidyscripts Voice Interface (Tivi)
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={voice.isConnected ? 'Connected' : 'Disconnected'}
              color={voice.isConnected ? 'success' : 'default'}
              size="small"
            />
            {interruptCount > 0 && (
              <Chip label={`Interruptions: ${interruptCount}`} color="warning" size="small" />
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
          <Stack spacing={2}>
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
                    background: voice.isSpeaking ? theme.palette.info.main : theme.palette.grey[400],
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {voice.isSpeaking ? 'Speaking' : 'Silent'}
                </Typography>
              </Box>
            </Stack>

            {/* Audio Level Visualization */}
            <Box>
              <VizComponent audioLevelRef={voice.audioLevelRef} paused={!voice.isListening} />
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

        {/* Voice Selector */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              background: alpha(theme.palette.background.default, 0.3),
              '&:hover': {
                background: alpha(theme.palette.background.default, 0.5),
              },
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <VolumeUpIcon color="action" />
              <Typography variant="body2" fontWeight={500}>
                Voice Selector
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              background: alpha(theme.palette.background.default, 0.1),
              pt: 2,
            }}
          >
            <VoiceSelector />
          </AccordionDetails>
        </Accordion>

        {/* VAD Monitor */}
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              background: alpha(theme.palette.background.default, 0.3),
              '&:hover': {
                background: alpha(theme.palette.background.default, 0.5),
              },
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <MicIcon color="action" fontSize="small" />
              <Typography variant="body2" fontWeight={500}>
                VAD Monitor
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails
            sx={{
              background: alpha(theme.palette.background.default, 0.1),
              pt: 2,
            }}
          >
            <VADMonitor
              speechProbRef={voice.speechProbRef}
              threshold={vadParams.positiveSpeechThreshold}
              minSpeechStartMs={vadParams.minSpeechStartMs}
              paused={!voice.isListening}
            />
          </AccordionDetails>
        </Accordion>

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

                {/* Recognition Mode */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Recognition Mode: {vadParams.mode}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    guarded = VAD-triggered | responsive = power-triggered | continuous = always on
                  </Typography>
                  <Select
                    value={vadParams.mode}
                    onChange={(e) => updateVadParam('mode', e.target.value as TiviMode)}
                    size="small"
                    fullWidth
                    disabled={voice.isListening}
                  >
                    <MenuItem value="guarded">Guarded (VAD-triggered)</MenuItem>
                    <MenuItem value="responsive">Responsive (power-triggered)</MenuItem>
                    <MenuItem value="continuous">Continuous (always listening)</MenuItem>
                  </Select>
                </Box>

                {/* Power Threshold (only for responsive mode) */}
                {vadParams.mode === 'responsive' && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Power Threshold: {vadParams.powerThreshold.toFixed(3)}
                    </Typography>
                    <Slider
                      value={vadParams.powerThreshold}
                      onChange={(_, value) => updateVadParam('powerThreshold', value as number)}
                      min={0.001}
                      max={0.1}
                      step={0.001}
                      valueLabelDisplay="auto"
                      disabled={voice.isListening}
                    />
                  </Box>
                )}

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
                    onChange={(_, value) =>
                      updateVadParam('positiveSpeechThreshold', value as number)
                    }
                    min={0.1}
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
                    onChange={(_, value) =>
                      updateVadParam('negativeSpeechThreshold', value as number)
                    }
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    marks
                    valueLabelDisplay="auto"
                    disabled={voice.isListening}
                  />
                </Box>

                {/* Minimum Speech Start Duration */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Min Speech Start: {vadParams.minSpeechStartMs}ms
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Consecutive ms above threshold before triggering (prevents false starts)
                  </Typography>
                  <Slider
                    value={vadParams.minSpeechStartMs}
                    onChange={(_, value) => updateVadParam('minSpeechStartMs', value as number)}
                    min={32}
                    max={500}
                    step={32}
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
                      onChange={(e) => updateVadParam('verbose', e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Verbose Logging (shows all debug logs)
                    </Typography>
                  }
                />

                {/* Restore Defaults Button */}
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={restoreDefaults}
                  disabled={voice.isListening}
                  sx={{ mt: 1 }}
                >
                  Restore Defaults (0.7 / 0.45 / 150ms)
                </Button>

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

export default Tivi;
