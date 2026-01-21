interface InsightsEvent {
  eventId: string;
  type: string;
  timestamp: number;
  payload?: any;
  duration_ms?: number;
}

interface SessionInspection {
  session_id: string;
  event_count: number;
  event_types: Record<string, number>;
  traces: string[];
  time_range: { start: number; end: number };
  duration_ms: number;
  sample_events: InsightsEvent[];
}

interface SessionInspectionViewProps {
  session: SessionInspection;
}

export function SessionInspectionView({ session }: SessionInspectionViewProps) {
  if (!session) {
    return <div style={{ color: '#666', padding: '10px' }}>No session data available</div>;
  }

  // Sort event types by count (descending)
  const sortedEventTypes = Object.entries(session.event_types).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedEventTypes.length > 0 ? sortedEventTypes[0][1] : 1;

  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px',
      borderRadius: '4px',
      border: '1px solid #ddd'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #0070f3' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
          Session ID: <span style={{ fontFamily: 'monospace', color: '#0070f3' }}>{session.session_id}</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#666' }}>
          <div><strong>Events:</strong> {session.event_count}</div>
          <div><strong>Duration:</strong> {session.duration_ms.toFixed(2)}ms</div>
          <div><strong>Traces:</strong> {session.traces.length}</div>
        </div>
      </div>

      {/* Time Range */}
      <div style={{
        marginBottom: '15px',
        padding: '10px',
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Time Range:</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <div><strong>Start:</strong> {new Date(session.time_range.start).toLocaleString()}</div>
          <div><strong>End:</strong> {new Date(session.time_range.end).toLocaleString()}</div>
        </div>
      </div>

      {/* Event Type Breakdown */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          Event Type Breakdown:
        </div>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          {sortedEventTypes.map(([type, count]) => {
            const percentage = ((count / session.event_count) * 100).toFixed(1);
            const barWidth = (count / maxCount) * 100;

            return (
              <div key={type} style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{type}</span>
                  <span style={{ color: '#666' }}>
                    {count} ({percentage}%)
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  background: '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    background: '#0070f3',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traces List */}
      {session.traces.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            Traces ({session.traces.length}):
          </div>
          <div style={{
            background: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            maxHeight: '150px',
            overflow: 'auto'
          }}>
            {session.traces.map(trace => (
              <div key={trace} style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '4px 0',
                borderBottom: '1px solid #f0f0f0',
                color: '#666'
              }}>
                {trace}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample Events */}
      {session.sample_events.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            Sample Events ({session.sample_events.length}):
          </div>
          <div style={{
            background: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            {session.sample_events.map(event => (
              <div key={event.eventId} style={{
                padding: '8px',
                marginBottom: '8px',
                background: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px' }}>
                    {event.type}
                  </span>
                  {event.duration_ms !== undefined && (
                    <span style={{ fontSize: '11px', color: '#666' }}>
                      {event.duration_ms}ms
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace' }}>
                  {event.eventId}
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
