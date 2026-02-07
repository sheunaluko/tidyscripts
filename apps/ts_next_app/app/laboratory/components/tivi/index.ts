/**
 * Tivi - Tidyscripts Voice Interface Component
 *
 * A self-contained voice interaction component with:
 * - VAD-based speech detection (Silero VAD v5)
 * - Browser speech recognition (WebSpeech API)
 * - Text-to-speech with automatic interruption
 * - Real-time audio level visualization
 * - Device-local settings management (VAD thresholds, TTS voice, playback rate)
 */

export { Tivi } from './tivi';
export { useTivi } from './lib';
export { VoiceSelector } from './VoiceSelector';
export type { TiviProps, UseTiviOptions, UseTiviReturn } from './lib';
export { default } from './tivi';

// Settings module
export { getTiviSettings, updateTiviSettings, resetTiviSettings, TIVI_DEFAULTS, useTiviSettings } from './lib';
export type { TiviSettings } from './lib';
