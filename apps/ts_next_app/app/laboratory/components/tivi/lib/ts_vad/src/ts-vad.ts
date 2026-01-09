import { EventEmitter } from './events';
import { SileroV5Model } from './model';
import { FrameProcessor } from './frame-processor';
import { WORKLET_CODE } from './worklet';
import {
  TSVADOptions,
  TSVADPartialOptions,
  TSVADEventMap,
  DEFAULT_OPTIONS,
  WorkletMessage,
  MessageType,
  MS_PER_FRAME,
  SAMPLE_RATE,
} from './types';

type TSVADState = 'stopped' | 'running' | 'paused';

/**
 * Main TSVAD class - Event-based Voice Activity Detection
 *
 * Usage with .on() method:
 * ```typescript
 * const vad = new TSVAD({ silero: sileroSession });
 * vad.on('speech-start', () => console.log('Speech started'));
 * vad.on('speech-end', (audio) => console.log('Speech ended', audio));
 * await vad.start();
 * ```
 *
 * Usage with constructor handlers:
 * ```typescript
 * const vad = new TSVAD({
 *   silero: sileroSession,
 *   onSpeechStart: () => console.log('Speech started'),
 *   onSpeechEnd: (audio) => console.log('Speech ended', audio),
 * });
 * await vad.start();
 * ```
 */
export class TSVAD extends EventEmitter<TSVADEventMap> {
  private model: SileroV5Model;
  private frameProcessor: FrameProcessor;
  private options: TSVADOptions;
  private state: TSVADState = 'stopped';

  // Audio nodes
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private workletBlobUrl: string | null = null;

  constructor(options: TSVADOptions) {
    super();

    // Merge with defaults
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // Initialize model wrapper
    if (!options.ort) {
      throw new Error('TSVAD requires ort runtime to be provided in options');
    }
    this.model = new SileroV5Model(options.silero, options.ort);

    // Initialize frame processor
    this.frameProcessor = new FrameProcessor(this.options, MS_PER_FRAME);

    // Register event handlers if provided in options
    if (options.onSpeechStart) {
      this.on('speech-start', options.onSpeechStart);
    }
    if (options.onSpeechEnd) {
      this.on('speech-end', options.onSpeechEnd);
    }
    if (options.onFrameProcessed) {
      this.on('frame-processed', options.onFrameProcessed);
    }
    if (options.onError) {
      this.on('error', options.onError);
    }
  }

  /**
   * Start the VAD - automatically requests microphone access
   */
  async start(): Promise<void> {
    if (this.state === 'running') {
      return; // Already running
    }

    try {
      // Resume frame processor
      this.frameProcessor.resume();

      // Only set up audio pipeline if not paused (nodes don't exist yet)
      if (this.state !== 'paused') {
        // Request microphone access with echo cancellation enabled
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
            sampleRate: { ideal: 48000 }
          }
        });

        // Create audio context
        this.audioContext = new AudioContext();

        // Create blob URL for worklet code
        const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
        this.workletBlobUrl = URL.createObjectURL(blob);

        // Load worklet module
        await this.audioContext.audioWorklet.addModule(this.workletBlobUrl);

        // Create AudioWorklet node
        this.workletNode = new AudioWorkletNode(this.audioContext, 'ts-vad-worklet');

        // Set up message handler
        this.workletNode.port.onmessage = (event: MessageEvent) => {
          this.handleWorkletMessage(event.data);
        };

