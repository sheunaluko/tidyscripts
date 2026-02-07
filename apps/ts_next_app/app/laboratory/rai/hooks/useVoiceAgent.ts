/**
 * useVoiceAgent Hook - Simplified voice workflow
 *
 * Direct transcription + keyword detection:
 * - Tivi runs in continuous mode for speech recognition
 * - Transcriptions are added directly to information list (no agent)
 * - Exact "finished" keyword triggers template review
 * - Single LLM call for review, not a full agent loop
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../store/useRaiStore';
import { useSelectedTemplate } from './useTemplateLookups';
import { useTivi } from '../../components/tivi/lib/index';
import { reviewTemplate } from '../lib/rai_agent_web';

const log = tsw.common.logger.get_logger({ id: 'rai_voice' });
const debug = tsw.common.util.debug;

declare var window: any;

interface UseVoiceAgentOptions {
  insightsClient?: any;
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const { insightsClient } = options;

  // Insights ref for use in callbacks
  const insightsRef = useRef<any>(insightsClient);
  useEffect(() => { insightsRef.current = insightsClient; }, [insightsClient]);

  // Safe insights tracking — never throws
  const addInsightEvent = useCallback((eventType: string, payload: Record<string, any>) => {
    try { insightsRef.current?.addEvent(eventType, payload); } catch (_) {}
  }, []);

  const selectedTemplate = useSelectedTemplate();
  const {
    voiceAgentConnected,
    setVoiceAgentConnected,
    addTranscriptEntry,
    addInformationText,
    collectedInformation,
    setInformationComplete,
    setCurrentView,
    setReviewPending,
    setReviewMessage,
    settings,
  } = useRaiStore();

  // Track if voice session is active
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Skip review flag — set after a review returns user_message
  const skipReviewRef = useRef(false);

  // Track processing state
  const isProcessingRef = useRef(false);

  // Stable callback refs
  const handleTiviError = useCallback((error: Error) => {
    log(`Tivi error: ${error.message}`);
    debug.add('tivi_error', { error: error.message });
  }, []);

  const handleTiviInterrupt = useCallback(() => {
    log('User interrupted TTS');
    debug.add('tts_interrupted', { timestamp: new Date().toISOString() });
  }, []);

  // Initialize Tivi — uses settings from store
  const tivi = useTivi({
    mode: settings.tiviMode,
    positiveSpeechThreshold: settings.positiveSpeechThreshold,
    negativeSpeechThreshold: settings.negativeSpeechThreshold,
    minSpeechStartMs: settings.minSpeechStartMs,
    powerThreshold: settings.powerThreshold,
    enableInterruption: settings.enableInterruption,
    language: 'en-US',
    verbose: false,
    onError: handleTiviError,
    onInterrupt: handleTiviInterrupt,
  });

  // Refs for access in callbacks
  const collectedInformationRef = useRef(collectedInformation);
  const selectedTemplateRef = useRef(selectedTemplate);
  useEffect(() => { collectedInformationRef.current = collectedInformation; }, [collectedInformation]);
  useEffect(() => { selectedTemplateRef.current = selectedTemplate; }, [selectedTemplate]);

  // Review and complete — single LLM call
  const reviewAndComplete = useCallback(async () => {
    setReviewPending(true);
    setReviewMessage(null);

    addTranscriptEntry({
      speaker: 'system',
      text: 'Reviewing collected information...',
      timestamp: new Date(),
    });

    try {
      const result = await reviewTemplate(
        selectedTemplateRef.current,
        collectedInformationRef.current,
        settings.agentModel || settings.aiModel,
        insightsRef.current
      );

      if (result.action === 'proceed') {
        addTranscriptEntry({
          speaker: 'system',
          text: 'Review passed. Generating note...',
          timestamp: new Date(),
        });
        setInformationComplete(true);
        setCurrentView('note_generator');
        // Stop listening
        tivi.stopListening();
        setIsSessionActive(false);
        setVoiceAgentConnected(false);
      } else {
        // user_message — speak feedback and set skip flag
        const feedback = result.message || 'Some information may be missing.';
        const fullMessage = `${feedback}. Say finished again to generate the note anyways.`;

        setReviewMessage(feedback);
        skipReviewRef.current = true;

        addTranscriptEntry({
          speaker: 'agent',
          text: fullMessage,
          timestamp: new Date(),
        });

        await tivi.speak(fullMessage, settings.playbackRate || 1.5);
      }
    } catch (error) {
      log(`Review error: ${error}`);
      // On error, proceed anyway
      addTranscriptEntry({
        speaker: 'system',
        text: 'Review encountered an error. Proceeding to note generation...',
        timestamp: new Date(),
      });
      setInformationComplete(true);
      setCurrentView('note_generator');
      tivi.stopListening();
      setIsSessionActive(false);
      setVoiceAgentConnected(false);
    } finally {
      setReviewPending(false);
    }
  }, [
    addTranscriptEntry,
    setInformationComplete,
    setCurrentView,
    setVoiceAgentConnected,
    setReviewPending,
    setReviewMessage,
    settings.agentModel,
    settings.aiModel,
    settings.playbackRate,
    tivi,
  ]);

  // Handle "finished" keyword
  const handleFinishedKeyword = useCallback(async () => {
    addInsightEvent('voice_finished_keyword', { skipReview: skipReviewRef.current });

    if (skipReviewRef.current) {
      // Second "finished" — skip review, proceed directly
      log('Second "finished" detected — skipping review');
      addTranscriptEntry({
        speaker: 'system',
        text: 'Proceeding to note generation...',
        timestamp: new Date(),
      });
      setInformationComplete(true);
      setCurrentView('note_generator');
      tivi.stopListening();
      setIsSessionActive(false);
      setVoiceAgentConnected(false);
    } else {
      await reviewAndComplete();
    }
  }, [
    addTranscriptEntry,
    setInformationComplete,
    setCurrentView,
    setVoiceAgentConnected,
    tivi,
    reviewAndComplete,
    addInsightEvent,
  ]);

  // Handle transcription from Tivi
  const handleTranscription = useCallback(async (text: string) => {
    if (!text || !text.trim()) return;

    // Check if already processing
    if (isProcessingRef.current) {
      log(`Ignoring transcription (processing): ${text}`);
      return;
    }

    isProcessingRef.current = true;
    const trimmed = text.trim();

    log(`Processing transcription: ${trimmed}`);
    debug.add('voice_transcription', { text: trimmed, timestamp: Date.now() });

    // Add user message to transcript
    addTranscriptEntry({
      speaker: 'user',
      text: trimmed,
      timestamp: new Date(),
    });

    // Track each speech input
    addInsightEvent('voice_transcription', { text: trimmed, charLength: trimmed.length });

    // Check for exact "finished" keyword
    if (trimmed.toLowerCase() === 'finished' || trimmed.toLowerCase() === 'finished.') {
      await handleFinishedKeyword();
    } else {
      // Direct transcription → add to information list
      addInformationText(trimmed);
    }

    isProcessingRef.current = false;
  }, [addTranscriptEntry, addInformationText, handleFinishedKeyword, addInsightEvent]);

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
      tivi,
      startAgent,
      stopAgent,
      isSessionActive,
    };
  });

  // Start voice agent — just starts Tivi, no agent init
  const startAgent = useCallback(async () => {
    try {
      log('Starting voice agent (direct transcription mode)...');
      debug.add('voice_agent_start_requested', { template: selectedTemplate?.id });

      // Reset skip review flag
      skipReviewRef.current = false;

      addTranscriptEntry({
        speaker: 'system',
        text: 'Starting voice input...',
        timestamp: new Date(),
      });

      // Start Tivi listening
      await tivi.startListening();

      setIsSessionActive(true);
      setVoiceAgentConnected(true);
      setReviewMessage(null);

      addTranscriptEntry({
        speaker: 'system',
        text: 'Voice input active. Speak naturally — say "finished" when done.',
        timestamp: new Date(),
      });

      log('Voice agent started (continuous mode)');
      debug.add('voice_agent_connected', { timestamp: new Date().toISOString() });
      addInsightEvent('voice_session_started', {
        templateId: selectedTemplate?.id,
        mode: settings.tiviMode,
        positiveSpeechThreshold: settings.positiveSpeechThreshold,
        negativeSpeechThreshold: settings.negativeSpeechThreshold,
        minSpeechStartMs: settings.minSpeechStartMs,
        powerThreshold: settings.powerThreshold,
        enableInterruption: settings.enableInterruption,
        playbackRate: settings.playbackRate,
        aiModel: settings.aiModel,
        agentModel: settings.agentModel,
      });

    } catch (error) {
      log(`Error starting voice agent: ${error}`);
      debug.add('voice_agent_start_error', { error: String(error) });
      addInsightEvent('voice_session_started', { error: String(error), status: 'error' });

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
    setVoiceAgentConnected,
    addTranscriptEntry,
    setReviewMessage,
    tivi,
    addInsightEvent,
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
        text: 'Voice input stopped.',
        timestamp: new Date(),
      });

      log('Voice agent stopped');
      addInsightEvent('voice_session_ended', { transcriptionCount: collectedInformationRef.current.length });

    } catch (error) {
      log(`Error stopping voice agent: ${error}`);
      debug.add('voice_agent_stop_error', { error: String(error) });

      // Force cleanup
      setIsSessionActive(false);
      setVoiceAgentConnected(false);
    }
  }, [setVoiceAgentConnected, addTranscriptEntry, tivi, addInsightEvent]);

  return {
    startAgent,
    stopAgent,
    connected: voiceAgentConnected,
    isSessionActive,
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
