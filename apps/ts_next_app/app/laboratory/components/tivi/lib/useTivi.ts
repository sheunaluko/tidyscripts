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
    minSpeechMs = 500,
    verbose = false,
  } = options;

  // State
  const [transcription, setTranscription] = useState('');
  const [interimResult, setInterimResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const vadRef = useRef<TSVAD | null>(null);
  const recognitionRef = useRef<SpeechRecognitionManager | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const pauseRecognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Listen for audio power events (for visualization)
  useEffect(() => {
    let lastUpdate = 0;


    const handleAudioPower = (e: CustomEvent) => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return; // Throttle updates

      lastUpdate = now;
      const power = e.detail as number;
      setAudioLevel(power);
      onAudioLevel?.(power);
      /*
      //dispatch tivi event
      window.dispatchEvent( new CustomEvent('tivi_audio_level',{
      detail: {
        level : power, 
      }	      
      });
      */

    };

    window.addEventListener('tidyscripts_web_mic', handleAudioPower as EventListener);

    return () => {
      window.removeEventListener('tidyscripts_web_mic', handleAudioPower as EventListener);
    };
  }, [onAudioLevel]);

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

    function calculatePower() {
      if (!analyserRef.current || !isMountedRef.current) return;

      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS power
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Dispatch event for compatibility with existing viz
      window.dispatchEvent(
        new CustomEvent('tidyscripts_web_mic', { detail: rms })
      );

      // Continue at 60 FPS
      animationFrameRef.current = requestAnimationFrame(calculatePower);
    }

    calculatePower();
  }, []);

  // Public API
  const startListening = useCallback(async () => {
    try {
      log('Starting listening...');
      setError(null);

      // Log the VAD parameters being used
      log(`Starting VAD with params: pos=${positiveSpeechThreshold}, neg=${negativeSpeechThreshold}, minSpeech=${minSpeechMs}ms`);

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

          // If TTS is speaking, interrupt it
          if (tts.isSpeaking()) {
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

          // If TTS is NOT speaking AND speech recognition is not active, start it
          if (recognitionRef.current && !recognitionRef.current.isRunning()) {
            log('Starting speech recognition (VAD-triggered)');
            recognitionRef.current.start();
          }
        },

        onSpeechEnd: (audio: Float32Array) => {
          if (!isMountedRef.current) return;
          log(`VAD detected speech end, audio length: ${audio.length}`);

          // Clear any existing timeout first
          if (pauseRecognitionTimeoutRef.current) {
            clearTimeout(pauseRecognitionTimeoutRef.current);
          }

          // Wait 2 seconds, then pause speech recognition
          pauseRecognitionTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && recognitionRef.current?.isRunning()) {
              log('Pausing speech recognition after speech end');
              recognitionRef.current.pause();
              pauseRecognitionTimeoutRef.current = null;
            }
          }, 2000);
        },

        onFrameProcessed: (prob, frame) => {
          if (verbose && isMountedRef.current) {
            log(`VAD probability: ${prob}`);
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
        minSpeechMs,
      });

      vadRef.current = vad;
      analyserRef.current = analyserNode;
      setIsConnected(true);

      // Start power monitoring using VAD's analyser
      startPowerMonitoring(analyserNode);

      // Don't start speech recognition here - let VAD trigger it
      // Speech recognition will be started on VAD onSpeechStart

      setIsListening(true);
      log('Listening started');

    } catch (err) {
      console.error('[tivi] Start listening failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start listening';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [onError, onInterrupt, language, verbose, positiveSpeechThreshold, negativeSpeechThreshold, minSpeechMs, startPowerMonitoring]);

  const stopListening = useCallback(() => {
    log('Stopping listening...');

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
    try {
      await tts.speakWithRate(text, rate);
    } finally {
      setIsSpeaking(false);
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
        recognitionRef.current.pause();
    },[]);

  return {
    // State
    isListening,
    isSpeaking,
    isConnected,
    transcription,
    interimResult,
    audioLevel,
    error,

    // Actions
    startListening,
    stopListening,
    speak,
    clearTranscription,
    cancelSpeech ,
    pauseSpeechRecognition
  };
}
