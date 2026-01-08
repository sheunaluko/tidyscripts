/**
 * AudioWorklet processor code as a string
 * This will be loaded as a blob URL and run in the audio worklet context
 */
export const WORKLET_CODE = `
const FRAME_SAMPLES = 512;
const SAMPLE_RATE = 16000;
const MESSAGE_TYPE_AUDIO_FRAME = 'AUDIO_FRAME';
const MESSAGE_TYPE_STOP = 'STOP';

// Resampler class embedded in worklet
class Resampler {
  constructor(nativeSampleRate) {
    this.nativeSampleRate = nativeSampleRate;
    this.targetSampleRate = SAMPLE_RATE;
    this.targetFrameSize = FRAME_SAMPLES;
    this.inputBuffer = [];

    if (nativeSampleRate < 16000) {
      console.error(
        'nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate'
      );
    }
  }

  process(audioFrame) {
    const outputFrames = [];

    for (const sample of audioFrame) {
      this.inputBuffer.push(sample);

      while (this.hasEnoughDataForFrame()) {
        const outputFrame = this.generateOutputFrame();
        outputFrames.push(outputFrame);
      }
    }

    return outputFrames;
  }

  reset() {
    this.inputBuffer = [];
  }

  hasEnoughDataForFrame() {
    return (
      (this.inputBuffer.length * this.targetSampleRate) / this.nativeSampleRate >=
      this.targetFrameSize
    );
  }

  generateOutputFrame() {
    const outputFrame = new Float32Array(this.targetFrameSize);
    let outputIndex = 0;
    let inputIndex = 0;

    while (outputIndex < this.targetFrameSize) {
      let sum = 0;
      let num = 0;

      while (
        inputIndex <
        Math.min(
          this.inputBuffer.length,
          ((outputIndex + 1) * this.nativeSampleRate) / this.targetSampleRate
        )
      ) {
        const value = this.inputBuffer[inputIndex];
        if (value !== undefined) {
          sum += value;
          num++;
        }
        inputIndex++;
      }

      outputFrame[outputIndex] = sum / num;
      outputIndex++;
    }

    this.inputBuffer = this.inputBuffer.slice(inputIndex);
    return outputFrame;
  }
}

// AudioWorklet Processor
class TSVADProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.resampler = new Resampler(sampleRate);
    this.stopProcessing = false;

    this.port.onmessage = (event) => {
      if (event.data === MESSAGE_TYPE_STOP) {
        this.stopProcessing = true;
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (this.stopProcessing) {
      return false; // Signal to stop processing
    }

    // Get first input channel
    const input = inputs[0];
    if (!input || !input[0]) {
      return true; // Keep processing
    }

    const audioData = input[0];

    // Resample and generate frames
    const frames = this.resampler.process(audioData);

    // Post each frame to main thread
    for (const frame of frames) {
      this.port.postMessage(
        {
          type: MESSAGE_TYPE_AUDIO_FRAME,
          data: frame.buffer
        },
        [frame.buffer] // Transfer ownership for efficiency
      );
    }

    return true; // Keep processing
  }
}

registerProcessor('ts-vad-worklet', TSVADProcessor);
`;
