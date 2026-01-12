/**
 * Local TTS implementation for tivi
 * Ported from tidyscripts_web with fixes for voice loading
 */

'use client';

export interface TTSOptions {
  text: string;
  voiceURI?: string | null;
  rate?: number;
}

// Get speech synthesis API
function getSpeechSynthesis(): SpeechSynthesis {
  if (typeof window === 'undefined') {
    throw new Error('TTS is only available in browser environment');
  }
  return window.speechSynthesis;
}

// Voice management
let voicesLoaded = false;
let voicesLoadPromise: Promise<void> | null = null;

/**
 * Wait for voices to be loaded
 * This fixes the issue where first utterance uses wrong voice
 */
export async function waitForVoices(): Promise<void> {
  if (voicesLoaded) return;

  // Return existing promise if already waiting
  if (voicesLoadPromise) return voicesLoadPromise;

  voicesLoadPromise = new Promise<void>((resolve) => {
    const synth = getSpeechSynthesis();
    const voices = synth.getVoices();

    if (voices.length > 0) {
      voicesLoaded = true;
      resolve();
      return;
    }

    // Wait for voiceschanged event
    const handler = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        voicesLoaded = true;
        synth.removeEventListener('voiceschanged', handler);
        resolve();
      }
    };

    synth.addEventListener('voiceschanged', handler);

    // Timeout after 3 seconds
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', handler);
      voicesLoaded = true;
      resolve();
    }, 3000);
  });

  return voicesLoadPromise;
}

/**
 * Get all available voices
 */
export function getVoices(): SpeechSynthesisVoice[] {
  return getSpeechSynthesis().getVoices();
}

/**
 * Get voice by URI
 */
export function getVoiceByURI(voiceURI: string): SpeechSynthesisVoice | null {
  const voices = getVoices().filter((v) => v.voiceURI === voiceURI);
  return voices.length > 0 ? voices[0] : null;
}

/**
 * Get voice by name
 */
export function getVoiceByName(name: string): SpeechSynthesisVoice | null {
  const voices = getVoices().filter((v) => v.name === name);
  return voices.length > 0 ? voices[0] : null;
}

/**
 * Check if TTS is currently speaking
 */
export function isSpeaking(): boolean {
  return getSpeechSynthesis().speaking;
}

/**
 * Cancel current speech
 */
export function cancelSpeech(): void {
  getSpeechSynthesis().cancel();
}

/**
 * Wait for current utterance to finish
 */
export async function waitForUtteranceComplete(): Promise<void> {
  const synth = getSpeechSynthesis();

  return new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      if (!synth.speaking) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

/**
 * Speak text with specified options
 */
export async function speak(options: TTSOptions): Promise<void> {
  const { text, voiceURI, rate = 1.5 } = options;

  // Wait for voices to be loaded first (fixes voice switching issue)
  await waitForVoices();

  const synth = getSpeechSynthesis();

  // Cancel any ongoing speech
  if (synth.speaking) {
    synth.cancel();
    // Give it a moment to cancel
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice if specified
    if (voiceURI) {
      const voice = getVoiceByURI(voiceURI);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.rate = rate;

    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (event) => {
      // Don't reject for intentional interruption
      if (event.error === 'interrupted') {
        // This is expected when cancelSpeech() is called
        // Resolve the promise normally (speaking was stopped, not failed)
        resolve();
        return;
      }

      // Only reject for actual errors
      reject(new Error(`TTS error: ${event.error}`));
    };

    synth.speak(utterance);
  });
}

/**
 * Speak with specified rate
 * Uses voice from localStorage if available
 */
export async function speakWithRate(text: string, rate: number = 1.0): Promise<void> {
  let voiceURI: string | null = null;

  // Try to get saved voice from localStorage
  try {
    voiceURI = localStorage.getItem('default_voice_uri');
  } catch (e) {
    // localStorage might not be available
  }

  return speak({ text, voiceURI, rate });
}

/**
 * Set default voice by URI and save to localStorage
 */
export function setDefaultVoice(voiceURI: string): void {
  try {
    localStorage.setItem('default_voice_uri', voiceURI);
  } catch (e) {
    console.error('Failed to save voice to localStorage:', e);
  }
}

/**
 * Get default voice URI from localStorage
 */
export function getDefaultVoiceURI(): string | null {
  try {
    return localStorage.getItem('default_voice_uri');
  } catch (e) {
    return null;
  }
}
