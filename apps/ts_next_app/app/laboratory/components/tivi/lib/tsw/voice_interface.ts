/**
 * Voice Interface module - High-level voice interaction API
 * Combines speech recognition and TTS
 * Minimal implementation for tivi component
 */

import * as sr from './speech_recognition';
import * as tts from './tts';
import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'tivi/voice_interface' });

export let recognition: any = null;

export enum RecognitionState {
  NULL = 'NULL',
  STOPPED = 'STOPPED',
  PAUSED = 'PAUSED',
  LISTENING = 'LISTENING',
  STOPPING = 'STOPPING',
}

export let recognition_state: RecognitionState = RecognitionState.NULL;

export function initialize_recognition(ops?: sr.RecognitionOps) {
  stop_recognition();

  ops = ops || {};

  const old_on_end = ops.onEnd;

  ops.onEnd = function () {
    if (recognition_state === RecognitionState.STOPPING) {
      log('Recognition stopped');
      recognition_state = RecognitionState.STOPPED;
    } else {
      recognition_state = RecognitionState.PAUSED;
      log('Recognition paused');
    }

    old_on_end?.();
  };

  recognition = sr.get_recognition_object(ops);
  recognition_state = RecognitionState.PAUSED;

  return recognition;
}

export function pause_recognition() {
  if (recognition) {
    recognition.abort();
    recognition_state = RecognitionState.PAUSED;
  }
}

export function stop_recognition() {
  if (recognition) {
    log('Stopping recognition');
    recognition_state = RecognitionState.STOPPING;
    recognition.abort();
    recognition = null;
  }
}

export async function start_recognition() {
  if (recognition_state === RecognitionState.LISTENING) {
    return;
  }

  // Don't start recognition while TTS is speaking
  if (tts.is_speaking()) {
    log('Wont start recognition while TTS active');
    return;
  }

  if (recognition) {
    recognition.start();
  } else {
    initialize_recognition();
    log('Recognition initialized without args');
  }

  recognition_state = RecognitionState.LISTENING;
}

export async function speak(text: string) {
  tts.speak({ text, rate: tts.default_rate });
}

export async function speak_with_rate(text: string, rate: number) {
  tts.speak({ text, rate });
}

export async function speak_with_voice(
  text: string,
  voiceURI: string | null,
  rate: number
) {
  tts.speak({ text, voiceURI, rate });
}

// Re-export tts and sr modules
export { tts, sr };
