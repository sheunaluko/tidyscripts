/**
 * TS_VAD - Minimal, modular Voice Activity Detection library
 *
 * @example
 * ```typescript
 * import { TSVAD } from 'ts_vad';
 * import * as ort from 'onnxruntime-web';
 *
 * // Load Silero V5 model
 * const modelBuffer = await fetch('/silero_vad_v5.onnx').then(r => r.arrayBuffer());
 * const silero = await ort.InferenceSession.create(modelBuffer);
 *
 * // Create VAD instance
 * const vad = new TSVAD({ silero });
 *
 * // Register event listeners
 * vad.on('speech-start', () => console.log('Speech started'));
 * vad.on('speech-end', (audio) => console.log('Speech ended', audio));
 * vad.on('frame-processed', (prob, frame) => console.log('Probability:', prob));
 * vad.on('error', (err) => console.error('Error:', err));
 *
 * // Start VAD
 * const ctx = new AudioContext();
 * const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 * await vad.start(ctx, stream);
 *
 * // Control
 * vad.pause();
 * vad.stop();
 * vad.setOptions({ positiveSpeechThreshold: 0.4 });
 * ```
 */

// Main exports
export { TSVAD } from './ts-vad';
export { SileroV5Model } from './model';
export { FrameProcessor } from './frame-processor';
export { Resampler } from './resampler';
export { EventEmitter } from './events';

// Type exports
export type {
  TSVADOptions,
  TSVADPartialOptions,
  TSVADEventMap,
  TSVADEventType,
  SpeechProbabilities,
  FrameProcessorOptions,
  FrameProcessorEvent,
  WorkletMessage,
} from './types';

export { MessageType, DEFAULT_OPTIONS, FRAME_SAMPLES, SAMPLE_RATE, MS_PER_FRAME } from './types';
