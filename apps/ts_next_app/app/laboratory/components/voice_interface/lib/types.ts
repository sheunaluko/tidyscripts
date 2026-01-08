/**
 * TypeScript types and interfaces for voice_interface component
 *
 * Updated for Silero VAD + WebSpeech API architecture
 */

// ============================================================================
// Audio Processing Types
// ============================================================================

/**
 * Audio stream configuration
 */
export interface AudioStreamConfig {
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Options for useInterruptibleVoice hook
 */
export interface UseInterruptibleVoiceOptions {
  /**
   * Callback when transcription is completed
   */
  onTranscription?: (text: string) => void;

  /**
   * Callback when TTS is interrupted
   */
  onInterrupt?: () => void;

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void;

  // Silero VAD Configuration
  /**
   * Probability threshold above which is considered speech (0-1)
   * Default: 0.3
   * Lower = more sensitive, Higher = less sensitive
   */
  positiveSpeechThreshold?: number;

  /**
   * Probability threshold below which is considered silence (0-1)
   * Default: 0.25 (usually ~0.15 below positiveSpeechThreshold)
   */
  negativeSpeechThreshold?: number;

  /**
   * Minimum milliseconds of speech required to trigger onSpeechEnd
   * Default: 400
   * Lower = faster interruption, Higher = avoid false positives
   */
  minSpeechMs?: number;

  /**
   * Milliseconds of grace period after silence before ending speech segment
   * Default: 1400
   * Lower = faster cutoff, Higher = avoid cutting off speech
   */
  redemptionMs?: number;

  /**
   * Milliseconds of audio to prepend before detected speech
   * Default: 800
   */
  preSpeechPadMs?: number;

  // General Configuration
  /**
   * Auto-start listening on mount
   * Default: false
   */
  autoStart?: boolean;

  /**
   * Language for WebSpeech API transcription (e.g., 'en-US', 'es-ES')
   * Default: 'en-US'
   */
  language?: string;

  /**
   * Enable verbose logging (shows all debug logs)
   * When false, only logs speech start and final transcripts
   * Default: false
   */
  verbose?: boolean;
}

/**
 * Return value for useInterruptibleVoice hook
 */
export interface UseInterruptibleVoiceReturn {
  /**
   * Is currently listening/recording
   */
  isListening: boolean;

  /**
   * Is TTS currently speaking
   */
  isSpeaking: boolean;

  /**
   * Final transcription text
   */
  transcription: string;

  /**
   * Interim/partial transcription result
   */
  interimResult: string;

  /**
   * Start listening/recording
   */
  startListening: () => Promise<void>;

  /**
   * Stop listening/recording
   */
  stopListening: () => void;

  /**
   * Clear transcription text
   */
  clearTranscription: () => void;

  /**
   * Connection status
   */
  isConnected: boolean;

  /**
   * Error message (if any)
   */
  error: string | null;
}

/**
 * Options for useTTSWithInterruption hook
 */
export interface UseTTSWithInterruptionOptions {
  /**
   * Callback when user interrupts TTS
   */
  onInterrupt?: () => void;

  /**
   * Callback for errors
   */
  onError?: (error: Error) => void;

  /**
   * VAD config for interruption detection
   * Probability threshold above which is considered speech (0-1)
   * Default: 0.85 (more sensitive during TTS to catch interruptions)
   */
  positiveSpeechThreshold?: number;

  /**
   * Probability threshold below which is considered silence (0-1)
   * Default: 0.7
   */
  negativeSpeechThreshold?: number;

  /**
   * Minimum milliseconds of speech required to trigger interruption
   * Default: 300 (quick detection for responsive interruption)
   */
  minSpeechMs?: number;

  /**
   * Enable verbose logging
   * Default: false
   */
  verbose?: boolean;
}

/**
 * Return value for useTTSWithInterruption hook
 */
export interface UseTTSWithInterruptionReturn {
  /**
   * Is TTS currently playing
   */
  isSpeaking: boolean;

  /**
   * Speak text with interruption support
   * Automatically pauses recognition, plays TTS, monitors for interruptions, resumes recognition
   */
  speak: (text: string, rate?: number) => Promise<void>;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for VoiceInterface component
 */
export interface VoiceInterfaceProps {
  // Controlled state (optional - for integration with state management)
  isListening?: boolean;
  transcription?: string;
  interimResult?: string;

  // Callbacks for state updates
  onListeningChange?: (isListening: boolean) => void;
  onTranscriptionChange?: (transcription: string) => void;
  onTranscription?: (text: string) => void;
  onInterrupt?: () => void;
  onError?: (error: Error) => void;

  // Silero VAD Configuration
  positiveSpeechThreshold?: number; // 0-1, default: 0.3
  negativeSpeechThreshold?: number; // 0-1, default: 0.25
  minSpeechMs?: number; // default: 400
  redemptionMs?: number; // default: 1400
  preSpeechPadMs?: number; // default: 800

  // General Configuration
  autoStart?: boolean;
  language?: string; // For WebSpeech API (e.g., 'en-US')
  showVisualizer?: boolean;
  visualizerHeight?: number;

  // Display
  compact?: boolean;
}
