'use client';

import { useState, useEffect } from 'react';
import * as cortex_agent from "../cortex_agent_web";

export function useCortexAgent(model: string) {
  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initAgent() {
      try {
        setIsLoading(true);
        setError(null);
        const newAgent = await cortex_agent.get_agent(model);

        if (!cancelled) {
          setAgent(newAgent);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to initialize agent'));
          setIsLoading(false);
        }
      }
    }

    initAgent();

    return () => {
      cancelled = true;
      // Future: Add agent cleanup if needed
      // if (agent) {
      //   agent.off('event', handle_event);
      // }
    };
  }, [model]);

  return { agent, isLoading, error };
}
