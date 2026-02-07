/**
 * useRaiAgent Hook - RAI Agent management
 *
 * Creates and manages the RAI agent instance, which uses the Cortex class
 * with medical note-specific tools.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../store/useRaiStore';
import { useSelectedTemplate } from './useTemplateLookups';
import * as raiAgent from '../lib/rai_agent_web';
import type { Cortex } from 'tidyscripts_common/src/apis/cortex/cortex';

const log = tsw.common.logger.get_logger({ id: 'rai_agent_hook' });
const debug = tsw.common.util.debug;

interface UseRaiAgentOptions {
  model: string;
  insightsClient?: any;
  onComplete?: () => void;
}

interface UseRaiAgentReturn {
  agent: Cortex | null;
  isLoading: boolean;
  error: Error | null;
  reinitialize: () => Promise<void>;
}

export function useRaiAgent(options: UseRaiAgentOptions): UseRaiAgentReturn {
  const { model, insightsClient, onComplete } = options;

  const [agent, setAgent] = useState<Cortex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get store values and actions
  const selectedTemplate = useSelectedTemplate();
  const {
    addInformationText,
    updateInformationText,
    deleteInformationEntry,
    collectedInformation,
    setInformationComplete,
    setCurrentView,
    addToolCallThought,
    addTranscriptEntry,
  } = useRaiStore();

  // Keep refs to avoid stale closures
  const collectedInformationRef = useRef(collectedInformation);
  useEffect(() => {
    collectedInformationRef.current = collectedInformation;
  }, [collectedInformation]);

  // Create store interface for agent
  const storeInterface = useRef<raiAgent.RaiStoreInterface>({
    addInformationText,
    updateInformationText,
    deleteInformationEntry,
    get collectedInformation() {
      return collectedInformationRef.current;
    },
    setInformationComplete,
    setCurrentView,
    addToolCallThought,
    addTranscriptEntry,
  });

  // Update store interface when store functions change
  useEffect(() => {
    storeInterface.current = {
      addInformationText,
      updateInformationText,
      deleteInformationEntry,
      get collectedInformation() {
        return collectedInformationRef.current;
      },
      setInformationComplete,
      setCurrentView,
      addToolCallThought,
      addTranscriptEntry,
    };
  }, [
    addInformationText,
    updateInformationText,
    deleteInformationEntry,
    setInformationComplete,
    setCurrentView,
    addToolCallThought,
    addTranscriptEntry,
  ]);

  // Initialize agent
  const initAgent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      log(`Initializing RAI agent with model: ${model}`);
      debug.add('rai_agent_init_start', { model, templateId: selectedTemplate?.id });

      const newAgent = raiAgent.get_agent(
        model,
        selectedTemplate,
        storeInterface.current,
        insightsClient,
        onComplete
      );

      setAgent(newAgent);
      setIsLoading(false);

      log('RAI agent initialized successfully');
      debug.add('rai_agent_init_success', { model });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize RAI agent');
      log(`RAI agent initialization failed: ${error.message}`);
      debug.add('rai_agent_init_error', { error: error.message });

      setError(error);
      setIsLoading(false);
    }
  }, [model, selectedTemplate, insightsClient, onComplete]);

  // Initialize on mount and when dependencies change
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!cancelled) {
        await initAgent();
      }
    };

    init();

    return () => {
      cancelled = true;
      // Cleanup agent if needed
      if (agent) {
        log('Cleaning up RAI agent');
        // Future: Add agent cleanup if needed
      }
    };
  }, [model, selectedTemplate?.id, insightsClient]); // Re-init when model or template changes

  // Reinitialize function for manual refresh
  const reinitialize = useCallback(async () => {
    log('Manually reinitializing RAI agent');
    await initAgent();
  }, [initAgent]);

  return { agent, isLoading, error, reinitialize };
}

export default useRaiAgent;
