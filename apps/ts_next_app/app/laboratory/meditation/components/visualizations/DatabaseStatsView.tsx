interface TimeRangeInfo {
  earliest: number;
  latest: number;
  span_ms: number;
  span_days: number;
  total_events: number;
}

interface DatabaseStats {
  total_events: number;
  event_types: string[];
  sessions: string[];
  traces: string[];
  apps: string[];
  users: string[];
  time_range: TimeRangeInfo;
}

interface DatabaseStatsViewProps {
  stats: DatabaseStats;
}

export function DatabaseStatsView({ stats }: DatabaseStatsViewProps) {
  if (!stats) {
    return <div style={{ color: '#666', padding: '10px' }}>No database statistics available</div>;
  }

  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px',
      borderRadius: '4px',
      border: '1px solid #ddd'
    }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #0070f3' }}>
        Database Overview
      </div>

      {/* Grid of Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '2px solid #0070f3',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Total Events</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0070f3' }}>
            {stats.total_events.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '2px solid #4caf50',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Event Types</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
            {stats.event_types.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '2px solid #ff9800',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Sessions</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
            {stats.sessions.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '2px solid #9c27b0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Traces</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9c27b0' }}>
            {stats.traces.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '2px solid #00bcd4',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Applications</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00bcd4' }}>
            {stats.apps.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '2px solid #f44336',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Users</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f44336' }}>
            {stats.users.length}
          </div>
        </div>
      </div>

      {/* Time Range */}
      <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        marginBottom: '15px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          Time Range:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
          <div>
            <div style={{ color: '#666', fontSize: '11px' }}>Earliest Event</div>
            <div style={{ fontWeight: 'bold' }}>{new Date(stats.time_range.earliest).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '11px' }}>Latest Event</div>
            <div style={{ fontWeight: 'bold' }}>{new Date(stats.time_range.latest).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '11px' }}>Span</div>
            <div style={{ fontWeight: 'bold' }}>{stats.time_range.span_days.toFixed(2)} days</div>
          </div>
          <div>
            <div style={{ color: '#666', fontSize: '11px' }}>Events in Range</div>
            <div style={{ fontWeight: 'bold' }}>{stats.time_range.total_events.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Apps List */}
      {stats.apps.length > 0 && (
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          marginBottom: '15px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            Applications ({stats.apps.length}):
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {stats.apps.map(app => (
              <span key={app} style={{
                padding: '6px 12px',
                background: '#e3f2fd',
                border: '1px solid #0070f3',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#0070f3'
              }}>
                {app}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Event Types List */}
      {stats.event_types.length > 0 && (
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '6px',
          border: '1px solid #ddd'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            Event Types ({stats.event_types.length}):
          </div>
          <div style={{
            maxHeight: '200px',
            overflow: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '6px'
          }}>
            {stats.event_types.map(type => (
              <div key={type} style={{
                padding: '6px 10px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#333'
              }}>
                {type}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
