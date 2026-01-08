import { FrameProcessorOptions, FrameProcessorEvent, MS_PER_FRAME } from './types';

/**
 * Helper to concatenate multiple Float32Arrays
 */
function concatArrays(arrays: Float32Array[]): Float32Array {
  const sizes = arrays.reduce(
    (out, next) => {
      out.push((out.at(-1) as number) + next.length);
      return out;
    },
    [0]
  );
  const outArray = new Float32Array(sizes.at(-1) as number);
  arrays.forEach((arr, index) => {
    const place = sizes[index];
    outArray.set(arr, place);
  });
  return outArray;
}

/**
 * Speech detection state machine
 * Processes audio frames and their speech probabilities to detect speech segments
 */
export class FrameProcessor {
  private redemptionFrames: number;
  private preSpeechPadFrames: number;
  private minSpeechFrames: number;
  private speaking: boolean = false;
  private audioBuffer: { frame: Float32Array; isSpeech: boolean }[] = [];
  private redemptionCounter: number = 0;
  private speechFrameCount: number = 0;
  private active: boolean = false;

  constructor(
    private options: FrameProcessorOptions,
    private readonly msPerFrame: number = MS_PER_FRAME
  ) {
    this.redemptionFrames = Math.floor(options.redemptionMs / msPerFrame);
    this.preSpeechPadFrames = Math.floor(options.preSpeechPadMs / msPerFrame);
    this.minSpeechFrames = Math.floor(options.minSpeechMs / msPerFrame);
    this.reset();
  }

  /**
   * Update configuration options at runtime
   */
  setOptions(update: Partial<FrameProcessorOptions>): void {
    this.options = { ...this.options, ...update };
    this.redemptionFrames = Math.floor(this.options.redemptionMs / this.msPerFrame);
    this.preSpeechPadFrames = Math.floor(this.options.preSpeechPadMs / this.msPerFrame);
    this.minSpeechFrames = Math.floor(this.options.minSpeechMs / this.msPerFrame);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.speaking = false;
    this.audioBuffer = [];
    this.redemptionCounter = 0;
    this.speechFrameCount = 0;
  }

  /**
   * Pause processing, potentially returning speech-end event if currently speaking
   */
  pause(): FrameProcessorEvent[] {
    this.active = false;
    const events: FrameProcessorEvent[] = [];

    if (this.speaking) {
      const speechFrameCount = this.audioBuffer.reduce((acc, item) => {
        return item.isSpeech ? acc + 1 : acc;
      }, 0);

      if (speechFrameCount >= this.minSpeechFrames) {
        const audio = concatArrays(this.audioBuffer.map((item) => item.frame));
        events.push({ type: 'speech-end', audio });
      }
    }

    this.reset();
    return events;
  }

  /**
   * Resume processing
   */
  resume(): void {
    this.active = true;
  }

  /**
   * Process a single audio frame and its speech probability
   * Returns array of events that occurred
   */
  process(frame: Float32Array, probability: number): FrameProcessorEvent[] {
    if (!this.active) {
      return [];
    }

    const events: FrameProcessorEvent[] = [];
    const isSpeech = probability >= this.options.positiveSpeechThreshold;

    // Always emit frame-processed event
    events.push({
      type: 'frame-processed',
      probability,
      frame,
    });

    // Add frame to buffer
    this.audioBuffer.push({ frame, isSpeech });

    // Update counters
    if (isSpeech) {
      this.speechFrameCount++;
      this.redemptionCounter = 0;
    }

    // Detect speech start
    if (isSpeech && !this.speaking) {
      this.speaking = true;
      events.push({ type: 'speech-start' });
    }

    // Detect speech end
    if (
      probability < this.options.negativeSpeechThreshold &&
      this.speaking &&
      ++this.redemptionCounter >= this.redemptionFrames
    ) {
      this.redemptionCounter = 0;
      this.speechFrameCount = 0;
      this.speaking = false;

      const audioBuffer = this.audioBuffer;
      this.audioBuffer = [];

      // Check if speech segment meets minimum duration
      const speechFrameCount = audioBuffer.reduce((acc, item) => {
        return item.isSpeech ? acc + 1 : acc;
      }, 0);

      if (speechFrameCount >= this.minSpeechFrames) {
        const audio = concatArrays(audioBuffer.map((item) => item.frame));
        events.push({ type: 'speech-end', audio });
      }
      // Note: Misfire event omitted - can add if needed
    }

    // Maintain pre-speech buffer when not speaking
    if (!this.speaking) {
      while (this.audioBuffer.length > this.preSpeechPadFrames) {
        this.audioBuffer.shift();
      }
      this.speechFrameCount = 0;
    }

    return events;
  }
}
