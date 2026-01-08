/**
 * Voice Interface Library Exports
 *
 * Client-side voice interaction with @ricky0123/vad-react + WebSpeech API
 */

// Core classes
export { WebSpeechClient } from './WebSpeechClient';

// Hooks
export { useInterruptibleVoice } from './useInterruptibleVoice';
export { useTTSWithInterruption } from './useTTSWithInterruption';

// Types
export type {
  // Hook types
  UseInterruptibleVoiceOptions,
  UseInterruptibleVoiceReturn,
  UseTTSWithInterruptionOptions,
  UseTTSWithInterruptionReturn,

  // Component types
  VoiceInterfaceProps,
} from './types';
