import { MethodExecutor } from './MethodExecutor';
import { EventTypeStatsView } from './visualizations/EventTypeStatsView';
import { PayloadSchemaView } from './visualizations/PayloadSchemaView';
import { TraceInspectionView } from './visualizations/TraceInspectionView';
import { SessionInspectionView } from './visualizations/SessionInspectionView';
import { DatabaseStatsView } from './visualizations/DatabaseStatsView';

interface ReflectionsExplorerProps {
  client: any; // ReflectionsClient instance
  sessionId: string; // Current session ID for defaults
}

export function ReflectionsExplorer({ client, sessionId }: ReflectionsExplorerProps) {
  if (!client) {
    return (
      <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
        <strong>Warning:</strong> ReflectionsClient not initialized yet. Please wait...
      </div>
    );
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Reflections Explorer</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Interactive testing for all 19 ReflectionsClient methods
        </p>
      </div>

      {/* Core Query Methods Section */}
      <section style={{ marginBottom: '30px' }}>
        <h3 style={{
          margin: '0 0 15px 0',
          fontSize: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #0070f3'
        }}>
          Core Query Methods (5)
        </h3>

        {/* 1. queryEvents */}
        <MethodExecutor
          methodName="queryEvents"
          description="Query events with flexible filtering"
          parameters={[
            {
              name: 'filter',
              type: 'json',
              description: 'QueryFilter object (session_id, event_types, trace_id, limit, etc.)',
              optional: true,
              defaultValue: {}
            }
          ]}
          onExecute={async (params) => {
            const result = await client.queryEvents(params.filter || {});
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 2. getEventsBySession */}
        <MethodExecutor
          methodName="getEventsBySession"
          description="Get all events for a specific session"
          parameters={[
            {
              name: 'session_id',
              type: 'string',
              description: 'Session ID to query',
              defaultValue: sessionId
            },
            {
              name: 'limit',
              type: 'number',
              description: 'Maximum number of events',
              optional: true,
              defaultValue: 1000
            }
          ]}
          onExecute={async (params) => {
            const result = await client.getEventsBySession(params.session_id, params.limit);
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 3. getEventsByTrace */}
        <MethodExecutor
          methodName="getEventsByTrace"
          description="Get all events in a trace chain"
          parameters={[
            {
              name: 'trace_id',
              type: 'string',
              description: 'Trace ID to query'
            }
          ]}
          onExecute={async (params) => {
            const result = await client.getEventsByTrace(params.trace_id);
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 4. getEventsByType */}
        <MethodExecutor
          methodName="getEventsByType"
          description="Get all events of a specific type"
          parameters={[
            {
              name: 'event_type',
              type: 'string',
              description: 'Event type to filter by'
            },
            {
              name: 'limit',
              type: 'number',
              description: 'Maximum number of events',
              optional: true,
              defaultValue: 1000
            }
          ]}
          onExecute={async (params) => {
            const result = await client.getEventsByType(params.event_type, params.limit);
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 5. getEventById */}
        <MethodExecutor
          methodName="getEventById"
          description="Get a single event by ID"
          parameters={[
            {
              name: 'event_id',
              type: 'string',
              description: 'Event ID to retrieve'
            }
          ]}
          onExecute={async (params) => {
            const result = await client.getEventById(params.event_id);
            return result;
          }}
          cacheIndicator={true}
        />
      </section>

      {/* Exploration & Discovery Methods Section */}
      <section style={{ marginBottom: '30px' }}>
        <h3 style={{
          margin: '0 0 15px 0',
          fontSize: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #4caf50'
        }}>
          Exploration & Discovery Methods (11)
        </h3>

        {/* 6. getEventTypes */}
        <MethodExecutor
          methodName="getEventTypes"
          description="Get list of all event types in database"
          parameters={[]}
          onExecute={async () => {
            const result = await client.getEventTypes();
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 7. getEventTypeStats */}
        <MethodExecutor
          methodName="getEventTypeStats"
          description="Get comprehensive statistics for all event types"
          parameters={[]}
          onExecute={async () => {
            const result = await client.getEventTypeStats();
            return result;
          }}
          resultRenderer={(result) => <EventTypeStatsView stats={result} />}
          cacheIndicator={true}
        />

        {/* 8. inspectPayloadSchema */}
        <MethodExecutor
          methodName="inspectPayloadSchema"
          description="Analyze payload schema for an event type"
          parameters={[
            {
              name: 'event_type',
              type: 'string',
              description: 'Event type to inspect'
            },
            {
              name: 'sample_size',
              type: 'number',
              description: 'Number of events to sample',
              optional: true,
              defaultValue: 100
            }
          ]}
          onExecute={async (params) => {
            const result = await client.inspectPayloadSchema(params.event_type, params.sample_size);
            return result;
          }}
          resultRenderer={(result) => <PayloadSchemaView schema={result} />}
          cacheIndicator={true}
        />

        {/* 9. getSessions */}
        <MethodExecutor
          methodName="getSessions"
          description="Get list of session IDs"
          parameters={[
            {
              name: 'limit',
              type: 'number',
              description: 'Maximum number of sessions',
              optional: true,
              defaultValue: 100
            }
          ]}
          onExecute={async (params) => {
            const result = await client.getSessions(params.limit);
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 10. getTraces */}
        <MethodExecutor
          methodName="getTraces"
          description="Get list of trace IDs"
          parameters={[
            {
              name: 'limit',
              type: 'number',
              description: 'Maximum number of traces',
              optional: true,
              defaultValue: 100
            }
          ]}
          onExecute={async (params) => {
            const result = await client.getTraces(params.limit);
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 11. inspectSession */}
        <MethodExecutor
          methodName="inspectSession"
          description="Get detailed session analysis and breakdown"
          parameters={[
            {
              name: 'session_id',
              type: 'string',
              description: 'Session ID to inspect',
              defaultValue: sessionId
            }
          ]}
          onExecute={async (params) => {
            const result = await client.inspectSession(params.session_id);
            return result;
          }}
          resultRenderer={(result) => <SessionInspectionView session={result} />}
          cacheIndicator={true}
        />

        {/* 12. inspectTrace */}
        <MethodExecutor
          methodName="inspectTrace"
          description="Get detailed trace analysis with event chain structure"
          parameters={[
            {
              name: 'trace_id',
              type: 'string',
              description: 'Trace ID to inspect'
            }
          ]}
          onExecute={async (params) => {
            const result = await client.inspectTrace(params.trace_id);
            return result;
          }}
          resultRenderer={(result) => <TraceInspectionView trace={result} />}
          cacheIndicator={true}
        />

        {/* 13. getAllTags */}
        <MethodExecutor
          methodName="getAllTags"
          description="Get list of all tags used across events"
          parameters={[]}
          onExecute={async () => {
            const result = await client.getAllTags();
            return result;
          }}
          cacheIndicator={true}
        />

        {/* 14. getTimeRange */}
        <MethodExecutor
          methodName="getTimeRange"
          description="Get time range of events in database"
          parameters={[]}
          onExecute={async () => {
            const result = await client.getTimeRange();
            return result;
          }}
          resultRenderer={(result) => (
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>First Event:</strong> {new Date(result.first_event_timestamp).toLocaleString()}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Last Event:</strong> {new Date(result.last_event_timestamp).toLocaleString()}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Duration:</strong> {result.duration_hours.toFixed(2)} hours
              </div>
              <div>
                <strong>Total Events:</strong> {result.total_events}
              </div>
            </div>
          )}
          cacheIndicator={true}
        />

        {/* 15. getDatabaseStats */}
        <MethodExecutor
          methodName="getDatabaseStats"
          description="Get comprehensive database statistics"
          parameters={[]}
          onExecute={async () => {
            const result = await client.getDatabaseStats();
            return result;
          }}
          resultRenderer={(result) => <DatabaseStatsView stats={result} />}
          cacheIndicator={true}
        />

        {/* 16. sampleEvents */}
        <MethodExecutor
          methodName="sampleEvents"
          description="Get random sample of events (optionally filtered by type)"
          parameters={[
            {
              name: 'event_type',
              type: 'string',
              description: 'Event type to sample from (leave empty for all types)',
              optional: true
            },
            {
              name: 'limit',
              type: 'number',
              description: 'Number of samples',
              optional: true,
              defaultValue: 10
            }
          ]}
          onExecute={async (params) => {
            const result = await client.sampleEvents(params.event_type, params.limit);
            return result;
          }}
          cacheIndicator={true}
        />
      </section>

      {/* Cache Management Methods Section */}
      <section>
        <h3 style={{
          margin: '0 0 15px 0',
          fontSize: '16px',
          paddingBottom: '8px',
          borderBottom: '2px solid #ff9800'
        }}>
          Cache Management (3)
        </h3>

        {/* 17. getCacheStats */}
        <MethodExecutor
          methodName="getCacheStats"
          description="Get cache performance statistics"
          parameters={[]}
          onExecute={async () => {
            const result = client.getCacheStats();
            return result;
          }}
          resultRenderer={(result) => (
            <div style={{
              background: '#f5f5f5',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Enabled:</strong> {result.enabled ? 'Yes' : 'No'}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Hits:</strong> {result.hits}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Misses:</strong> {result.misses}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Total Queries:</strong> {result.queries}
              </div>
              <div>
                <strong>Hit Rate:</strong> {result.queries > 0 ? ((result.hits / result.queries) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          )}
        />

        {/* 18. clearCache */}
        <MethodExecutor
          methodName="clearCache"
          description="Clear all cached queries"
          parameters={[]}
          onExecute={async () => {
            await client.clearCache();
            return { success: true, message: 'Cache cleared successfully' };
          }}
        />

        {/* 19. invalidateCache */}
        <MethodExecutor
          methodName="invalidateCache"
          description="Invalidate cache entries matching a pattern"
          parameters={[
            {
              name: 'pattern',
              type: 'string',
              description: 'Pattern to match cache keys (leave empty to invalidate all)',
              optional: true
            }
          ]}
          onExecute={async (params) => {
            await client.invalidateCache(params.pattern);
            return {
              success: true,
              message: params.pattern
                ? `Cache entries matching '${params.pattern}' invalidated`
                : 'All cache entries invalidated'
            };
          }}
        />
      </section>
    </div>
  );
}
