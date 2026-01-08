import type { InferenceSession } from 'onnxruntime-web';

// Configuration options for TSVAD
export interface TSVADOptions {
  // Pre-loaded Silero ONNX session (user provides)
  silero: InferenceSession;

  // ONNX Runtime instance (required for creating tensors)
  ort?: any;

  // Frame processor thresholds
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  redemptionMs: number;
  preSpeechPadMs: number;
  minSpeechMs: number;

  // Optional event handlers (alternative to using .on() method)
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onFrameProcessed?: (probability: number, frame: Float32Array) => void;
  onError?: (error: Error) => void;
}

// Partial options for runtime updates
export interface TSVADPartialOptions {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  redemptionMs?: number;
  preSpeechPadMs?: number;
  minSpeechMs?: number;
}

// Default configuration values
export const DEFAULT_OPTIONS: Omit<TSVADOptions, 'silero'> = {
  positiveSpeechThreshold: 0.7,
  negativeSpeechThreshold: 0.45,
  redemptionMs: 1400,
  preSpeechPadMs: 800,
  minSpeechMs: 400,
};

// Speech probability result from model
export interface SpeechProbabilities {
  isSpeech: number;
  notSpeech: number;
}

// Event map for TSVAD events
export type TSVADEventMap = {
  'speech-start': () => void;
  'speech-end': (audio: Float32Array) => void;
  'frame-processed': (probability: number, frame: Float32Array) => void;
  'error': (error: Error) => void;
};

export type TSVADEventType = keyof TSVADEventMap;

// Internal message types for worklet communication
export enum MessageType {
  AudioFrame = 'AUDIO_FRAME',
  Stop = 'STOP',
}

// Worklet message structure
export interface WorkletMessage {
  type: MessageType;
  data?: ArrayBuffer;
}

// Constants for Silero V5
export const FRAME_SAMPLES = 512;
export const SAMPLE_RATE = 16000;
export const MS_PER_FRAME = (FRAME_SAMPLES / SAMPLE_RATE) * 1000; // 32ms

// Frame processor options
export interface FrameProcessorOptions {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  redemptionMs: number;
  preSpeechPadMs: number;
  minSpeechMs: number;
}

// Frame processor event types
export type FrameProcessorEvent =
  | { type: 'speech-start' }
  | { type: 'speech-end'; audio: Float32Array }
  | { type: 'frame-processed'; probability: number; frame: Float32Array };
