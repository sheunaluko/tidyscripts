/**
 * Speech Recognition module - WebSpeech API wrapper
 * Minimal implementation for tivi component
 */

declare const window: any;

import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'tivi/speech_recognition' });

export interface RecognitionOps {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  result_dispatch?: string;
  onEnd?: () => void;
}

const DEFAULT_RESULT_DISPATCH = 'tidyscripts_web_speech_recognition_result';
const DEFAULT_INTERIM_DISPATCH = 'tidyscripts_web_speech_recognition_interim';

export function get_recognition_object(ops: RecognitionOps = {}) {
  const {
    continuous = true,
    interimResults = true,
    language = 'en-US',
    result_dispatch = DEFAULT_RESULT_DISPATCH,
    onEnd,
  } = ops;

  // Check if WebSpeech API is available
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    throw new Error('WebSpeech API not supported in this browser. Please use Chrome or Safari.');
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.lang = language;

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Dispatch final results
    if (finalTranscript) {
      log(`Final: ${finalTranscript}`);
      window.dispatchEvent(
        new CustomEvent(result_dispatch, { detail: finalTranscript })
      );
    }

    // Dispatch interim results
    if (interimTranscript) {
      window.dispatchEvent(
        new CustomEvent(DEFAULT_INTERIM_DISPATCH, { detail: interimTranscript })
      );
    }
  };

  recognition.onerror = (event: any) => {
    // "aborted" is expected when we pause recognition - don't log it as error
    if (event.error === 'aborted') {
      log('Recognition aborted (expected)');
      return;
    }

    console.error('[speech_recognition] Error:', event.error);
  };

  recognition.onend = () => {
    log('Recognition ended');
    onEnd?.();
  };

  recognition.onstart = () => {
    log('Recognition started');
  };

  return recognition;
}

export function isAvailable(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
