// useVoiceAgent Hook - Voice agent management

import { useCallback, useRef } from 'react';
import { RealtimeSession } from '@openai/agents/realtime';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../store/useRaiStore';
import { createRealtimeAgent, getEphemeralKey } from '../lib/voiceAgent';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

export function useVoiceAgent() {
  const {
    selectedTemplate,
    addInformationText,
    setInformationComplete,
    setCurrentView,
    voiceAgentConnected,
    setVoiceAgentConnected,
    addTranscriptEntry,
  } = useRaiStore();

  const sessionRef = useRef<RealtimeSession | null>(null);
  const agentRef = useRef<any>(null);

  const startAgent = useCallback(async () => {
    try {
      log('Starting voice agent...');
      debug.add('voice_agent_start_requested', { template: selectedTemplate?.id });

      // Get ephemeral key
      const apiKey = await getEphemeralKey();

      // Create agent with store bindings
      const agent = createRealtimeAgent(selectedTemplate, {
        addInformationText,
        setInformationComplete,
        setCurrentView,
      });
      agentRef.current = agent;

      // Create session with agent and configuration
      const session = new RealtimeSession(agent, {
        model: 'gpt-realtime',
        config: {
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          inputAudioTranscription: {
            model: 'whisper-1',
          },
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            prefixPaddingMs: 300,
            silenceDurationMs: 500,
          },
        },
      });
      sessionRef.current = session;

      // Add connection status message
      addTranscriptEntry({
        speaker: 'system',
        text: 'Connecting to voice agent...',
        timestamp: new Date(),
      });

      // Connect the session with API key
      await session.connect({ apiKey });
      log('Voice agent session connected');
      debug.add('voice_agent_connected', { timestamp: new Date() });

      setVoiceAgentConnected(true);
      addTranscriptEntry({
        speaker: 'system',
        text: 'Connected to voice agent. Ready for input.',
        timestamp: new Date(),
      });

    } catch (error) {
      log('Error starting voice agent:');
      log(error);
      debug.add('voice_agent_start_error', error);
      setVoiceAgentConnected(false);
      addTranscriptEntry({
        speaker: 'system',
        text: `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  }, [
    selectedTemplate,
    addInformationText,
    setInformationComplete,
    setCurrentView,
    setVoiceAgentConnected,
    addTranscriptEntry,
  ]);

  const stopAgent = useCallback(async () => {
    try {
      log('Stopping voice agent...');
      debug.add('voice_agent_stop_requested', { timestamp: new Date() });

      // Properly disconnect session
      if (sessionRef.current) {
        await sessionRef.current.disconnect();
        log('Session disconnected');
      }

      // Clear refs
      sessionRef.current = null;
      agentRef.current = null;

      setVoiceAgentConnected(false);

      addTranscriptEntry({
        speaker: 'system',
        text: 'Voice agent stopped',
        timestamp: new Date(),
      });

      log('Voice agent stopped');
    } catch (error) {
      log('Error stopping voice agent:');
      log(error);
      debug.add('voice_agent_stop_error', error);
    }
  }, [setVoiceAgentConnected, addTranscriptEntry]);

  return {
    startAgent,
    stopAgent,
    connected: voiceAgentConnected,
  };
}
