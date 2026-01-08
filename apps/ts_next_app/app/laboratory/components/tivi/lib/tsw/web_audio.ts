/**
 * Web Audio module - Microphone and audio analysis
 * Minimal implementation for tivi component
 */

declare const window: any;

import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'tivi/web_audio' });

export let ctx: AudioContext | null = null;
export let stream: MediaStream | null = null;
export let analyser: AnalyserNode | null = null;
export let data_array: Float32Array | null = null;
export let mic_callbacks: { [key: string]: (data: Float32Array) => void } = {};
export let mic_initialized = false;

const AUDIO_POWER_EVENT = 'tidyscripts_web_mic';

export async function get_audio_context(): Promise<AudioContext> {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

export async function get_audio_stream(): Promise<MediaStream> {
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }
  return stream;
}

export async function get_sampling_rate(): Promise<number> {
  const audioCtx = await get_audio_context();
  return audioCtx.sampleRate;
}

export function register_mic_callback(id: string, callback: (data: Float32Array) => void) {
  mic_callbacks[id] = callback;
  log(`Registered mic callback: ${id}`);
}

export function run_mic_callbacks(data: Float32Array) {
  Object.values(mic_callbacks).forEach((callback) => {
    try {
      callback(data);
    } catch (error) {
      console.error('[web_audio] Mic callback error:', error);
    }
  });
}

/**
 * Initialize microphone and start audio analysis
 */
export async function initialize_microphone() {
  log('Initializing microphone...');

  try {
    const audioCtx = await get_audio_context();
    const audioStream = await get_audio_stream();

    // Create analyser node
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    // Create source from microphone stream
    const source = audioCtx.createMediaStreamSource(audioStream);
    source.connect(analyser);

    // Create data array for time-domain data
    const bufferLength = analyser.fftSize;
    data_array = new Float32Array(bufferLength);

    mic_initialized = true;
    log('Microphone initialized');

    // Start continuous audio analysis
    startAudioAnalysis();

    return audioStream;
  } catch (error) {
    console.error('[web_audio] Microphone initialization failed:', error);
    throw error;
  }
}

/**
 * Continuously analyze audio and dispatch power events
 */
function startAudioAnalysis() {
  if (!analyser || !data_array) return;

  function analyze() {
    if (!analyser || !data_array) return;

    // Get time-domain data
    analyser.getFloatTimeDomainData(data_array);

    // Calculate audio power (RMS)
    const power = calculateAudioPower(data_array);

    // Dispatch power event for visualization
    window.dispatchEvent(new CustomEvent(AUDIO_POWER_EVENT, { detail: power }));

    // Run registered callbacks
    run_mic_callbacks(data_array);

    // Continue analysis
    requestAnimationFrame(analyze);
  }

  analyze();
}

/**
 * Calculate audio power (RMS value)
 */
function calculateAudioPower(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  const rms = Math.sqrt(sum / data.length);
  return rms;
}

export async function shutdown() {
  log('Shutting down...');

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (ctx) {
    await ctx.close();
    ctx = null;
  }

  analyser = null;
  data_array = null;
  mic_callbacks = {};
  mic_initialized = false;

  log('Shutdown complete');
}
