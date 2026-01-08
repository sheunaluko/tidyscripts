'use client';

import * as common from "tidyscripts_common";
import * as tsw from "tidyscripts_web";
import { TSVAD } from "./ts_vad/src";

const log = common.logger.get_logger({ id: "onnx" });

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

export async function enable_vad() {
    const ortRuntime = await getOnnxRuntime();
    let silero = await get_silero_session();

    let onSpeechStart = () => {
        log(`Detected speech start will cancel audio if speeaking`);

        let speaking = tsw.util.voice_interface.tts.is_speaking();
        log(`Is speaking=${speaking}`);
        if (speaking) {
            log(`Canceling...`);
            tsw.util.voice_interface.tts.cancel_speech();
        }
    }

    // Pass ortRuntime to TSVAD
    let vad = new TSVAD({
        silero,
        onSpeechStart,
        ort: ortRuntime,
        positiveSpeechThreshold: 0.3,
        negativeSpeechThreshold: 0.25,
        redemptionMs: 1400,
        preSpeechPadMs: 2000,
        minSpeechMs: 400
    });

    vad.start();
    return vad;
}

export async function get_silero_session() {
    log(`Getting silero session`);
    const ortRuntime = await getOnnxRuntime();
    const session = await ortRuntime.InferenceSession.create('/onnx/silero_vad_v5.onnx');
    log(`Returning`);
    return session;
}


export {
    TSVAD 
}
