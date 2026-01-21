interface PayloadFieldInfo {
  field_name: string;
  occurrences: number;
  sample_values: any[];
  value_types: string[];
}

interface PayloadSchemaInspection {
  event_type: string;
  total_events: number;
  fields: PayloadFieldInfo[];
  common_fields: string[];
  optional_fields: string[];
}

interface PayloadSchemaViewProps {
  schema: PayloadSchemaInspection;
}

export function PayloadSchemaView({ schema }: PayloadSchemaViewProps) {
  if (!schema) {
    return <div style={{ color: '#666', padding: '10px' }}>No schema data available</div>;
  }

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
          Event Type: <span style={{ fontFamily: 'monospace', color: '#0070f3' }}>{schema.event_type}</span>
        </div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          Total Events Analyzed: <strong>{schema.total_events}</strong>
        </div>
      </div>

      {/* Common Fields */}
      {schema.common_fields.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#2e7d32' }}>
            Common Fields ({'>'}90% presence):
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {schema.common_fields.map(field => (
              <span key={field} style={{
                padding: '4px 10px',
                background: '#e8f5e9',
                border: '1px solid #4caf50',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#2e7d32'
              }}>
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Optional Fields */}
      {schema.optional_fields.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#ff6b6b' }}>
            Optional Fields ({'<'}90% presence):
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {schema.optional_fields.map(field => (
              <span key={field} style={{
                padding: '4px 10px',
                background: '#fff3e0',
                border: '1px solid #ff9800',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#e65100'
              }}>
                {field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Field Details Table */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          Field Details:
        </div>
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            background: 'white'
          }}>
            <thead>
              <tr style={{ background: '#0070f3', color: 'white' }}>
                <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>Field Name</th>
                <th style={{ padding: '8px', textAlign: 'right', position: 'sticky', top: 0, background: '#0070f3' }}>Occurrences</th>
                <th style={{ padding: '8px', textAlign: 'center', position: 'sticky', top: 0, background: '#0070f3' }}>%</th>
                <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>Types</th>
                <th style={{ padding: '8px', textAlign: 'left', position: 'sticky', top: 0, background: '#0070f3' }}>Sample Values</th>
              </tr>
            </thead>
            <tbody>
              {schema.fields.map((field, idx) => {
                const percentage = ((field.occurrences / schema.total_events) * 100).toFixed(1);
                return (
                  <tr key={field.field_name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {field.field_name}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0070f3' }}>
                      {field.occurrences}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
                      {percentage}%
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {field.value_types.map(type => (
                          <span key={type} style={{
                            padding: '2px 6px',
                            background: '#e3f2fd',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '8px', fontSize: '11px', maxWidth: '200px' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={JSON.stringify(field.sample_values)}>
                        {field.sample_values.slice(0, 3).map(v =>
                          typeof v === 'string' ? `"${v}"` : JSON.stringify(v)
                        ).join(', ')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
