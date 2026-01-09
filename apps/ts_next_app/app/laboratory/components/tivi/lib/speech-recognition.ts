/**
 * Clean WebSpeech API wrapper for speech recognition
 */

export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  verbose?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class SpeechRecognitionManager {
  private recognition: any = null;
  private isActive: boolean = false;
  private config: SpeechRecognitionConfig;

  constructor(config: SpeechRecognitionConfig) {
    this.config = config;
    this.initialize();
  }

  private initialize(): void {
    // Check browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();

    // Configure
    this.recognition.continuous = this.config.continuous ?? true;
    this.recognition.interimResults = this.config.interimResults ?? true;
    this.recognition.lang = this.config.language || 'en-US';
    this.recognition.maxAlternatives = this.config.maxAlternatives || 1;

    // Set up event handlers
    this.recognition.onresult = (event: any) => this.handleResult(event);
    this.recognition.onerror = (event: any) => this.handleError(event);
    this.recognition.onstart = () => this.handleStart();
    this.recognition.onend = () => this.handleEnd();
  }

  private handleResult(event: any): void {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      this.config.onResult?.(transcript, isFinal);
    }
  }

  private handleError(event: any): void {
    // Expected errors that should be handled silently
    const expectedErrors = ['no-speech', 'audio-capture', 'aborted'];

    if (expectedErrors.includes(event.error)) {
      // Log for debugging if verbose mode enabled
      if (this.config.verbose) {
        console.debug(`[SpeechRecognition] Expected error: ${event.error} (auto-recovering)`);
      }
      // These are recoverable - recognition will restart via onend
      // Don't surface as errors to the user
      return;
    }

    // Only report actual errors
    const error = new Error(`Speech recognition error: ${event.error}`);
    this.config.onError?.(error);
  }

  private handleStart(): void {
    this.isActive = true;
    this.config.onStart?.();
  }

  private handleEnd(): void {
    this.isActive = false;
    this.config.onEnd?.();
    // No auto-restart - let VAD control when to start
  }

  start(): void {
    if (this.isActive) return;

    try {
      this.recognition.start();
    } catch (error: any) {
      // Ignore if already started
      if (error.name !== 'InvalidStateError') {
        this.config.onError?.(error as Error);
      }
    }
  }

  stop(): void {
    if (this.recognition && this.isActive) {
      this.recognition.stop();
    }
  }

  pause(): void {
    if (this.recognition && this.isActive) {
      this.recognition.abort();
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  updateLanguage(language: string): void {
    const wasActive = this.isActive;
    if (wasActive) this.stop();

    this.config.language = language;
    this.recognition.lang = language;

    if (wasActive) this.start();
  }
}
