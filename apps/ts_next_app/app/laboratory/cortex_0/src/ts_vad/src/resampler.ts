import { FRAME_SAMPLES, SAMPLE_RATE } from './types';

/**
 * Audio resampler that converts native sample rate to 16kHz
 * and outputs fixed-size frames of 512 samples
 */
export class Resampler {
  private inputBuffer: number[] = [];
  private readonly targetSampleRate = SAMPLE_RATE;
  private readonly targetFrameSize = FRAME_SAMPLES;

  constructor(private readonly nativeSampleRate: number) {
    if (nativeSampleRate < 16000) {
      console.error(
        'nativeSampleRate is too low. Should have 16000 = targetSampleRate <= nativeSampleRate'
      );
    }
  }

  /**
   * Process an audio frame and return any complete resampled frames
   * @param audioFrame - Input audio samples at native sample rate
   * @returns Array of resampled frames (512 samples @ 16kHz each)
   */
  process(audioFrame: Float32Array): Float32Array[] {
    const outputFrames: Float32Array[] = [];

    for (const sample of audioFrame) {
      this.inputBuffer.push(sample);

      while (this.hasEnoughDataForFrame()) {
        const outputFrame = this.generateOutputFrame();
        outputFrames.push(outputFrame);
      }
    }

    return outputFrames;
  }

  /**
   * Reset the internal buffer
   */
  reset(): void {
    this.inputBuffer = [];
  }

  /**
   * Check if we have enough input samples to generate a complete output frame
   */
  private hasEnoughDataForFrame(): boolean {
    return (
      (this.inputBuffer.length * this.targetSampleRate) / this.nativeSampleRate >=
      this.targetFrameSize
    );
  }

  /**
   * Generate a single output frame by averaging/resampling input samples
   */
  private generateOutputFrame(): Float32Array {
    const outputFrame = new Float32Array(this.targetFrameSize);
    let outputIndex = 0;
    let inputIndex = 0;

    while (outputIndex < this.targetFrameSize) {
      let sum = 0;
      let num = 0;

      // Average input samples that correspond to this output sample
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

    // Remove consumed samples from buffer
    this.inputBuffer = this.inputBuffer.slice(inputIndex);
    return outputFrame;
  }
}
