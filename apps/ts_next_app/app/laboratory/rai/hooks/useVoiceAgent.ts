/**
 * useVoiceAgent Hook - Voice agent management using Tivi and RAI Agent
 *
 * This hook integrates:
 * - Tivi for voice input (VAD + speech recognition) and output (TTS)
 * - RAI Agent (Cortex-based) for LLM-powered conversation
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../store/useRaiStore';
import { useTivi } from '../../components/tivi/lib/index';
import { useRaiAgent } from './useRaiAgent';
import type { Cortex } from 'tidyscripts_common/src/apis/cortex/cortex';

const log = tsw.common.logger.get_logger({ id: 'rai_voice' });
const debug = tsw.common.util.debug;

declare var window: any;

interface UseVoiceAgentOptions {
  insightsClient?: any;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const { insightsClient } = options;

  const {
    selectedTemplate,
    voiceAgentConnected,
    setVoiceAgentConnected,
    addTranscriptEntry,
    settings,
  } = useRaiStore();

  // Track if voice session is active
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Track processing state to prevent duplicate processing
  const isProcessingRef = useRef(false);
  const lastTranscriptionTimeRef = useRef<number>(0);
  const speechCooldownMs = 1500; // Ignore transcriptions within this time of last processed

  // Agent ref to access from callbacks
  const agentRef = useRef<Cortex | null>(null);

  // Initialize RAI agent
  const { agent, isLoading: agentLoading, error: agentError, reinitialize: reinitializeAgent } = useRaiAgent({
    model: settings.agentModel || settings.aiModel,
    insightsClient,
    onComplete: () => {
      log('Information collection complete, stopping voice agent');
      // Stop listening when complete
      tivi.stopListening();
      setIsSessionActive(false);
      setVoiceAgentConnected(false);
    }
  });

  // Keep agent ref updated
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  // Calculate Tivi parameters from settings
  const tiviMode = settings.tiviMode || 'guarded';
  const positiveSpeechThreshold = settings.vadThreshold < 0.5 ? 0.8 : settings.vadThreshold;
  const negativeSpeechThreshold = positiveSpeechThreshold - 0.2;

  // Initialize Tivi for voice I/O
  const tivi = useTivi({
    mode: tiviMode as 'guarded' | 'responsive' | 'continuous',
    positiveSpeechThreshold,
    negativeSpeechThreshold,
    minSpeechStartMs: 150,
    language: 'en-US',
    verbose: false,
    powerThreshold: 0.01,
    onError: (error) => {
      log(`Tivi error: ${error.message}`);
      debug.add('tivi_error', { error: error.message });
    },
    onInterrupt: () => {
      log('User interrupted TTS');
      debug.add('tts_interrupted', { timestamp: new Date().toISOString() });
    },
  });

  // Handle transcription from Tivi
  const handleTranscription = useCallback(async (text: string) => {
    if (!text || !text.trim()) return;

    // Check cooldown
    const now = Date.now();
    if (now - lastTranscriptionTimeRef.current < speechCooldownMs) {
      log(`Ignoring transcription (cooldown): ${text}`);
      return;
    }

    // Check if already processing
    if (isProcessingRef.current) {
      log(`Ignoring transcription (processing): ${text}`);
      return;
    }

    lastTranscriptionTimeRef.current = now;
    isProcessingRef.current = true;

    log(`Processing transcription: ${text}`);
    debug.add('voice_transcription', { text, timestamp: now });

    // Add user message to transcript
    addTranscriptEntry({
      speaker: 'user',
      text,
      timestamp: new Date(),
    });

    // Send to agent
    const currentAgent = agentRef.current;
    if (currentAgent) {
      try {
        // Pause speech recognition while processing
        tivi.pauseSpeechRecognition();

        // Add user input to agent
        currentAgent.add_user_text_input(text);

        // Run LLM to get response
        log('Running LLM...');
        const response = await currentAgent.run_llm(4); // max 4 tool calls per turn

        // The agent should have called respond_to_user tool which adds to transcript
        // and returns the text to speak
        if (response && typeof response === 'string') {
          log(`Agent response: ${response}`);

          // Speak the response
          await tivi.speak(response, settings.playbackRate || 1.5);
        }

      } catch (error) {
        log(`Agent error: ${error}`);
        debug.add('agent_error', { error: String(error) });

        // Speak error message
        await tivi.speak('Sorry, I encountered an error. Please try again.', 1.5);
      }
    } else {
      log('No agent available');
    }

    isProcessingRef.current = false;
  }, [addTranscriptEntry, settings.playbackRate, tivi]);

  // Listen for transcription events
  useEffect(() => {
    if (!isSessionActive) return;

    const handleResult = (e: CustomEvent) => {
      const text = e.detail;
      if (text && text.trim()) {
        handleTranscription(text);
      }
    };

    window.addEventListener('tidyscripts_web_speech_recognition_result', handleResult as EventListener);

    return () => {
      window.removeEventListener('tidyscripts_web_speech_recognition_result', handleResult as EventListener);
    };
  }, [isSessionActive, handleTranscription]);

  // Expose debug objects to window
  useEffect(() => {
    window.voiceAgentDebug = {
      agent: agentRef.current,
      tivi,
      startAgent,
      stopAgent,
      isSessionActive,
      agentLoading,
      agentError,
    };
  });

  // Start voice agent
  const startAgent = useCallback(async () => {
    try {
      log('Starting voice agent...');
      debug.add('voice_agent_start_requested', { template: selectedTemplate?.id });

      // Add system message
      addTranscriptEntry({
        speaker: 'system',
        text: 'Initializing voice agent...',
        timestamp: new Date(),
      });

      // Wait for agent to be ready
      if (agentLoading) {
        addTranscriptEntry({
          speaker: 'system',
          text: 'Waiting for agent to initialize...',
          timestamp: new Date(),
        });

        // Poll for agent ready (max 10 seconds)
        let waitTime = 0;
        while (agentLoading && waitTime < 10000) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitTime += 100;
        }
      }

      if (agentError) {
        throw agentError;
      }

      if (!agentRef.current) {
        throw new Error('Agent failed to initialize');
      }

      // Start Tivi listening
      await tivi.startListening();

      setIsSessionActive(true);
      setVoiceAgentConnected(true);

      addTranscriptEntry({
        speaker: 'system',
        text: 'Voice agent connected. Ready for input.',
        timestamp: new Date(),
      });

      log('Voice agent started');
      debug.add('voice_agent_connected', { timestamp: new Date().toISOString() });

      // Send initial greeting to agent
      setTimeout(async () => {
        const currentAgent = agentRef.current;
        if (currentAgent && isSessionActive) {
          try {
            currentAgent.add_user_text_input('Initialize');

            const response = await currentAgent.run_llm(4);

            if (response && typeof response === 'string') {
              await tivi.speak(response, settings.playbackRate || 1.5);
            }
          } catch (error) {
            log(`Initial greeting error: ${error}`);
          }
        }
      }, 500);

    } catch (error) {
      log(`Error starting voice agent: ${error}`);
      debug.add('voice_agent_start_error', { error: String(error) });

      setIsSessionActive(false);
      setVoiceAgentConnected(false);

      addTranscriptEntry({
        speaker: 'system',
        text: `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  }, [
    selectedTemplate,
    agentLoading,
    agentError,
    setVoiceAgentConnected,
    addTranscriptEntry,
    settings.playbackRate,
    tivi,
    isSessionActive,
  ]);

  // Stop voice agent
  const stopAgent = useCallback(async () => {
    try {
      log('Stopping voice agent...');
      debug.add('voice_agent_stop_requested', { timestamp: new Date().toISOString() });

      // Stop Tivi
      tivi.stopListening();
      tivi.cancelSpeech();

      setIsSessionActive(false);
      setVoiceAgentConnected(false);

      addTranscriptEntry({
        speaker: 'system',
        text: 'Voice agent stopped',
        timestamp: new Date(),
      });

      log('Voice agent stopped');

    } catch (error) {
      log(`Error stopping voice agent: ${error}`);
      debug.add('voice_agent_stop_error', { error: String(error) });

      // Force cleanup
      setIsSessionActive(false);
      setVoiceAgentConnected(false);
    }
  }, [setVoiceAgentConnected, addTranscriptEntry, tivi]);

  return {
    startAgent,
    stopAgent,
    connected: voiceAgentConnected,
    isSessionActive,
    agentLoading,
    agentError,
    reinitializeAgent,
    // Tivi state for UI
    tivi: {
      isListening: tivi.isListening,
      isSpeaking: tivi.isSpeaking,
      isConnected: tivi.isConnected,
      interimResult: tivi.interimResult,
      audioLevelRef: tivi.audioLevelRef,
      speechProbRef: tivi.speechProbRef,
      cancelSpeech: tivi.cancelSpeech,
    },
  };
}

export default useVoiceAgent;
