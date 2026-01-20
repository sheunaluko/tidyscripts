export function ClientStateView({ state, onFlush }: {
  state: {
    sessionId: string;
    batchSize: number;
    chainDepth: number;
    enabled: boolean;
  };
  onFlush: () => void;
}) {
  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', gap: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Session ID</div>
          <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{state.sessionId || 'Loading...'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Events in Batch</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: state.batchSize > 0 ? '#0070f3' : '#999' }}>
            {state.batchSize}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Chain Depth</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: state.chainDepth > 0 ? '#ff6b6b' : '#999' }}>
            {state.chainDepth}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Status</div>
          <div style={{ fontSize: '14px', color: state.enabled ? '#4caf50' : '#f44336' }}>
            {state.enabled ? '● Active' : '○ Disabled'}
          </div>
        </div>
      </div>
      <div>
        <button
          onClick={onFlush}
          style={{
            padding: '8px 16px',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Flush Batch Now
        </button>
      </div>
    </div>
  );
}
