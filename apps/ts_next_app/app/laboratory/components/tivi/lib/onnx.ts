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
    ort = await import(/* webpackIgnore: true */ '/onnx/ort.all.min.mjs');

    // Explicitly set the WASM paths to the public folder
    ort.env.wasm.wasmPaths = '/onnx/';
    ort.env.logLevel = 'error';
    onnxInitialized = true;
    log('ONNX runtime initialized from /onnx/ort.all.min.mjs');
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

export { TSVAD };
