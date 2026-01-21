'use client';

import { useState, useEffect, useRef } from 'react';
import { EventGenerator } from './components/EventGenerator';
import { EventMonitor } from './components/EventMonitor';
import { DatabaseQuery } from './components/DatabaseQuery';
import { ValidationTests } from './components/ValidationTests';
import { ClientStateView } from './components/ClientStateView';
import { ReflectionsStateView } from './components/ReflectionsStateView';
import { ReflectionsExplorer } from './components/ReflectionsExplorer';
import { DemoRunner } from './components/DemoRunner';
import { LogExporter } from './components/LogExporter';
import { DatabaseTestSuite } from './components/DatabaseTestSuite';
import { ReflectionsTestSuite } from './components/ReflectionsTestSuite';
import { logCollector } from './lib/logCollector';
import { setupConsoleInterceptor } from './lib/consoleInterceptor';
import { setupFetchInterceptor } from './lib/fetchInterceptor';

export default function MeditationPage() {
  const insightsClient = useRef<any>(null);
  const reflectionsClient = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'generator' | 'monitor' | 'database' | 'tests' | 'reflections'>('generator');
  const [clientState, setClientState] = useState({
    sessionId: '',
    batchSize: 0,
    chainDepth: 0,
    enabled: true
  });
  const [reflectionsState, setReflectionsState] = useState({
    endpoint: '',
    cacheEnabled: false,
    cacheTtl: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0
  });

  useEffect(() => {
    // Install interceptors BEFORE InsightsClient initialization
    setupConsoleInterceptor();
    setupFetchInterceptor();

    // Dynamic import to avoid SSR issues
    const initInsights = async () => {
      const tsw = await import('tidyscripts_web');
      const { insights, reflections } = tsw.common;

      // Initialize InsightsClient
      insightsClient.current = insights.createClient({
        app_name: 'meditation',
        app_version: '0.1.0',
        user_id: 'test_user',
        session_id: insights.generateSessionId(),
        batch_size: 10,
        batch_interval_ms: 5000,
      });

      // Initialize ReflectionsClient
      reflectionsClient.current = reflections.createClient({
        enable_cache: true,
        cache_ttl_ms: 60000,
        verbose: true,
        silent_failure: false
      });

      reflections.setDefaultClient(reflectionsClient.current);

      // Expose to window for debugging
      if (typeof window !== 'undefined') {
        (window as any).meditationInsights = insightsClient.current;
        (window as any).meditationReflections = reflectionsClient.current;
      }

      setClientState({
        sessionId: insightsClient.current.getSessionId(),
        batchSize: 0,
        chainDepth: insightsClient.current.getChainDepth(),
        enabled: true
      });

      setReflectionsState({
        endpoint: reflectionsClient.current.config?.endpoint || '/api/insights/query',
        cacheEnabled: reflectionsClient.current.config?.enable_cache || false,
        cacheTtl: reflectionsClient.current.config?.cache_ttl_ms || 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalQueries: 0
      });

      console.log('[Meditation] InsightsClient initialized:', {
        sessionId: insightsClient.current.getSessionId(),
        config: insightsClient.current.config
      });

      console.log('[Meditation] ReflectionsClient initialized:', {
        config: reflectionsClient.current.config
      });

      logCollector.log('INFO', `InsightsClient initialized - Session: ${insightsClient.current.getSessionId()}`);
      logCollector.log('INFO', 'ReflectionsClient initialized with cache enabled');
    };

    initInsights();

    // Cleanup on unmount
    return () => {
      if (insightsClient.current) {
        insightsClient.current.shutdown();
      }
    };
  }, []);

  // Poll client state
  useEffect(() => {
    const interval = setInterval(() => {
      if (insightsClient.current) {
        const newState = {
          ...clientState,
          batchSize: insightsClient.current.eventBatch?.length || 0,
          chainDepth: insightsClient.current.getChainDepth() || 0
        };
        setClientState(newState);
        logCollector.updateClientState(newState);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Poll ReflectionsClient state
  useEffect(() => {
    const interval = setInterval(() => {
      if (reflectionsClient.current) {
        const stats = reflectionsClient.current.getCacheStats?.() || {
          enabled: false,
          hits: 0,
          misses: 0,
          queries: 0
        };

        setReflectionsState(prev => ({
          ...prev,
          cacheHits: stats.hits || 0,
          cacheMisses: stats.misses || 0,
          totalQueries: stats.queries || 0
        }));
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleEventCreated = (event: any) => {
    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events

    // Log the event
    logCollector.addEvent(event);
    logCollector.log('EVENT', `Created ${event.type} event: ${event.eventId}`);

    // Update client state
    setClientState(prev => ({
      ...prev,
      batchSize: insightsClient.current?.eventBatch?.length || 0,
      chainDepth: insightsClient.current?.getChainDepth() || 0
    }));
  };

  const handleFlushBatch = async () => {
    if (insightsClient.current) {
      await insightsClient.current.flushBatch();
      console.log('[Meditation] Batch flushed manually');
      logCollector.log('ACTION', 'Manual batch flush triggered');
    }
  };

  const handleClearCache = async () => {
    if (reflectionsClient.current) {
      await reflectionsClient.current.clearCache();
      console.log('[Meditation] ReflectionsClient cache cleared');
      logCollector.log('ACTION', 'ReflectionsClient cache cleared');
    }
  };

  const handleInvalidatePattern = async (pattern: string) => {
    if (reflectionsClient.current) {
      await reflectionsClient.current.invalidateCache(pattern);
      console.log(`[Meditation] Cache invalidated for pattern: ${pattern}`);
      logCollector.log('ACTION', `Cache invalidated: ${pattern}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>🧘 Meditation - InsightsClient Observer</h1>
        <p style={{ color: '#666', margin: '5px 0 0 0' }}>Testing and observability dashboard for InsightsClient</p>
      </header>

      <ClientStateView state={clientState} onFlush={handleFlushBatch} />

      <ReflectionsStateView
        state={reflectionsState}
        onClearCache={handleClearCache}
        onInvalidatePattern={handleInvalidatePattern}
      />

      <DatabaseTestSuite
        client={insightsClient.current}
        sessionId={clientState.sessionId}
      />

      <ReflectionsTestSuite
        client={reflectionsClient.current}
        sessionId={clientState.sessionId}
      />

      <DemoRunner
        client={insightsClient.current}
        onEventCreated={handleEventCreated}
        onDemoComplete={() => {
          console.log('[Meditation] Demo workflow completed');
          setActiveTab('monitor');
        }}
      />

      <nav style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '10px'
      }}>
        <button
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'generator' ? '3px solid #0070f3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'generator' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('generator')}
        >
          Event Generator
        </button>
        <button
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'monitor' ? '3px solid #0070f3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'monitor' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('monitor')}
        >
          Event Monitor ({events.length})
        </button>
        <button
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'database' ? '3px solid #0070f3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'database' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('database')}
        >
          Database Query
        </button>
        <button
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'tests' ? '3px solid #0070f3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'tests' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('tests')}
        >
          Validation Tests
        </button>
        <button
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'reflections' ? '3px solid #0070f3' : '3px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'reflections' ? 'bold' : 'normal'
          }}
          onClick={() => setActiveTab('reflections')}
        >
          Reflections Explorer
        </button>
      </nav>

      <main>
        {activeTab === 'generator' && (
          <EventGenerator
            client={insightsClient.current}
            onEventCreated={handleEventCreated}
          />
        )}
        {activeTab === 'monitor' && (
          <EventMonitor events={events} />
        )}
        {activeTab === 'database' && (
          <DatabaseQuery sessionId={clientState.sessionId} />
        )}
        {activeTab === 'tests' && (
          <ValidationTests client={insightsClient.current} />
        )}
        {activeTab === 'reflections' && (
          <ReflectionsExplorer
            client={reflectionsClient.current}
            sessionId={clientState.sessionId}
          />
        )}
      </main>

      <LogExporter />
    </div>
  );
}
