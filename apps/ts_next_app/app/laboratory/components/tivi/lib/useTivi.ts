/**
 * useTivi - React hook for voice interaction with VAD-based TTS interruption
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TSVAD } from './ts_vad/src';
import { enable_vad } from './onnx';
import type { UseTiviOptions, UseTiviReturn } from './types';
import * as tsw from 'tidyscripts_web';
import * as tts from './tts';
import { SpeechRecognitionManager } from './speech-recognition';

const log = tsw.common.logger.get_logger({ id: 'tivi' });
const THROTTLE_MS = 20; // Only update audio power every 20ms

export function useTivi(options: UseTiviOptions): UseTiviReturn {
  const {
    onTranscription,
    onInterrupt,
    onAudioLevel,
    onError,
    language = 'en-US',
    positiveSpeechThreshold = 0.8,
    negativeSpeechThreshold = 0.6,
    minSpeechStartMs = 150,
    verbose = false,
    mode = 'responsive',
    powerThreshold = 0.01,
    enableInterruption = true,
  } = options;

  // State
  const [transcription, setTranscription] = useState('');
  const [interimResult, setInterimResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use ref instead of state to avoid triggering React reconciliation at 50 FPS
  const audioLevelRef = useRef(0);
  const speechProbRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const vadRef = useRef<TSVAD | null>(null);
  const recognitionRef = useRef<SpeechRecognitionManager | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const pauseRecognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef(mode);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const powerThresholdRef = useRef(powerThreshold);
  const enableInterruptionRef = useRef(enableInterruption);

  // Keep refs in sync with props/state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    powerThresholdRef.current = powerThreshold;
  }, [powerThreshold]);

  useEffect(() => {
    enableInterruptionRef.current = enableInterruption;
  }, [enableInterruption]);

  // Track mounted state and pre-load TTS voices
  useEffect(() => {
    isMountedRef.current = true;

    // Pre-load TTS voices to fix voice-switching issue on first utterance
    tts.waitForVoices().catch((err) => {
      log(`Failed to pre-load TTS voices: ${err}`);
    });

    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
      vadRef.current?.stop();
      recognitionRef.current?.stop();
      recognitionActiveRef.current = false;

      // Clear pending pause timeout
      if (pauseRecognitionTimeoutRef.current) {
        clearTimeout(pauseRecognitionTimeoutRef.current);
        pauseRecognitionTimeoutRef.current = null;
      }
    };
  }, []);

  // Listen for transcription events from WebSpeech
  useEffect(() => {
    const handleTranscription = (e: CustomEvent) => {
      if (!isMountedRef.current) return;

      const text = e.detail;
      log(`Final transcription: ${text}`);
      setTranscription((prev) => (prev ? `${prev} ${text}` : text).trim());
      onTranscription?.(text);
    };

    const handleInterim = (e: CustomEvent) => {
      if (!isMountedRef.current) return;

      const text = e.detail;
      if (verbose) log(`Interim transcription: ${text}`);
      setInterimResult(text);
    };

    window.addEventListener('tidyscripts_web_speech_recognition_result', handleTranscription as EventListener);
    window.addEventListener('tidyscripts_web_speech_recognition_interim', handleInterim as EventListener);

    return () => {
      window.removeEventListener('tidyscripts_web_speech_recognition_result', handleTranscription as EventListener);
      window.removeEventListener('tidyscripts_web_speech_recognition_interim', handleInterim as EventListener);
    };
  }, [onTranscription, verbose]);

  // Audio power updates now handled directly in startPowerMonitoring
  // No need for window event listeners

  // Initialize speech recognition
  useEffect(() => {
    try {
      log('Initializing speech recognition...');
      recognitionRef.current = new SpeechRecognitionManager({
        language: language || 'en-US',
        continuous: true,
        interimResults: true,
        verbose: verbose,

        onResult: (text, isFinal) => {
          if (!isMountedRef.current) return;

          if (isFinal) {
            // Dispatch final result
            window.dispatchEvent(
              new CustomEvent('tidyscripts_web_speech_recognition_result', {
                detail: text
              })
            );
            log(`Final transcription: ${text}`);
          } else {
            // Dispatch interim result
            window.dispatchEvent(
              new CustomEvent('tidyscripts_web_speech_recognition_interim', {
                detail: text
              })
            );
            if (verbose) log(`Interim transcription: ${text}`);
          }
        },

        onError: (error) => {
          if (!isMountedRef.current) return;
          log(`Speech recognition error: ${error.message}`);
          setError(error.message);
          onError?.(error);
        },

        onStart: () => {
          if (!isMountedRef.current) return;
          log('Speech recognition started');
        },

        onEnd: () => {
          if (!isMountedRef.current) return;
          log('Speech recognition ended');

          // Continuous mode: auto-restart recognition
          if (modeRef.current === 'continuous' && !isSpeakingRef.current && isListeningRef.current) {
            log('Continuous mode: restarting recognition');
            setTimeout(() => {
              if (isMountedRef.current && recognitionRef.current && !isSpeakingRef.current && isListeningRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          }
        }
      });

      log('Speech recognition initialized');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Speech recognition not supported';
      log(`Failed to initialize speech recognition: ${errorMsg}`);
      setError(errorMsg);
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [language, verbose, onError]);

  // Power monitoring function using VAD's analyser
  const startPowerMonitoring = useCallback((analyser: AnalyserNode) => {
    const dataArray = new Float32Array(analyser.fftSize);
    let lastUpdate = 0;
    const THROTTLE_MS = 20; // ~50 FPS for audio level updates

    function calculatePower() {
      if (!analyserRef.current || !isMountedRef.current) return;

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS power
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Update ref directly (no React state = no re-renders = no Firebase triggering)
      audioLevelRef.current = rms;

      // Responsive mode: trigger recognition when power exceeds threshold
      if (modeRef.current === 'responsive' && !isSpeakingRef.current && isListeningRef.current) {
        if (rms > powerThresholdRef.current && recognitionRef.current && !recognitionRef.current.isRunning()) {
          log('Power threshold exceeded, starting recognition');
          recognitionRef.current.start();
        }
      }

      // Optionally call callback for external consumers (throttled)
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_MS) {
        lastUpdate = now;
        onAudioLevel?.(rms);
      }

      // Continue at 60 FPS
      animationFrameRef.current = requestAnimationFrame(calculatePower);
    }

    calculatePower();
  }, [onAudioLevel]);

  // Public API
  const startListening = useCallback(async () => {
    try {
      log(`Starting listening in '${mode}' mode...`);
      setError(null);

      // Log the VAD parameters being used
      log(`VAD params: pos=${positiveSpeechThreshold}, neg=${negativeSpeechThreshold}, minSpeechStart=${minSpeechStartMs}ms`);

      // Enable VAD and get audio components
      const { vad, audioContext, analyserNode, stream } = await enable_vad({
        onSpeechStart: async () => {
          if (!isMountedRef.current) return;
          log('VAD detected speech start');

          // Cancel any pending pause timeout (user started speaking again)
          if (pauseRecognitionTimeoutRef.current) {
            clearTimeout(pauseRecognitionTimeoutRef.current);
            pauseRecognitionTimeoutRef.current = null;
            log('Cancelled pending recognition pause (user speaking again)');
          }

          // If TTS is speaking and interruption is enabled, interrupt it
          if (tts.isSpeaking() && enableInterruptionRef.current) {
            log('Interrupting TTS');
            tts.cancelSpeech();
            onInterrupt?.();

            // Start speech recognition immediately after interrupting TTS
            if (recognitionRef.current && !recognitionRef.current.isRunning()) {
              log('Starting speech recognition after TTS interruption');
              recognitionRef.current.start();
            }
            return;
          }

          // Guarded mode only: Start recognition on VAD speech detection
          if (modeRef.current === 'guarded') {
            if (recognitionRef.current && !recognitionRef.current.isRunning()) {
              log('Starting speech recognition (VAD-triggered, guarded mode)');
              recognitionRef.current.start();
            }
          }
        },

        onSpeechEnd: (audio: Float32Array) => {
          if (!isMountedRef.current) return;
          log(`VAD detected speech end, audio length: ${audio.length}`);

          // Guarded mode only: Pause recognition after delay
          if (modeRef.current === 'guarded') {
            // Clear any existing timeout first
            if (pauseRecognitionTimeoutRef.current) {
              clearTimeout(pauseRecognitionTimeoutRef.current);
            }

            // Wait 2 seconds, then pause speech recognition
            pauseRecognitionTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && recognitionRef.current?.isRunning()) {
                log('Pausing speech recognition after speech end (guarded mode)');
                recognitionRef.current.pause();
                pauseRecognitionTimeoutRef.current = null;
              }
            }, 2000);
          }
        },

        onFrameProcessed: (prob, frame) => {
          if (isMountedRef.current) {
            speechProbRef.current = prob;
            if (verbose) {
              log(`VAD probability: ${prob}`);
            }
          }
        },

        onError: (err) => {
          if (!isMountedRef.current) return;
          console.error('[tivi] VAD error:', err);
          setError(err.message);
          onError?.(err);
        },

        positiveSpeechThreshold,
        negativeSpeechThreshold,
        redemptionMs: 1400,
        preSpeechPadMs: 2000,
        minSpeechStartMs,
      });

      vadRef.current = vad;
      analyserRef.current = analyserNode;
      setIsConnected(true);
      isListeningRef.current = true;

      // Start power monitoring using VAD's analyser
      startPowerMonitoring(analyserNode);

      // Mode-specific initialization
      if (mode === 'guarded') {
        // Guarded mode: VAD runs continuously, triggers recognition
        log('Guarded mode: VAD will trigger recognition');
      } else if (mode === 'responsive') {
        // Responsive mode: Pause VAD processing (only used during TTS), power monitoring triggers recognition
        log('Responsive mode: Power monitoring will trigger recognition');
        vad.pauseProcessing();
      } else if (mode === 'continuous') {
        // Continuous mode: Pause VAD processing (only used during TTS), start recognition immediately
        log('Continuous mode: Starting recognition immediately');
        vad.pauseProcessing();
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      }

      setIsListening(true);
      log('Listening started');

    } catch (err) {
      console.error('[tivi] Start listening failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [onError, onInterrupt, language, verbose, positiveSpeechThreshold, negativeSpeechThreshold, minSpeechStartMs, mode, startPowerMonitoring]);

  const stopListening = useCallback(() => {
    log('Stopping listening...');

    isListeningRef.current = false;

    // Stop power monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;

    // Stop and clean up VAD
    vadRef.current?.stop();
    vadRef.current = null;
    setIsConnected(false);

    // Stop speech recognition
    recognitionRef.current?.stop();

    // Clear pending pause timeout
    if (pauseRecognitionTimeoutRef.current) {
      clearTimeout(pauseRecognitionTimeoutRef.current);
      pauseRecognitionTimeoutRef.current = null;
    }

    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string, rate: number = 1.0) => {
    setIsSpeaking(true);
    isSpeakingRef.current = true;

    // Pause recognition during TTS
    recognitionRef.current?.pause();

    // For responsive/continuous modes: Resume VAD processing for interrupt detection (only if interruption enabled)
    if (enableInterruptionRef.current && modeRef.current !== 'guarded' && vadRef.current) {
      log('Resuming VAD processing for TTS interrupt detection');
      vadRef.current.resumeProcessing();
    }

    try {
      await tts.speakWithRate(text, rate);
    } finally {
      setIsSpeaking(false);
      isSpeakingRef.current = false;

      // For responsive/continuous modes: Pause VAD processing again (only if we resumed it)
      if (enableInterruptionRef.current && modeRef.current !== 'guarded' && vadRef.current) {
        log('Pausing VAD processing after TTS');
        vadRef.current.pauseProcessing();
      }

      // Resume recognition based on mode
      if (isListeningRef.current && recognitionRef.current) {
        if (modeRef.current === 'continuous') {
          log('Continuous mode: Restarting recognition after TTS');
          recognitionRef.current.start();
        }
        // Responsive mode: Let power monitoring trigger recognition
        // Guarded mode: Let VAD trigger recognition
      }
    }
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscription('');
    setInterimResult('');
  }, []);

  const cancelSpeech = useCallback( ()=> {
  	tts.cancelSpeech();
  },[]);

    const pauseSpeechRecognition = useCallback( ()=> {
	log('Pausing speech recognition');
        if (recognitionRef.current) {
            recognitionRef.current.pause();
        }
    },[]);

  const resumeVADProcessing = useCallback(() => {
    if (vadRef.current) {
      log('Resuming VAD processing (external request)');
      vadRef.current.resumeProcessing();
    }
  }, []);

  const pauseVADProcessing = useCallback(() => {
    if (vadRef.current) {
      log('Pausing VAD processing (external request)');
      vadRef.current.pauseProcessing();
    }
  }, []);

  return {
    // State
    isListening,
    isSpeaking,
    isConnected,
    transcription,
    interimResult,
    audioLevelRef, // Changed from audioLevel state to ref
    speechProbRef, // VAD speech probability ref
    error,
    mode, // Current recognition mode
    enableInterruption, // Whether TTS interruption is enabled

    // Actions
    startListening,
    stopListening,
    speak,
    clearTranscription,
    cancelSpeech,
    pauseSpeechRecognition,
    resumeVADProcessing,
    pauseVADProcessing
  };
}
