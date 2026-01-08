/**
 * Text-to-Speech (TTS) module - Browser speechSynthesis wrapper
 * Minimal implementation for tivi component
 */

declare const window: any;

import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'tivi/tts' });

export const tts = () => window.speechSynthesis;

export let speech_queue: SpeechOps[] = [];

export interface SpeechOps {
  text: string;
  voiceURI?: string | null;
  rate?: number;
}

export let default_rate: number = 1;

export function set_default_rate(n: number) {
  default_rate = n;
  log(`Default rate set to: ${n}`);
}

export function cancel_speech() {
  log('Canceling speech and queue');
  speech_queue = [];
  tts().cancel();
}

export function is_speaking(): boolean {
  return tts().speaking || speech_queue.length > 0;
}

export async function finished_speaking() {
  return new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      if (!tts().speaking && speech_queue.length < 1) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 200);
  });
}

export function get_voices() {
  return tts().getVoices();
}

export function get_voice(voiceURI: string) {
  const voices = tts().getVoices().filter((v: any) => v.voiceURI === voiceURI);
  return voices.length > 0 ? voices[0] : null;
}

export function get_voice_by_name(name: string) {
  const voices = tts().getVoices().filter((v: any) => v.name === name);
  return voices.length > 0 ? voices[0] : null;
}

export function speak(ops: SpeechOps) {
  const { text, voiceURI, rate = default_rate } = ops;

  speech_queue.push(ops);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;

  if (voiceURI) {
    const voice = get_voice(voiceURI);
    if (voice) {
      utterance.voice = voice;
    }
  }

  utterance.onend = () => {
    speech_queue = speech_queue.filter((item) => item !== ops);
  };

  utterance.onerror = (error) => {
    // "interrupted" is expected when we cancel speech - don't log it as error
    if (error.error === 'interrupted') {
      log('Speech interrupted (expected)');
      speech_queue = speech_queue.filter((item) => item !== ops);
      return;
    }

    console.error('[tts] Speech error:', error);
    speech_queue = speech_queue.filter((item) => item !== ops);
  };

  tts().speak(utterance);
}
