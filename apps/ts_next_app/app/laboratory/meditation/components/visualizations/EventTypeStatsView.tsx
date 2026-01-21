interface EventTypeStats {
  event_type: string;
  count: number;
  first_seen: number;
  last_seen: number;
  has_duration: boolean;
  has_tags: boolean;
  sample_payload_keys: string[];
}

interface EventTypeStatsViewProps {
  stats: EventTypeStats[];
}

export function EventTypeStatsView({ stats }: EventTypeStatsViewProps) {
  if (!stats || stats.length === 0) {
    return <div style={{ color: '#666', padding: '10px' }}>No event type statistics available</div>;
  }

  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      maxHeight: '500px',
      overflow: 'auto'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        background: 'white'
      }}>
        <thead>
          <tr style={{ background: '#0070f3', color: 'white' }}>
            <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>Event Type</th>
            <th style={{ padding: '8px', textAlign: 'right', position: 'sticky', top: 0, background: '#0070f3' }}>Count</th>
            <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>First Seen</th>
            <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>Last Seen</th>
            <th style={{ padding: '8px', textAlign: 'center', position: 'sticky', top: 0, background: '#0070f3' }}>Duration?</th>
            <th style={{ padding: '8px', textAlign: 'center', position: 'sticky', top: 0, background: '#0070f3' }}>Tags?</th>
            <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>Payload Keys</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, idx) => (
            <tr key={stat.event_type} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {stat.event_type}
              </td>
              <td style={{ padding: '8px', textAlign: 'right', color: '#0070f3', fontWeight: 'bold' }}>
                {stat.count}
              </td>
              <td style={{ padding: '8px', fontSize: '11px', color: '#666' }}>
                {new Date(stat.first_seen).toLocaleString()}
              </td>
              <td style={{ padding: '8px', fontSize: '11px', color: '#666' }}>
                {new Date(stat.last_seen).toLocaleString()}
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  background: stat.has_duration ? '#e8f5e9' : '#ffebee',
                  color: stat.has_duration ? '#2e7d32' : '#c62828',
                  fontWeight: 'bold'
                }}>
                  {stat.has_duration ? '✓' : '✗'}
                </span>
              </td>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  background: stat.has_tags ? '#e8f5e9' : '#ffebee',
                  color: stat.has_tags ? '#2e7d32' : '#c62828',
                  fontWeight: 'bold'
                }}>
                  {stat.has_tags ? '✓' : '✗'}
                </span>
              </td>
              <td style={{ padding: '8px', fontSize: '11px' }}>
                <div style={{
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={stat.sample_payload_keys.join(', ')}>
                  {stat.sample_payload_keys.slice(0, 5).join(', ')}
                  {stat.sample_payload_keys.length > 5 && ` (+${stat.sample_payload_keys.length - 5} more)`}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
