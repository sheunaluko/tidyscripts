import { useState } from 'react';
import { logCollector } from '../lib/logCollector';

export function LogExporter() {
  const [stats, setStats] = useState(logCollector.getStats());
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const updateStats = () => {
    setStats(logCollector.getStats());
  };

  const copyToClipboard = async () => {
    const report = logCollector.generateReport();
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      console.log('[Meditation] Logs copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('[Meditation] Failed to copy logs:', error);
      alert('Failed to copy to clipboard. Please use the download option instead.');
    }
  };

  const downloadLogs = () => {
    const report = logCollector.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditation-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[Meditation] Logs downloaded');
  };

  const clearLogs = () => {
    if (confirm('Clear all collected logs? This cannot be undone.')) {
      logCollector.clear();
      setStats(logCollector.getStats());
      console.log('[Meditation] Logs cleared');
    }
  };

  const previewLogs = () => {
    setShowPreview(!showPreview);
  };

  // Refresh stats periodically
  useState(() => {
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  });

  const total = stats.logs + stats.events + stats.tests + stats.queries + stats.apiCalls;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #0070f3',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '320px'
    }}>
      <div style={{
        padding: '15px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0070f3',
        color: 'white',
        borderTopLeftRadius: '10px',
        borderTopRightRadius: '10px'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>📋 Log Exporter</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>{total} items collected</div>
        </div>
      </div>

      <div style={{ padding: '15px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          fontSize: '12px',
          marginBottom: '12px'
        }}>
          <div>
            <span style={{ color: '#666' }}>Console:</span> <strong>{stats.logs}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>Events:</span> <strong>{stats.events}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>Tests:</span> <strong>{stats.tests}</strong>
          </div>
          <div>
            <span style={{ color: '#666' }}>Queries:</span> <strong>{stats.queries}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={copyToClipboard}
            style={{
              padding: '10px',
              background: copied ? '#4caf50' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.3s'
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy All Logs'}
          </button>

          <button
            onClick={downloadLogs}
            style={{
              padding: '10px',
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            💾 Download Logs
          </button>

          <button
            onClick={previewLogs}
            style={{
              padding: '8px',
              background: 'transparent',
              color: '#0070f3',
              border: '1px solid #0070f3',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showPreview ? '▼ Hide Preview' : '▶ Show Preview'}
          </button>

          <button
            onClick={clearLogs}
            style={{
              padding: '8px',
              background: 'transparent',
              color: '#f44336',
              border: '1px solid #f44336',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗑️ Clear Logs
          </button>
        </div>
      </div>

      {showPreview && (
        <div style={{
          borderTop: '1px solid #eee',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <pre style={{
            margin: 0,
            padding: '15px',
            fontSize: '10px',
            fontFamily: 'monospace',
            background: '#f5f5f5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {logCollector.generateReport()}
          </pre>
        </div>
      )}
    </div>
  );
}
