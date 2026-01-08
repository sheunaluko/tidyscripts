/**
 * useTivi - React hook for voice interaction with VAD-based TTS interruption
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TSVAD } from './ts_vad/src';
import { get_silero_session, get_ort } from './onnx';
import * as vi from './tsw/voice_interface';
import * as wa from './tsw/web_audio';
import type { UseTiviOptions, UseTiviReturn } from './types';
import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'tivi' });

export function useTivi(options: UseTiviOptions): UseTiviReturn {
  const {
    onTranscription,
    onInterrupt,
    onAudioLevel,
    onError,
    language = 'en-US',
    positiveSpeechThreshold = 0.3,
    negativeSpeechThreshold = 0.25,
    minSpeechMs = 400,
    verbose = false,
  } = options;

  // State
  const [transcription, setTranscription] = useState('');
  const [interimResult, setInterimResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const vadRef = useRef<TSVAD | null>(null);
  const recognitionActiveRef = useRef(false);
  const isMountedRef = useRef(true);

  // Initialize TSVAD with speech recognition integration
  useEffect(() => {
    isMountedRef.current = true;

    async function initVAD() {
      try {
        log('Initializing VAD...');

        // Load ONNX runtime and Silero VAD model
        const ortRuntime = await get_ort();
        const silero = await get_silero_session();

        // Create TSVAD with event handlers in constructor
        const vad = new TSVAD({
          silero,
          ort: ortRuntime,
          positiveSpeechThreshold,
          negativeSpeechThreshold,
          redemptionMs: 1400,
          preSpeechPadMs: 2000,
          minSpeechMs,

          // Handler: Speech detected
          onSpeechStart: async () => {
            if (!isMountedRef.current) return;

            log('VAD detected speech start');

            // CRITICAL: If TTS is speaking, interrupt it!
            if (vi.tts.is_speaking()) {
              log('Interrupting TTS');
              vi.tts.cancel_speech();
              onInterrupt?.();
            }

            // Start WebSpeech recognition (VAD-triggered)
            if (!recognitionActiveRef.current) {
              log('Starting speech recognition');
              await vi.initialize_recognition({ language });
              await vi.start_recognition();
              recognitionActiveRef.current = true;
            }
          },

          // Handler: Speech ended
          onSpeechEnd: (audio: Float32Array) => {
            if (!isMountedRef.current) return;

            log(`VAD detected speech end, audio length: ${audio.length}`);

            // Give WebSpeech time to process final words, then pause
            setTimeout(() => {
              if (recognitionActiveRef.current && isMountedRef.current) {
                log('Pausing speech recognition');
                vi.pause_recognition();
                recognitionActiveRef.current = false;
              }
            }, 500); // 500ms delay for final transcription
          },

          // Handler: Frame processed (for debugging)
          onFrameProcessed: (prob, frame) => {
            if (verbose && isMountedRef.current) {
              log(`VAD probability: ${prob}`);
            }
          },

          // Handler: Errors
          onError: (err) => {
            if (!isMountedRef.current) return;

            console.error('[tivi] VAD error:', err);
            setError(err.message);
            onError?.(err);
          },
        });

        vadRef.current = vad;
        log('VAD initialized successfully');

      } catch (err) {
        if (!isMountedRef.current) return;

        console.error('[tivi] VAD initialization failed:', err);
        const errorMsg = err instanceof Error ? err.message : 'VAD initialization failed';
        setError(errorMsg);
        onError?.(err instanceof Error ? err : new Error(errorMsg));
      }
    }

    initVAD();

    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
      vadRef.current?.stop();
      vi.stop_recognition();
      recognitionActiveRef.current = false;
    };
  }, [positiveSpeechThreshold, negativeSpeechThreshold, minSpeechMs, language, verbose, onInterrupt, onError]);

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

  // Listen for audio power events (for visualization)
  useEffect(() => {
    let lastUpdate = 0;
    const THROTTLE_MS = 50; // Only update every 50ms (20 FPS)

    const handleAudioPower = (e: CustomEvent) => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return; // Throttle updates

      lastUpdate = now;
      const power = e.detail as number;
      setAudioLevel(power);
      onAudioLevel?.(power);
    };

    window.addEventListener('tidyscripts_web_mic', handleAudioPower as EventListener);

    return () => {
      window.removeEventListener('tidyscripts_web_mic', handleAudioPower as EventListener);
    };
  }, [onAudioLevel]);

  // Public API
  const startListening = useCallback(async () => {
    try {
      log('Starting listening...');
      setError(null);

      // Initialize microphone and audio power monitoring
      await wa.initialize_microphone();

      // Start VAD (will automatically handle speech recognition via events)
      await vadRef.current?.start();

      setIsListening(true);
      log('Listening started');

    } catch (err) {
      console.error('[tivi] Start listening failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    log('Stopping listening...');

    // Pause VAD (stops speech detection)
    vadRef.current?.pause();

    // Stop speech recognition if active
    if (recognitionActiveRef.current) {
      vi.pause_recognition();
      recognitionActiveRef.current = false;
    }

    setIsListening(false);
  }, []);

  const speak = useCallback(async (text: string, rate: number = 1.0) => {
    setIsSpeaking(true);
    try {
      await vi.speak_with_rate(text, rate);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscription('');
    setInterimResult('');
  }, []);

  return {
    // State
    isListening,
    isSpeaking,
    isConnected: vadRef.current !== null,
    transcription,
    interimResult,
    audioLevel,
    error,

    // Actions
    startListening,
    stopListening,
    speak,
    clearTranscription,
  };
}
