'use client';

import { TSVAD } from './ts_vad/src';
import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'tivi/onnx' });

// Track if ONNX has been initialized
let onnxInitialized = false;
let ort: any = null;

// Dynamically import ONNX runtime (only on client side)
async function getOnnxRuntime() {
  if (typeof window === 'undefined') {
    throw new Error('ONNX runtime can only be used on client side');
  }

  if (!ort) {
    // This bypasses the entire Webpack/Terser/SWC pipeline
    // It loads the minified file directly from the public folder
    // webpackIgnore tells webpack to completely ignore this import
    // @ts-expect-error - Dynamic import from public folder, type checking not applicable
    ort = await import(/* webpackIgnore: true */ '/onnx/ort.wasm.min.mjs');

    // Explicitly set the WASM paths to the public folder
    ort.env.wasm.wasmPaths = '/onnx/';
    ort.env.logLevel = 'error';
    onnxInitialized = true;
    log('ONNX runtime initialized from /onnx/ort.wasm.min.mjs');
  }

  return ort;
}

export async function get_ort() {
  return await getOnnxRuntime();
}

export async function get_silero_session() {
  const ortRuntime = await getOnnxRuntime();
  log('Loading Silero VAD session');
  const session = await ortRuntime.InferenceSession.create('/onnx/silero_vad_v5.onnx');
  log('Silero session loaded');
  return session;
}

export async function enable_vad(options: {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onFrameProcessed?: (prob: number, frame: Float32Array) => void;
  onError?: (err: Error) => void;
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  redemptionMs?: number;
  preSpeechPadMs?: number;
  minSpeechMs?: number;
}): Promise<{
  vad: TSVAD;
  audioContext: AudioContext;
  analyserNode: AnalyserNode;
  stream: MediaStream;
}> {
  log('Enabling VAD...');
  const ortRuntime = await getOnnxRuntime();
  const silero = await get_silero_session();

  const vad = new TSVAD({
    silero,
    ort: ortRuntime,
    onSpeechStart: options.onSpeechStart,
    onSpeechEnd: options.onSpeechEnd,
    onFrameProcessed: options.onFrameProcessed,
    onError: options.onError,
    positiveSpeechThreshold: options.positiveSpeechThreshold ?? 0.8,
    negativeSpeechThreshold: options.negativeSpeechThreshold ?? 0.6,
    redemptionMs: options.redemptionMs ?? 1400,
    preSpeechPadMs: options.preSpeechPadMs ?? 1000,
    minSpeechMs: options.minSpeechMs ?? 400,
  });

  await vad.start();

  // Get audio components from VAD
  const audioContext = vad.getAudioContext();
  const analyserNode = vad.getAnalyserNode();
  const stream = vad.getStream();

  if (!audioContext || !analyserNode || !stream) {
    throw new Error('Failed to initialize VAD audio pipeline');
  }

  log('VAD enabled and started');
  return { vad, audioContext, analyserNode, stream };
}

export { TSVAD };
