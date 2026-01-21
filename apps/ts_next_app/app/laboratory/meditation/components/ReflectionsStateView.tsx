export function ReflectionsStateView({ state, onClearCache, onInvalidatePattern }: {
  state: {
    endpoint: string;
    cacheEnabled: boolean;
    cacheTtl: number;
    cacheHits: number;
    cacheMisses: number;
    totalQueries: number;
  };
  onClearCache: () => void;
  onInvalidatePattern: (pattern: string) => void;
}) {
  const hitRate = state.totalQueries > 0
    ? ((state.cacheHits / state.totalQueries) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{
      background: '#e8f5e9',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #4caf50'
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#2e7d32'
      }}>
        ReflectionsClient Cache Metrics
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Cache Status</div>
            <div style={{ fontSize: '14px', color: state.cacheEnabled ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
              {state.cacheEnabled ? '● Enabled' : '○ Disabled'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Cache Hits</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
              {state.cacheHits}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Cache Misses</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
              {state.cacheMisses}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total Queries</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0070f3' }}>
              {state.totalQueries}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Hit Rate</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
              {hitRate}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>TTL</div>
            <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              {state.cacheTtl}ms
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClearCache}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}
