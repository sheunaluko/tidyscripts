/**
 * useTTSWithInterruption - React hook for TTS with VAD-based interruption
 *
 * Provides a speak() function that:
 * - Pauses tidyscripts recognition
 * - Plays TTS
 * - Monitors for user speech via VAD
 * - Auto-cancels TTS if user speaks
 * - Resumes recognition after TTS/interruption
 *
 * Does NOT manage recognition - component keeps existing tidyscripts event listeners.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as vad from '@ricky0123/vad-web';
import * as tsw from 'tidyscripts_web';

export interface UseTTSWithInterruptionOptions {
  // Callbacks
  onInterrupt?: () => void;  // Called when user interrupts TTS
  onError?: (error: Error) => void;

  // VAD config for interruption detection
  positiveSpeechThreshold?: number; // Default: 0.85 (more sensitive during TTS)
  negativeSpeechThreshold?: number; // Default: 0.7
  minSpeechMs?: number; // Default: 300 (quick detection)
  verbose?: boolean;
}

export interface UseTTSWithInterruptionReturn {
  // State
  isSpeaking: boolean;  // Is TTS playing?

  // Controls
  speak: (text: string, rate?: number) => Promise<void>; // TTS with interruption
}

export function useTTSWithInterruption(
  options: UseTTSWithInterruptionOptions
): UseTTSWithInterruptionReturn {
  const {
    onInterrupt,
    onError,
    positiveSpeechThreshold = 0.85,
    negativeSpeechThreshold = 0.7,
    minSpeechMs = 300,
    verbose = false,
  } = options;

  // State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs
  const recognitionThresholdRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false); // For VAD callback access
  const vadInstanceRef = useRef<any>(null); // Store VAD instance

  // Cleanup VAD on unmount
  useEffect(() => {
    return () => {
      if (vadInstanceRef.current) {
        if (verbose) {
          console.log('[useTTSWithInterruption] Cleaning up VAD on unmount');
        }
        vadInstanceRef.current.destroy();
        vadInstanceRef.current = null;
      }
    };
  }, [verbose]);

  /**
   * Get or create VAD instance (lazy initialization)
   */
  const getVAD = useCallback(async () => {
    if (vadInstanceRef.current) {
      return vadInstanceRef.current;
    }

    if (verbose) {
      console.log('[useTTSWithInterruption] Creating VAD instance');
    }

    // Get microphone stream with echo cancellation
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,  // Critical: prevents TTS feedback
        noiseSuppression: true,  // Reduces background noise
        autoGainControl: true,   // Normalizes volume
      },
    });

    const vadInstance = await vad.MicVAD.new({
      positiveSpeechThreshold,
      negativeSpeechThreshold,
      minSpeechFramesCount: Math.floor(minSpeechMs / 30), // Convert ms to frames (30ms per frame)

      onnxWASMBasePath: "/vad/",
      baseAssetPath: "/vad/",

      // Use custom stream with echo cancellation
      stream,

      onSpeechStart: () => {
        if (verbose) {
          console.log('[useTTSWithInterruption] Speech detected during TTS - interrupting');
        }

        // Only interrupt if TTS is actually playing
        if (isSpeakingRef.current) {
          const tts = tsw?.util?.voice_interface?.tts;
          if (tts?.cancel_speech) {
            console.log('[useTTSWithInterruption] Canceling TTS');
            tts.cancel_speech();
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            onInterrupt?.();

            // Stop VAD
            if (vadInstanceRef.current) {
              vadInstanceRef.current.pause();
            }

            // Resume tidyscripts recognition
            const vi = tsw?.util?.voice_interface;
            if (vi && recognitionThresholdRef.current !== null) {
              if (verbose) {
                console.log('[useTTSWithInterruption] Resuming recognition after interruption');
              }
              vi.start_recognition_and_detection(recognitionThresholdRef.current);
            }
          }
        }
      },

      onSpeechEnd: () => {
        // No action needed - just waiting for next speech
        if (verbose) {
          console.log('[useTTSWithInterruption] Speech ended');
        }
      },
    });

    vadInstanceRef.current = vadInstance;
    return vadInstance;
  }, [positiveSpeechThreshold, negativeSpeechThreshold, minSpeechMs, verbose, onInterrupt]);

  /**
   * Speak with interruption support
   */
  const speak = useCallback(async (text: string, rate: number = 1.0) => {
    const vi = tsw?.util?.voice_interface;
    const tts = vi?.tts;
    if (!vi || !tts) {
      console.error('[useTTSWithInterruption] TTS not available');
      onError?.(new Error('TTS not available'));
      return;
    }

    let vadInstance: any = null;

    try {
      if (verbose) {
        console.log('[useTTSWithInterruption] Starting TTS with rate:', rate);
      }

      // 1. Stop tidyscripts recognition (if running)
      const threshold = vi.stop_recognition_and_detection();
      recognitionThresholdRef.current = threshold;
      if (verbose) {
        console.log('[useTTSWithInterruption] Stopped recognition, threshold:', threshold);
      }

      // 2. Get/create VAD instance (but don't start yet)
      vadInstance = await getVAD();
      setIsSpeaking(true);
      isSpeakingRef.current = true;

      // 3. Start TTS
      tts.speak({ text, rate });

      // 4. Wait before starting VAD (let TTS start and echo cancellation kick in)
      await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay

      if (isSpeakingRef.current) {
        vadInstance.start();
        if (verbose) {
          console.log('[useTTSWithInterruption] Started VAD after delay');
        }
      }

      // 5. Wait for TTS to finish (or be interrupted)
      await tts.finished_speaking();

      // 6. If TTS finished naturally (not interrupted), clean up
      if (isSpeakingRef.current) {
        if (verbose) {
          console.log('[useTTSWithInterruption] TTS finished naturally');
        }
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        // Stop VAD
        if (vadInstance) {
          vadInstance.pause();
        }

        // Resume tidyscripts recognition
        if (recognitionThresholdRef.current !== null) {
          if (verbose) {
            console.log('[useTTSWithInterruption] Resuming recognition after natural finish');
          }
          vi.start_recognition_and_detection(recognitionThresholdRef.current);
        }
      }
      // If interrupted, VAD onSpeechStart already handled cleanup

    } catch (err) {
      console.error('[useTTSWithInterruption] TTS error:', err);
      onError?.(err instanceof Error ? err : new Error('TTS error'));
      setIsSpeaking(false);
      isSpeakingRef.current = false;

      // Stop VAD on error
      if (vadInstance) {
        try {
          vadInstance.pause();
        } catch (vadErr) {
          console.error('[useTTSWithInterruption] Failed to pause VAD:', vadErr);
        }
      }

      // Try to resume recognition even on error
      if (recognitionThresholdRef.current !== null) {
        try {
          vi.start_recognition_and_detection(recognitionThresholdRef.current);
        } catch (resumeErr) {
          console.error('[useTTSWithInterruption] Failed to resume recognition:', resumeErr);
        }
      }
    }
  }, [getVAD, onError, verbose]);

  return {
    isSpeaking,
    speak,
  };
}
