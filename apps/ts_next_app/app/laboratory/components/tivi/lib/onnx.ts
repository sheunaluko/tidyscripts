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
    ort = await import('onnxruntime-web/wasm');
  }

  if (!onnxInitialized) {
    // Configure where onnxruntime looks for wasm and mjs files
    ort.env.wasm.wasmPaths = '/onnx/';
    ort.env.wasm.mjs = '/onnx/';
    ort.env.logLevel = 'error';
    onnxInitialized = true;
    log('ONNX runtime initialized');
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
