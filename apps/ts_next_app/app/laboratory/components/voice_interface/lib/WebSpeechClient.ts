/**
 * WebSpeechClient - Wrapper around browser Web Speech API
 *
 * Handles speech recognition using the browser's built-in SpeechRecognition API.
 * Provides continuous recognition with interim results.
 */

export interface WebSpeechClientOptions {
  /** Language code (e.g., 'en-US', 'es-ES'). Default: 'en-US' */
  language?: string;
  /** Enable continuous recognition. Default: true */
  continuous?: boolean;
  /** Return interim (non-final) results. Default: true */
  interimResults?: boolean;
  /** Enable verbose logging. Default: false */
  verbose?: boolean;

  // Callbacks
  /** Called with transcription text and whether it's final */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Called on errors */
  onError?: (error: Error) => void;
}

/**
 * Web Speech API Client
 *
 * @example
 * ```typescript
 * const client = new WebSpeechClient({
 *   language: 'en-US',
 *   onTranscript: (text, isFinal) => {
 *     if (isFinal) {
 *       console.log('Final:', text);
 *     } else {
 *       console.log('Interim:', text);
 *     }
 *   },
 * });
 *
 * if (client.isAvailable()) {
 *   client.start();
 * }
 * ```
 */
export class WebSpeechClient {
  private recognition: any = null;
  private options: WebSpeechClientOptions;
  private isRecognizing: boolean = false;

  constructor(options: WebSpeechClientOptions) {
    this.options = {
      language: options.language || 'en-US',
      continuous: options.continuous ?? true,
      interimResults: options.interimResults ?? true,
      verbose: options.verbose ?? false,
      onTranscript: options.onTranscript,
      onError: options.onError,
    };

    this.initializeRecognition();
  }

  /**
   * Initialize the SpeechRecognition instance
   */
  private initializeRecognition(): void {
    if (typeof window === 'undefined') {
      console.warn('[WebSpeechClient] Not available in SSR');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[WebSpeechClient] SpeechRecognition not available in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.language;

    // Handle results
    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        console.log('[WebSpeechClient] Final transcript:', final);
        this.options.onTranscript(final, true);
      }

      if (interim) {
        if (this.options.verbose) {
          console.log('[WebSpeechClient] Interim transcript:', interim);
        }
        this.options.onTranscript(interim, false);
      }
    };

    // Handle errors
    this.recognition.onerror = (event: any) => {
      console.error('[WebSpeechClient] Recognition error:', event.error);
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.options.onError?.(error);
    };

    // Handle end (auto-restart if continuous mode is on)
    this.recognition.onend = () => {
      if (this.options.verbose) {
        console.log('[WebSpeechClient] Recognition ended');
      }

      // Check if we should auto-restart BEFORE setting isRecognizing to false
      const shouldRestart = this.options.continuous && this.isRecognizing;
      this.isRecognizing = false;

      // Auto-restart if we were recognizing and continuous mode is on
      // This handles browser timeouts in continuous mode
      if (shouldRestart) {
        if (this.options.verbose) {
          console.log('[WebSpeechClient] Auto-restarting recognition');
        }
        try {
          this.recognition.start();
          this.isRecognizing = true;
        } catch (error) {
          if (this.options.verbose) {
            console.warn('[WebSpeechClient] Failed to auto-restart:', error);
          }
        }
      }
    };

    // Handle start
    this.recognition.onstart = () => {
      if (this.options.verbose) {
        console.log('[WebSpeechClient] Recognition started');
      }
      this.isRecognizing = true;
    };
  }

  /**
   * Start speech recognition
   */
  start(): void {
    if (!this.recognition) {
      const error = new Error('SpeechRecognition not available');
      console.error('[WebSpeechClient]', error.message);
      this.options.onError?.(error);
      return;
    }

    if (this.isRecognizing) {
      if (this.options.verbose) {
        console.warn('[WebSpeechClient] Recognition already running');
      }
      return;
    }

    try {
      this.recognition.start();
      if (this.options.verbose) {
        console.log('[WebSpeechClient] Starting recognition...');
      }
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error('Failed to start speech recognition');
      console.error('[WebSpeechClient] Start error:', err);
      this.options.onError?.(err);
    }
  }

  /**
   * Stop speech recognition
   */
  stop(): void {
    if (!this.recognition) {
      return;
    }

    if (!this.isRecognizing) {
      if (this.options.verbose) {
        console.warn('[WebSpeechClient] Recognition not running');
      }
      return;
    }

    try {
      this.recognition.stop();
      this.isRecognizing = false;
      if (this.options.verbose) {
        console.log('[WebSpeechClient] Stopping recognition...');
      }
    } catch (error) {
      console.error('[WebSpeechClient] Stop error:', error);
    }
  }

  /**
   * Check if recognition is currently running
   */
  getIsRecognizing(): boolean {
    return this.isRecognizing;
  }

  /**
   * Check if SpeechRecognition is available in this browser
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    return typeof SpeechRecognition !== 'undefined';
  }

  /**
   * Instance method to check availability
   */
  isAvailable(): boolean {
    return WebSpeechClient.isAvailable();
  }

  /**
   * Check if currently recognizing
   */
  isActive(): boolean {
    return this.isRecognizing;
  }
}
