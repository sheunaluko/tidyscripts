// useVoiceAgent Hook - Voice agent management

import { useCallback, useRef, useEffect } from 'react';
import { RealtimeSession } from '@openai/agents/realtime';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../store/useRaiStore';
import { createRealtimeAgent, getEphemeralKey, generateInstructions } from '../lib/voiceAgent';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

declare var window: any;

export function useVoiceAgent() {
  const {
    selectedTemplate,
    addInformationText,
    updateInformationText,
    deleteInformationEntry,
    collectedInformation,
    setInformationComplete,
    setCurrentView,
    voiceAgentConnected,
    setVoiceAgentConnected,
    addTranscriptEntry,
    addToolCallThought,
    settings,
  } = useRaiStore();

  const sessionRef = useRef<RealtimeSession | null>(null);
  const agentRef = useRef<any>(null);
  const processedItemIds = useRef<Set<string>>(new Set());

  // Expose WebRTC objects to global scope for debugging
  useEffect(() => {
    window.voiceAgentDebug = {
      session: sessionRef.current,
      agent: agentRef.current,
      get pc() {
        return (sessionRef.current as any)?.pc || null;
      },
      get dc() {
        return (sessionRef.current as any)?.dc || null;
      },
      get stream() {
        return (sessionRef.current as any)?.stream || null;
      },
      stopAgent,
      startAgent,
    };
  });

  // Note: Agent instructions are now static - no dynamic updates based on collectedInformation
  // The agent learns about items through conversation messages (tool responses and user messages)

  const startAgent = useCallback(async () => {
    try {
      log('Starting voice agent...');
      debug.add('voice_agent_start_requested', { template: selectedTemplate?.id });

      // Add immediate feedback
      addTranscriptEntry({
        speaker: 'system',
        text: 'Retrieving authentication token...',
        timestamp: new Date(),
      });

      // Get ephemeral key
      const apiKey = await getEphemeralKey();

      // Create agent with store bindings
      const agent = createRealtimeAgent(selectedTemplate, {
        addInformationText,
        updateInformationText,
        deleteInformationEntry,
        collectedInformation,
        setInformationComplete,
        setCurrentView,
        addToolCallThought,
        closeSession: async () => {
          // Close session without UI updates (navigating to note generator)
          if (sessionRef.current) {
            await sessionRef.current.close();
            log('Session closed via information_complete tool');
          }
          sessionRef.current = null;
          agentRef.current = null;
          setVoiceAgentConnected(false);
        },
      });
      agentRef.current = agent;

      // Create session with agent and configuration
      const sessionConfig = {
        model: 'gpt-realtime',
        config: {
          inputAudioFormat: 'pcm16',
          outputAudioFormat: 'pcm16',
          inputAudioTranscription: {
            model: 'whisper-1',
            prompt: '[silence] Only transcribe clear, actual speech. If there is background noise, silence, or unclear audio, return empty. Do not guess or generate text.',
          },
          turnDetection: {
            type: 'server_vad',
            threshold: settings.vadThreshold,
            prefixPaddingMs: 300,
            silenceDurationMs: settings.vadSilenceDurationMs,
          },
        },
      };

      // Debug: Log audio initialization parameters
      debug.add('voice_agent_audio_config', {
        vadThreshold: settings.vadThreshold,
        vadSilenceDurationMs: settings.vadSilenceDurationMs,
        whisperPrompt: sessionConfig.config.inputAudioTranscription.prompt,
        inputAudioFormat: sessionConfig.config.inputAudioFormat,
        outputAudioFormat: sessionConfig.config.outputAudioFormat,
        timestamp: new Date().toISOString(),
      });

      const session = new RealtimeSession(agent, sessionConfig);
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

      // Listen for transport events (includes session.updated confirmation)
      session.on('transport_event', (event: any) => {
        // Session update confirmation
        if (event.type === 'session.updated') {
          log('✅ Session update confirmed by server!');
          log(`New instructions length: ${event.session?.instructions?.length || 0} chars`);

          debug.add('session_updated_confirmed', {
            timestamp: new Date().toISOString(),
            instructionsLength: event.session?.instructions?.length || 0,
            hasInstructions: !!event.session?.instructions,
            fullEvent: event,
          });
        }

        // Error handling
        if (event.type === 'error') {
          log(`❌ Transport error: ${event.error?.message || 'Unknown error'}`);
          debug.add('transport_error', {
            timestamp: new Date().toISOString(),
            error: event.error,
          });
        }
      });

      // Listen to all transport events (raw Realtime API events)
      session.transport.on('*', (event: any) => {
        // Handle user text input (when text is sent directly)
        if (event.type === 'conversation.item.added') {
          const item = event.item;

          // Handle user text messages (not audio)
          if (item.role === 'user' && item.type === 'message') {
            const content = item.content?.[0];

            // Only handle input_text here (audio transcripts come later)
            if (content?.type === 'input_text' && content.text) {
              const itemKey = `user_text_${item.id}`;
              if (!processedItemIds.current.has(itemKey)) {
                processedItemIds.current.add(itemKey);
                addTranscriptEntry({
                  speaker: 'user',
                  text: content.text,
                  timestamp: new Date(),
                });
                log(`✅ User text: ${content.text}`);
              }
            }
          }
        }

        // Handle user audio transcription completion
        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = event.transcript;
          if (transcript && transcript.trim()) {
            const itemKey = `user_audio_${event.item_id}`;
            if (!processedItemIds.current.has(itemKey)) {
              processedItemIds.current.add(itemKey);
              addTranscriptEntry({
                speaker: 'user',
                text: transcript,
                timestamp: new Date(),
              });
              log(`✅ User audio transcript: ${transcript}`);
            }
          }
        }

        // Handle assistant audio transcription completion
        if (event.type === 'response.output_audio_transcript.done') {
          const transcript = event.transcript;
          if (transcript && transcript.trim()) {
            const itemKey = `assistant_audio_${event.item_id}_${event.content_index}`;
            if (!processedItemIds.current.has(itemKey)) {
              processedItemIds.current.add(itemKey);
              addTranscriptEntry({
                speaker: 'agent',
                text: transcript,
                timestamp: new Date(),
              });
              log(`✅ Assistant audio transcript: ${transcript}`);
            }
          }
        }

        // Handle function calls (from response.done)
        if (event.type === 'response.done') {
          debug.add('response_done', {
            timestamp: new Date().toISOString(),
            response: event.response,
          });

          // Check for function calls in output
          const outputs = event.response.output || [];
          outputs.forEach((item: any) => {
            if (item.type === 'function_call') {
              const itemKey = `function_${item.id}`;
              if (!processedItemIds.current.has(itemKey)) {
                processedItemIds.current.add(itemKey);
                const functionName = item.name;
                addTranscriptEntry({
                  speaker: 'system',
                  text: `Calling function: ${functionName}`,
                  timestamp: new Date(),
                });
                log(`✅ Function call: ${functionName}`);
              }
            }
          });
        }
      });

      setVoiceAgentConnected(true);
      addTranscriptEntry({
        speaker: 'system',
        text: 'Connected to voice agent. Ready for input.',
        timestamp: new Date(),
      });

	// Automatically send "start" message to trigger agent greeting
	const init_msg = "Initialize"  ; 
      try {
        session.transport.sendMessage(init_msg, {});
        log('Sent automatic start message to agent');
        addTranscriptEntry({
          speaker: 'user',
          text: init_msg,
          timestamp: new Date(),
        });
      } catch (sendError) {
        log('Error sending start message:');
        log(sendError);
      }

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
    updateInformationText,
    deleteInformationEntry,
    collectedInformation,
    setInformationComplete,
    setCurrentView,
    setVoiceAgentConnected,
    addTranscriptEntry,
    addToolCallThought,
    settings,
  ]);

  const stopAgent = useCallback(async () => {
    try {
      log('Stopping voice agent...');
      debug.add('voice_agent_stop_requested', { timestamp: new Date() });

      // Properly close the session
      if (sessionRef.current) {
        await sessionRef.current.close();
        log('Session closed');
      }

      // Clear refs
      sessionRef.current = null;
      agentRef.current = null;
      processedItemIds.current.clear();

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

      // Force cleanup even on error
      sessionRef.current = null;
      agentRef.current = null;
      processedItemIds.current.clear();
      setVoiceAgentConnected(false);
    }
  }, [setVoiceAgentConnected, addTranscriptEntry]);

  return {
    startAgent,
    stopAgent,
    connected: voiceAgentConnected,
  };
}
