import { useState } from 'react';
import { runFullDemo } from '../lib/demoWorkflow';
import { logCollector } from '../lib/logCollector';

export function DemoRunner({
  client,
  onEventCreated,
  onDemoComplete
}: {
  client: any;
  onEventCreated: (event: any) => void;
  onDemoComplete: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const startDemo = async () => {
    if (!client) {
      alert('InsightsClient not initialized yet. Please wait a moment and try again.');
      return;
    }

    setRunning(true);
    setProgress(0);
    console.log('[Meditation] Starting full demo workflow...');
    logCollector.log('DEMO', 'Full demo workflow started');

    await runFullDemo(
      client,
      onEventCreated,
      (newStatus: string) => {
        setStatus(newStatus);
        setProgress(prev => Math.min(prev + 12.5, 100));
        console.log('[Meditation Demo]', newStatus);
        logCollector.log('DEMO', newStatus);
      },
      () => {
        setProgress(100);
        logCollector.log('DEMO', 'Full demo workflow completed successfully');
        setTimeout(() => {
          setRunning(false);
          setStatus('');
          setProgress(0);
          onDemoComplete();
        }, 2000);
      }
    );
  };

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      color: 'white',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}>
            🎬 Full Demo Workflow
          </h2>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Automated end-to-end test of all InsightsClient features
          </p>
        </div>
        <button
          onClick={startDemo}
          disabled={running}
          style={{
            padding: '15px 30px',
            background: running ? '#9a9a9a' : 'white',
            color: running ? 'white' : '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: running ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.3s'
          }}
        >
          {running ? '⏳ Running...' : '▶ Start Demo'}
        </button>
      </div>

      {running && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {status}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {Math.round(progress)}%
            </div>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'white',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      <div style={{
        marginTop: '15px',
        padding: '15px',
        background: 'rgba(255,255,255,0.15)',
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Demo includes:</div>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Basic event creation (user input, LLM invocation, execution)</li>
          <li>Event chain workflow (parent-child relationships)</li>
          <li>Bulk event generation (20 events)</li>
          <li>Nested event chains (depth tracking)</li>
          <li>Error scenario simulation</li>
          <li>Batch flush to API</li>
          <li>Summary event creation</li>
        </ul>
      </div>
    </div>
  );
}