        // Create source node from stream
        this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
          mediaStream: this.stream,
        });

        // Create analyser node for power monitoring
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 2048;

        // Create gain node set to 0 (silent) to connect to destination
        // This ensures browser applies echo cancellation properly
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0;

        // Connect nodes: source → analyser → worklet → gain(0) → destination
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.workletNode);
        this.workletNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
      } else {
        // Resuming from pause - reconnect existing stream
        if (!this.audioContext || !this.stream || !this.analyserNode || !this.gainNode) {
          throw new Error('Cannot resume - audio context, stream, analyser, or gain node not available');
        }

        // Recreate source node
        this.sourceNode = new MediaStreamAudioSourceNode(this.audioContext, {
          mediaStream: this.stream,
        });

        // Reconnect: source → analyser → worklet → gain(0) → destination
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.workletNode!);
        this.workletNode!.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
      }

      this.state = 'running';
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
      throw error;
    }
  }

  /**
   * Pause the VAD (stops processing but keeps resources)
   */
  pause(): void {
    if (this.state !== 'running') {
      return;
    }

    // Disconnect audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }

    // Pause frame processor and emit any pending speech-end events
    const events = this.frameProcessor.pause();
    for (const event of events) {
      if (event.type === 'speech-end') {
        this.emit('speech-end', event.audio);
      }
    }

    this.state = 'paused';
  }

  /**
   * Stop the VAD completely and cleanup resources
   */
  stop(): void {
    if (this.state === 'stopped') {
      return;
    }

    // Disconnect and cleanup audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.workletNode) {
      // Send stop message to worklet
      this.workletNode.port.postMessage(MessageType.Stop);
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(err => {
        console.error('Error closing AudioContext:', err);
      });
      this.audioContext = null;
    }

    // Cleanup blob URL
    if (this.workletBlobUrl) {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = null;
    }

    // Reset model and frame processor
    this.model.reset();
    this.frameProcessor.reset();

    this.state = 'stopped';
  }

  /**
   * Update configuration options at runtime
   * @param options - Partial options to update
   */
  setOptions(options: TSVADPartialOptions): void {
    this.options = { ...this.options, ...options };
    this.frameProcessor.setOptions(options);
  }

  /**
   * Handle messages from the audio worklet
   */
  private handleWorkletMessage(message: WorkletMessage): void {
    if (message.type !== MessageType.AudioFrame || !message.data) {
      return;
    }

    // Convert ArrayBuffer back to Float32Array
    const frame = new Float32Array(message.data);

    // Process frame asynchronously
    this.processFrame(frame).catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
    });
  }

  /**
   * Process a single audio frame through the model and frame processor
   */
  private async processFrame(frame: Float32Array): Promise<void> {
    try {
      // Run model inference
      const probabilities = await this.model.process(frame);

      // Process through frame processor
      const events = this.frameProcessor.process(frame, probabilities.isSpeech);

      // Emit events
      for (const event of events) {
        switch (event.type) {
          case 'speech-start':
            this.emitWithDefault('speech-start');
            break;
          case 'speech-end':
            this.emitWithDefault('speech-end', event.audio);
            break;
          case 'frame-processed':
            this.emit('frame-processed', event.probability, event.frame);
            break;
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
    }
  }

  /**
   * Emit event with default console logging if no handlers are registered
   */
  private emitWithDefault(event: 'speech-start'): void;
  private emitWithDefault(event: 'speech-end', audio: Float32Array): void;
  private emitWithDefault(event: 'speech-start' | 'speech-end', audio?: Float32Array): void {
    // Check if there are any listeners
    const hasListeners = this.listenerCount(event) > 0;

    if (hasListeners) {
      // Emit to user-provided handlers
      if (event === 'speech-start') {
        this.emit('speech-start');
      } else if (event === 'speech-end' && audio) {
        this.emit('speech-end', audio);
      }
    } else {
      // Use default console logging
      if (event === 'speech-start') {
        console.log('Speech started');
      } else if (event === 'speech-end' && audio) {
        console.log('Speech ended', {
          samples: audio.length,
          durationMs: Math.round((audio.length / SAMPLE_RATE) * 1000),
        });
      }
    }
  }

  /**
   * Get current VAD state
   */
  getState(): TSVADState {
    return this.state;
  }

  /**
   * Get the audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get the analyser node
   */
  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Get the media stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }
}
