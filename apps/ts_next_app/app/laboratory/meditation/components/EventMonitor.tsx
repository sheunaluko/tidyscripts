import { useState } from 'react';

function EventCard({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      'user_input': '#4caf50',
      'llm_invocation': '#2196f3',
      'execution': '#ff9800',
      'chain_start': '#9c27b0',
      'chain_event': '#e91e63',
      'bulk_test': '#607d8b',
      'custom_event': '#00bcd4'
    };
    return colors[type] || '#666';
  };

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        padding: '12px',
        marginBottom: '8px',
        background: 'white',
        border: `2px solid ${getEventColor(event.type)}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
          <span
            style={{
              padding: '4px 12px',
              background: getEventColor(event.type),
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              minWidth: '120px',
              textAlign: 'center'
            }}
          >
            {event.type}
          </span>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#666'
          }}>
            {event.eventId}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#999' }}>
          {event.timestamp?.toLocaleTimeString()}
        </span>
      </div>
      {expanded && (
        <pre style={{
          marginTop: '12px',
          padding: '10px',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '11px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function EventMonitor({ events }: { events: any[] }) {
  const [filter, setFilter] = useState('');

  const filteredEvents = events.filter(event =>
    !filter || event.type.includes(filter) || event.eventId.includes(filter)
  );

  return (
    <div>
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: '#f9f9f9',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Filter:</label>
          <input
            type="text"
            placeholder="Filter by type or event ID..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '8px',
              flex: 1,
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              style={{
                padding: '8px 16px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Showing {filteredEvents.length} of {events.length} events
          {filter && ` (filtered by "${filter}")`}
        </div>
      </div>

      <div style={{
        maxHeight: '600px',
        overflowY: 'auto',
        padding: '10px',
        background: '#fafafa',
        borderRadius: '8px'
      }}>
        {filteredEvents.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999'
          }}>
            {events.length === 0 ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🧘</div>
                <div>No events yet. Generate some events to get started!</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                <div>No events match the filter &quot;{filter}&quot;</div>
              </>
            )}
          </div>
        ) : (
          filteredEvents.map((event, i) => (
            <EventCard key={i} event={event} />
          ))
        )}
      </div>

      {events.length > 0 && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#e3f2fd',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#1976d2'
        }}>
          💡 Tip: Click on any event to expand and see full details
        </div>
      )}
    </div>
  );
}
