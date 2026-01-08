'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, IconButton, Typography, Paper } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { alpha, useTheme } from '@mui/material/styles';

export interface VoiceInterfaceProps {
  onTranscription?: (text: string) => void;
  onAudioData?: (audioData: Float32Array) => void;
  autoStart?: boolean;
  showVisualizer?: boolean;
  visualizerHeight?: number;
}

/**
 * VoiceInterface Component
 *
 * A modern voice interaction component with:
 * - Audio recording with real-time visualization
 * - Speech recognition/transcription
 * - Clean, reusable interface
 *
 * @example
 * ```tsx
 * <VoiceInterface
 *   onTranscription={(text) => console.log(text)}
 *   showVisualizer={true}
 * />
 * ```
 */
export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onTranscription,
  onAudioData,
  autoStart = false,
  showVisualizer = true,
  visualizerHeight = 100,
}) => {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [interimResult, setInterimResult] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          setTranscription((prev) => prev + ' ' + final);
          onTranscription?.(final);
        }
        setInterimResult(interim);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscription]);

  // Initialize audio visualization
  useEffect(() => {
    if (!showVisualizer || typeof window === 'undefined') return;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const updateAudioLevel = () => {
          if (!analyserRef.current) return;

          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedLevel = average / 255;

          setAudioLevel(normalizedLevel);
          onAudioData?.(new Float32Array(dataArray));

          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    if (isRecording) {
      setupAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRecording, showVisualizer, onAudioData]);

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearTranscription = () => {
    setTranscription('');
    setInterimResult('');
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <Box display="flex" flexDirection="column" gap={2}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" color="primary">
            Voice Interface
          </Typography>
          <Box display="flex" gap={1}>
            <IconButton
              onClick={isRecording ? stopRecording : startRecording}
              color={isRecording ? 'error' : 'primary'}
              sx={{
                background: alpha(isRecording ? theme.palette.error.main : theme.palette.primary.main, 0.1),
                '&:hover': {
                  background: alpha(isRecording ? theme.palette.error.main : theme.palette.primary.main, 0.2),
                },
              }}
            >
              {isRecording ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              onClick={clearTranscription}
              disabled={!transcription}
            >
              Clear
            </Button>
          </Box>
        </Box>

        {/* Audio Visualizer */}
        {showVisualizer && (
          <Box
            sx={{
              height: visualizerHeight,
              background: alpha(theme.palette.background.paper, 0.5),
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {isRecording ? (
              <Box
                sx={{
                  width: `${audioLevel * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.secondary.main, 0.3)} 100%)`,
                  transition: 'width 0.1s ease',
                }}
              />
            ) : (
              <Typography color="text.secondary" variant="caption">
                {isRecording ? 'Listening...' : 'Click mic to start'}
              </Typography>
            )}
          </Box>
        )}

        {/* Transcription Display */}
        <Box
          sx={{
            minHeight: 100,
            maxHeight: 300,
            overflowY: 'auto',
            p: 2,
            background: alpha(theme.palette.background.default, 0.5),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {transcription || interimResult ? (
            <>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {transcription}
              </Typography>
              {interimResult && (
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.5),
                    fontStyle: 'italic',
                  }}
                >
                  {interimResult}
                </Typography>
              )}
            </>
          ) : (
            <Typography color="text.secondary" variant="body2">
              Transcription will appear here...
            </Typography>
          )}
        </Box>

        {/* Status */}
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isRecording ? theme.palette.success.main : theme.palette.grey[400],
              animation: isRecording ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {isRecording ? 'Recording' : 'Idle'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default VoiceInterface;
