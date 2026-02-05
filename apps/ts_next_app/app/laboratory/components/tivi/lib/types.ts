/**
 * TypeScript type definitions for tivi component
 */

import { MutableRefObject } from 'react';

/**
 * Recognition modes for TIVI:
 * - 'guarded': VAD triggers recognition (may miss first word, but filters noise)
 * - 'responsive': Power threshold triggers recognition (fast, low latency)
 * - 'continuous': Recognition auto-restarts (always listening, uses more resources)
 *
 * Interruption (VAD cancelling TTS on speech) is controlled separately via enableInterruption.
 */
export type TiviMode = 'guarded' | 'responsive' | 'continuous';

export interface UseTiviOptions {
  /**
   * Callback when speech is transcribed (final result)
   */
  onTranscription?: (text: string) => void;

  /**
   * Callback when TTS is interrupted by user speech
   */
  onInterrupt?: () => void;

  /**
   * Callback for audio power level (0-1) for visualization
   */
  onAudioLevel?: (level: number) => void;

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void;

  /**
   * Speech recognition language (e.g., 'en-US', 'es-ES')
   * Default: 'en-US'
   */
  language?: string;

  /**
   * VAD speech detection threshold (0-1)
   * Lower = more sensitive
   * Default: 0.3
   */
  positiveSpeechThreshold?: number;

  /**
   * VAD silence detection threshold (0-1)
   * Should be ~0.15 below positiveSpeechThreshold
   * Default: 0.25
   */
  negativeSpeechThreshold?: number;

  /**
   * Minimum consecutive ms above threshold before triggering speech-start
   * Prevents false positives from brief spikes
   * Default: 150
   */
  minSpeechStartMs?: number;

  /**
   * Enable verbose logging for debugging
   * Default: false
   */
  verbose?: boolean;

  /**
   * Recognition mode
   * Default: 'responsive'
   */
  mode?: TiviMode;

  /**
   * Audio power threshold for 'responsive' mode (0-1)
   * Recognition starts when audio power exceeds this level
   * Default: 0.01
   */
  powerThreshold?: number;

  /**
   * Whether VAD can interrupt TTS when speech is detected.
   * When false, TTS always plays to completion regardless of mode.
   * Default: true
   */
  enableInterruption?: boolean;
}

export interface UseTiviReturn {
  /**
   * Whether VAD is currently listening for speech
   */
  isListening: boolean;

  /**
   * Whether TTS is currently speaking
   */
  isSpeaking: boolean;

  /**
   * Whether VAD is connected and ready
   */
  isConnected: boolean;

  /**
   * Final transcription text (accumulated)
   */
  transcription: string;

  /**
   * Interim transcription (real-time, not final)
   */
  interimResult: string;

  /**
   * Current audio power level (0-1) for visualization (as ref to avoid re-renders)
   */
  audioLevelRef: MutableRefObject<number>;

  /**
   * Current VAD speech probability (0-1) for visualization (as ref to avoid re-renders)
   */
  speechProbRef: MutableRefObject<number>;

  /**
   * Error message, if any
   */
  error: string | null;

  /**
   * Current recognition mode
   */
  mode: TiviMode;

  /**
   * Whether TTS interruption is enabled
   */
  enableInterruption: boolean;

  /**
   * Start listening for speech
   */
  startListening: () => Promise<void>;

  /**
   * Stop listening for speech
   */
  stopListening: () => void;

  /**
   * Speak text using TTS
   * @param text - Text to speak
   * @param rate - Speech rate (0.1-10.0), default 1.0
   */
  speak: (text: string, rate?: number) => Promise<void>;

  /**
   * Clear accumulated transcription
   */
  clearTranscription: () => void;

  /**
   * Cancel current speech output
   */
  cancelSpeech: () => void;

  /**
   * Pause speech recognition
   */
  pauseSpeechRecognition: () => void;

  /**
   * Resume VAD frame processing (for calibration in responsive/continuous modes)
   */
  resumeVADProcessing: () => void;

  /**
   * Pause VAD frame processing
   */
  pauseVADProcessing: () => void;
}

export interface TiviProps extends UseTiviOptions {
  // Component-specific props can be added here if needed
}
