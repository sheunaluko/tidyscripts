import * as ort from 'onnxruntime-web';
import type { InferenceSession, Tensor } from 'onnxruntime-web';
import { SpeechProbabilities, SAMPLE_RATE } from './types';

/**
 * Wrapper for Silero V5 ONNX model
 * Manages model state and provides speech probability predictions
 */
export class SileroV5Model {
  private state: Tensor;
  private readonly sr: Tensor;

  constructor(private readonly session: InferenceSession) {
    // Initialize state tensor for Silero V5: [2, 1, 128]
    this.state = this.createStateTensor();

    // Initialize sample rate tensor (constant 16000)
    this.sr = new ort.Tensor('int64', [BigInt(SAMPLE_RATE)]);
  }

  /**
   * Process an audio frame and return speech probability
   * @param frame - Audio frame (512 samples @ 16kHz)
   * @returns Speech probabilities
   */
  async process(frame: Float32Array): Promise<SpeechProbabilities> {
    // Create input tensor from audio frame
    const inputTensor = new ort.Tensor('float32', frame, [1, frame.length]);

    // Run inference
    const inputs = {
      input: inputTensor,
      state: this.state,
      sr: this.sr,
    };

    const outputs = await this.session.run(inputs);

    // Update state from model output
    if (!outputs['stateN']) {
      throw new Error('No stateN output from model');
    }
    this.state = outputs['stateN'];

    // Extract speech probability
    if (!outputs['output']?.data) {
      throw new Error('No output data from model');
    }

    const isSpeech = outputs['output'].data[0];
    if (typeof isSpeech !== 'number') {
      throw new Error('Invalid output data type from model');
    }

    const notSpeech = 1 - isSpeech;
    return { isSpeech, notSpeech };
  }

  /**
   * Reset the model state (useful when starting a new audio stream)
   */
  reset(): void {
    this.state = this.createStateTensor();
  }

  /**
   * Create a new state tensor initialized to zeros
   */
  private createStateTensor(): Tensor {
    const stateSize = 2 * 128; // 256 total elements
    const zeros = Array(stateSize).fill(0);
    return new ort.Tensor('float32', zeros, [2, 1, 128]);
  }
}
