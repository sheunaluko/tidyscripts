interface InsightsEvent {
  eventId: string;
  type: string;
  timestamp: number;
  parentEventId?: string;
  payload?: any;
  duration_ms?: number;
  tags?: string[];
}

interface TraceInspection {
  trace_id: string;
  event_count: number;
  events: InsightsEvent[];
  has_root: boolean;
  root_event?: InsightsEvent;
  chain_structure: {
    depth: number;
    branches: number;
    leaf_count: number;
  };
  time_range: { start: number; end: number };
  duration_ms: number;
}

interface TraceInspectionViewProps {
  trace: TraceInspection;
}

export function TraceInspectionView({ trace }: TraceInspectionViewProps) {
  if (!trace) {
    return <div style={{ color: '#666', padding: '10px' }}>No trace data available</div>;
  }

  // Build parent-child map
  const childrenMap = new Map<string, InsightsEvent[]>();
  trace.events.forEach(event => {
    if (event.parentEventId) {
      if (!childrenMap.has(event.parentEventId)) {
        childrenMap.set(event.parentEventId, []);
      }
      childrenMap.get(event.parentEventId)!.push(event);
    }
  });

  // Render event tree recursively
  const renderEventNode = (event: InsightsEvent, depth: number = 0): React.ReactNode => {
    const children = childrenMap.get(event.eventId) || [];
    const hasChildren = children.length > 0;

    return (
      <div key={event.eventId} style={{ marginLeft: depth > 0 ? '30px' : 0 }}>
        <div style={{
          padding: '10px',
          background: depth === 0 ? '#e3f2fd' : '#f5f5f5',
          border: `2px solid ${depth === 0 ? '#0070f3' : '#ddd'}`,
          borderRadius: '6px',
          marginBottom: '8px',
          position: 'relative'
        }}>
          {/* Connector line */}
          {depth > 0 && (
            <div style={{
              position: 'absolute',
              left: '-30px',
              top: '50%',
              width: '30px',
              height: '2px',
              background: '#ccc'
            }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                {event.type}
                {hasChildren && (
                  <span style={{ marginLeft: '8px', color: '#666', fontSize: '11px' }}>
                    ({children.length} child{children.length > 1 ? 'ren' : ''})
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                ID: {event.eventId}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {new Date(event.timestamp).toLocaleString()}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              {event.duration_ms !== undefined && (
                <div style={{
                  fontSize: '12px',
                  color: event.duration_ms > 1000 ? '#f44336' : '#4caf50',
                  fontWeight: 'bold'
                }}>
                  {event.duration_ms}ms
                </div>
              )}
              {event.tags && event.tags.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  {event.tags.map(tag => (
                    <span key={tag} style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      background: tag === 'error' ? '#ffebee' : '#e8f5e9',
                      color: tag === 'error' ? '#c62828' : '#2e7d32',
                      borderRadius: '3px',
                      fontSize: '10px',
                      marginLeft: '4px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && (
          <div>
            {children.map(child => renderEventNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

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
          Trace ID: <span style={{ fontFamily: 'monospace', color: '#0070f3' }}>{trace.trace_id}</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#666' }}>
          <div><strong>Events:</strong> {trace.event_count}</div>
          <div><strong>Duration:</strong> {trace.duration_ms.toFixed(2)}ms</div>
          <div><strong>Root:</strong> {trace.has_root ? 'Yes' : 'No'}</div>
        </div>
      </div>

      {/* Chain Structure Metrics */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
        <div style={{
          flex: 1,
          padding: '10px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Chain Depth</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0070f3' }}>
            {trace.chain_structure.depth}
          </div>
        </div>
        <div style={{
          flex: 1,
          padding: '10px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Branches</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4caf50' }}>
            {trace.chain_structure.branches}
          </div>
        </div>
        <div style={{
          flex: 1,
          padding: '10px',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Leaf Events</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800' }}>
            {trace.chain_structure.leaf_count}
          </div>
        </div>
      </div>

      {/* Event Chain Tree */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          Event Chain Structure:
        </div>
        <div style={{
          maxHeight: '600px',
          overflow: 'auto',
          background: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          {trace.root_event ? (
            renderEventNode(trace.root_event, 0)
          ) : (
            <div style={{ color: '#666' }}>
              No root event found. Displaying all events:
              {trace.events.filter(e => !e.parentEventId).map(event => renderEventNode(event, 0))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
