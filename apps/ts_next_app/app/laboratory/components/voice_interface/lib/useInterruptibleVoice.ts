/**
 * useInterruptibleVoice - React hook for VAD-based voice interaction
 *
 * Uses @ricky0123/vad-react for voice activity detection and WebSpeech API for transcription.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { WebSpeechClient } from './WebSpeechClient';
import type {
  UseInterruptibleVoiceOptions,
  UseInterruptibleVoiceReturn,
} from './types';
import * as tsw from 'tidyscripts_web';

export function useInterruptibleVoice(
  options: UseInterruptibleVoiceOptions
): UseInterruptibleVoiceReturn {
  const {
    onTranscription,
    onInterrupt,
    onError,
    language = 'en-US',
    positiveSpeechThreshold = 0.9,
    negativeSpeechThreshold = 0.65,
    minSpeechMs = 500,
    verbose = false,
  } = options;

  // State
  const [transcription, setTranscription] = useState('');
  const [interimResult, setInterimResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const webSpeechClientRef = useRef<WebSpeechClient | null>(null);
  const isMountedRef = useRef(true);
  const recognitionStartTimeRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get TTS status
   */
  const getTTSStatus = useCallback((): {
    available: boolean;
    isSpeaking: boolean;
  } => {
    if (typeof window === 'undefined') {
      return { available: false, isSpeaking: false };
    }

    try {
      const tts = tsw?.util?.voice_interface?.tts;
      if (!tts) {
        return { available: false, isSpeaking: false };
      }

      return {
        available: true,
        isSpeaking: tts.is_speaking(),
      };
    } catch (error) {
      return { available: false, isSpeaking: false };
    }
  }, []);

  /**
   * Cancel TTS if speaking
   */
  const cancelTTS = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const tts = tsw?.util?.voice_interface?.tts;
      if (!tts) {
        return false;
      }

      if (tts.is_speaking()) {
        console.log('[useInterruptibleVoice] Canceling TTS speech');
        tts.cancel_speech();
        onInterrupt?.();
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }, [onInterrupt]);

  /**
   * Handle transcription updates from WebSpeech API
   */
  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (verbose) {
        console.log('[useInterruptibleVoice] handleTranscript called:', { text, isFinal, isMounted: isMountedRef.current });
      }

      if (!isMountedRef.current) {
        if (verbose) {
          console.warn('[useInterruptibleVoice] Component unmounted, ignoring transcript');
        }
        return;
      }

      if (isFinal) {
        console.log('[useInterruptibleVoice] Final transcription:', text);
        setTranscription((prev) => {
          const newTranscription = (prev ? `${prev} ${text}` : text).trim();
          if (verbose) {
            console.log('[useInterruptibleVoice] Updated transcription state:', newTranscription);
          }
          return newTranscription;
        });
        setInterimResult('');
        onTranscription?.(text);
      } else {
        if (verbose) {
          console.log('[useInterruptibleVoice] Interim transcription:', text);
        }
        setInterimResult(text);
      }
    },
    [onTranscription, verbose]
  );

  /**
   * Handle errors
   */
  const handleError = useCallback(
    (err: Error) => {
      console.error('[useInterruptibleVoice] Error:', err);
      if (!isMountedRef.current) return;

      setError(err.message);
      onError?.(err);
    },
    [onError]
  );

  // Custom audio stream with echo cancellation
  const getStream = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,  // Critical: prevents TTS feedback
        noiseSuppression: true,  // Reduces background noise
        autoGainControl: true,    // Normalizes volume
      },
    });
    return stream;
  }, []);

  // Initialize VAD
  const vad = useMicVAD({
    // Self-hosted files in public/vad/
    baseAssetPath: "/vad/",
    onnxWASMBasePath: "/vad/",

    // Audio stream with echo cancellation
    getStream,

    // VAD sensitivity parameters (from options)
    positiveSpeechThreshold,  // Threshold for speech detection
    negativeSpeechThreshold,  // Threshold for silence detection
    minSpeechMs,              // Minimum speech duration

    onVADMisfire: () => {
      if (verbose) {
        console.log('[useInterruptibleVoice] VAD misfire (speech too short)');
      }
    },

    onSpeechStart: () => {
      console.log('[useInterruptibleVoice] Speech started');

      // Clear any pending stop timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }

      // Interrupt TTS if speaking
      const ttsStatus = getTTSStatus();
      if (ttsStatus.available && ttsStatus.isSpeaking) {
        cancelTTS();
      }

      // Start WebSpeech recognition and track start time
      if (webSpeechClientRef.current && !webSpeechClientRef.current.getIsRecognizing()) {
        recognitionStartTimeRef.current = Date.now();
        if (verbose) {
          console.log('[useInterruptibleVoice] Starting WebSpeech recognition at:', recognitionStartTimeRef.current);
        }
        webSpeechClientRef.current.start();
      }
    },
    onSpeechEnd: (audio) => {
      if (verbose) {
        console.log('[useInterruptibleVoice] Speech ended, audio length:', audio.length);
      }

      // Calculate how long WebSpeech has been running
      const now = Date.now();
      const runningTime = recognitionStartTimeRef.current
        ? now - recognitionStartTimeRef.current
        : 0;

      // Minimum time WebSpeech should run: 1000ms
      const MIN_RECOGNITION_TIME = 1000;
      const remainingTime = Math.max(0, MIN_RECOGNITION_TIME - runningTime);

      // Additional delay for processing transcription
      const PROCESSING_DELAY = 500;
      const totalDelay = remainingTime + PROCESSING_DELAY;

      if (verbose) {
        console.log('[useInterruptibleVoice] WebSpeech has been running for:', runningTime, 'ms');
        console.log('[useInterruptibleVoice] Will stop WebSpeech in:', totalDelay, 'ms');
      }

      // Clear any existing timeout
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }

      // Stop WebSpeech after ensuring minimum runtime + processing delay
      stopTimeoutRef.current = setTimeout(() => {
        if (webSpeechClientRef.current) {
          if (verbose) {
            console.log('[useInterruptibleVoice] Stopping WebSpeech after guaranteed runtime');
          }
          webSpeechClientRef.current.stop();
          recognitionStartTimeRef.current = null;
        }
      }, totalDelay);
    },
  });

  // Initialize WebSpeech client on mount
  useEffect(() => {
    // Reset mounted status (cleanup may have set it to false)
    isMountedRef.current = true;

    if (!WebSpeechClient.isAvailable()) {
      handleError(new Error('WebSpeech API not available. Try Chrome.'));
      return;
    }

    webSpeechClientRef.current = new WebSpeechClient({
      language,
      continuous: true, // Keep recognition running - we control when to stop
      interimResults: true,
      verbose,
      onTranscript: handleTranscript,
      onError: handleError,
    });

    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      if (webSpeechClientRef.current) {
        webSpeechClientRef.current.stop();
        webSpeechClientRef.current = null;
      }
      isMountedRef.current = false;
      recognitionStartTimeRef.current = null;
    };
  }, [language, handleTranscript, handleError, verbose]);

  /**
   * Start listening
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      if (verbose) {
        console.log('[useInterruptibleVoice] Starting VAD...');
      }
      vad.start();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start listening');
      handleError(error);
    }
  }, [vad, handleError, verbose]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (verbose) {
      console.log('[useInterruptibleVoice] Stopping listening...');
    }
    vad.pause();

    if (webSpeechClientRef.current) {
      webSpeechClientRef.current.stop();
    }
  }, [vad, verbose]);

  /**
   * Clear transcription
   */
  const clearTranscription = useCallback(() => {
    setTranscription('');
    setInterimResult('');
  }, []);

  // Debug VAD state
  useEffect(() => {
    if (verbose) {
      console.log('[useInterruptibleVoice] VAD state:', {
        listening: vad.listening,
        loading: vad.loading,
        errored: vad.errored,
        userSpeaking: vad.userSpeaking,
      });
    }
  }, [vad.listening, vad.loading, vad.errored, vad.userSpeaking, verbose]);

  return {
    isListening: vad.listening,
    isConnected: !vad.loading && !vad.errored,
    isSpeaking: getTTSStatus().isSpeaking,
    transcription,
    interimResult,
    error: error || (vad.errored && typeof vad.errored === 'string' ? vad.errored : null),
    startListening,
    stopListening,
    clearTranscription,
  };
}
