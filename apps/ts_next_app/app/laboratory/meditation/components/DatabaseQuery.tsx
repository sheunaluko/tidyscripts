import { useState } from 'react';
import { queryInsightsEvents } from '../lib/databaseClient';
import { logCollector } from '../lib/logCollector';

export function DatabaseQuery({ sessionId }: { sessionId: string }) {
  const [filters, setFilters] = useState({
    event_type: '',
    session_id: '',
    trace_id: '',
    limit: 50
  });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const executeQuery = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await queryInsightsEvents(filters);
      setResults(data.events || []);
      console.log('[Meditation] Query results:', data);
      logCollector.addQueryResult(filters, data.events || []);
      logCollector.log('QUERY', `Database query returned ${data.events?.length || 0} results`);
    } catch (error: any) {
      console.error('Query failed:', error);
      setError(error.message);
      logCollector.log('ERROR', `Database query failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const useCurrentSession = () => {
    setFilters({ ...filters, session_id: sessionId });
  };

  const clearFilters = () => {
    setFilters({
      event_type: '',
      session_id: '',
      trace_id: '',
      limit: 50
    });
    setResults([]);
    setError('');
  };

  const inputStyle = {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    width: '100%'
  };

  return (
    <div>
      <div style={{
        padding: '20px',
        background: '#f9f9f9',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0 }}>Query Filters</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Event Type
            </label>
            <input
              type="text"
              placeholder="e.g., user_input, llm_invocation"
              value={filters.event_type}
              onChange={e => setFilters({ ...filters, event_type: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Session ID
            </label>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input
                type="text"
                placeholder="e.g., ses_abc123"
                value={filters.session_id}
                onChange={e => setFilters({ ...filters, session_id: e.target.value })}
                style={{ ...inputStyle, width: 'auto', flex: 1 }}
              />
              <button
                onClick={useCurrentSession}
                style={{
                  padding: '8px 12px',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}
              >
                Use Current
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Trace ID
            </label>
            <input
              type="text"
              placeholder="e.g., trc_xyz789"
              value={filters.trace_id}
              onChange={e => setFilters({ ...filters, trace_id: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Limit
            </label>
            <input
              type="number"
              value={filters.limit}
              onChange={e => setFilters({ ...filters, limit: parseInt(e.target.value) || 50 })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={executeQuery}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Querying...' : 'Execute Query'}
          </button>
          <button
            onClick={clearFilters}
            style={{
              padding: '10px 20px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          background: '#ffebee',
          color: '#c62828',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{
        padding: '15px',
        background: '#f9f9f9',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h3 style={{ margin: 0 }}>Results</h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {results.length} {results.length === 1 ? 'event' : 'events'} found
          </div>
        </div>

        {results.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
            <div>No results. Try executing a query or adjusting your filters.</div>
          </div>
        ) : (
          <div style={{
            maxHeight: '500px',
            overflowY: 'auto',
            background: 'white',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Event ID</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Timestamp</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Parent</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Trace</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((event: any, i: number) => (
                  <>
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        background: expandedRow === i ? '#f0f7ff' : 'transparent'
                      }}
                      onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    >
                      <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                        {event.event_id}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          background: '#e3f2fd',
                          borderRadius: '3px',
                          fontSize: '11px'
                        }}>
                          {event.event_type}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '11px' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                        {event.parent_event_id || '-'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
                        {event.trace_id || '-'}
                      </td>
                      <td style={{ padding: '10px', fontSize: '11px', color: '#0070f3' }}>
                        {expandedRow === i ? '▼ Hide' : '▶ Show'}
                      </td>
                    </tr>
                    {expandedRow === i && (
                      <tr>
                        <td colSpan={6} style={{ padding: '15px', background: '#f9f9f9' }}>
                          <pre style={{
                            margin: 0,
                            padding: '10px',
                            background: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                            overflow: 'auto',
                            maxHeight: '300px',
                            border: '1px solid #ddd'
                          }}>
                            {JSON.stringify(event, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
