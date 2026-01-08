/**
 * Tivi - Tidyscripts Voice Interface Component
 *
 * A self-contained voice interaction component with:
 * - VAD-based speech detection (Silero VAD v5)
 * - Browser speech recognition (WebSpeech API)
 * - Text-to-speech with automatic interruption
 * - Real-time audio level visualization
 */

export { Tivi } from './tivi';
export { useTivi } from './lib';
export type { TiviProps, UseTiviOptions, UseTiviReturn } from './lib';
export { default } from './tivi';
