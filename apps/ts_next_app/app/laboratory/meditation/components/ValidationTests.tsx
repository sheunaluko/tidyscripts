import { useState } from 'react';
import { testScenarios } from '../lib/testScenarios';
import { logCollector } from '../lib/logCollector';

export function ValidationTests({ client }: { client: any }) {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  const runAllTests = async () => {
    if (!client) {
      alert('InsightsClient not initialized yet. Please wait a moment and try again.');
      return;
    }

    setRunning(true);
    setTestResults([]);

    const results = [];

    for (const [name, testFn] of Object.entries(testScenarios)) {
      setCurrentTest(name);
      console.log(`[Meditation] Running test: ${name}`);

      try {
        const result = await testFn(client);
        const testResult = { name, ...result };
        results.push(testResult);
        setTestResults([...results]);
        logCollector.addTestResult(testResult);
        logCollector.log('TEST', `${name}: ${result.passed ? 'PASS' : 'FAIL'} - ${result.message}`);
      } catch (error: any) {
        const testResult = {
          name,
          passed: false,
          message: `✗ Error: ${error.message}`
        };
        results.push(testResult);
        setTestResults([...results]);
        logCollector.addTestResult(testResult);
        logCollector.log('TEST', `${name}: FAIL - ${error.message}`);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setCurrentTest('');
    setRunning(false);
    console.log('[Meditation] All tests completed:', results);
  };

  const runSingleTest = async (name: string, testFn: any) => {
    if (!client) {
      alert('InsightsClient not initialized yet. Please wait a moment and try again.');
      return;
    }

    setRunning(true);
    setCurrentTest(name);
    console.log(`[Meditation] Running test: ${name}`);

    try {
      const result = await testFn(client);
      const newResult = { name, ...result };

      logCollector.addTestResult(newResult);
      logCollector.log('TEST', `${name}: ${result.passed ? 'PASS' : 'FAIL'} - ${result.message}`);

      // Update or add the result
      setTestResults(prev => {
        const existing = prev.findIndex(r => r.name === name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newResult;
          return updated;
        }
        return [...prev, newResult];
      });
    } catch (error: any) {
      const errorResult = {
        name,
        passed: false,
        message: `✗ Error: ${error.message}`
      };
      logCollector.addTestResult(errorResult);
      logCollector.log('TEST', `${name}: FAIL - ${error.message}`);
      setTestResults(prev => [...prev, errorResult]);
    }

    setCurrentTest('');
    setRunning(false);
  };

  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div>
      <div style={{
        padding: '20px',
        background: '#f9f9f9',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Validation Test Suite</h3>
          <button
            onClick={runAllTests}
            disabled={running}
            style={{
              padding: '10px 20px',
              background: running ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: running ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {running ? `Running: ${currentTest}...` : 'Run All Tests'}
          </button>
        </div>

        {testResults.length > 0 && (
          <div style={{
            padding: '15px',
            background: passedCount === totalCount ? '#e8f5e9' : '#fff3e0',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: passedCount === totalCount ? '#2e7d32' : '#e65100'
            }}>
              {passedCount} / {totalCount} tests passed
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              {passedCount === totalCount ? '🎉 All tests passed!' : `${totalCount - passedCount} test(s) failed`}
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '15px'
      }}>
        {Object.entries(testScenarios).map(([name, testFn]) => {
          const result = testResults.find(r => r.name === name);
          const isRunning = running && currentTest === name;

          return (
            <div
              key={name}
              style={{
                padding: '15px',
                background: 'white',
                border: result
                  ? result.passed
                    ? '2px solid #4caf50'
                    : '2px solid #f44336'
                  : '2px solid #ddd',
                borderRadius: '8px',
                position: 'relative'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>
                    {name.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  {result && (
                    <div style={{
                      fontSize: '12px',
                      color: result.passed ? '#4caf50' : '#f44336',
                      fontWeight: 'bold'
                    }}>
                      {result.passed ? '✓ PASS' : '✗ FAIL'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => runSingleTest(name, testFn)}
                  disabled={running}
                  style={{
                    padding: '6px 12px',
                    background: running ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: running ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {isRunning ? '...' : 'Run'}
                </button>
              </div>

              {result && (
                <div style={{
                  padding: '10px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {result.message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#e3f2fd',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#1976d2'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>💡 About These Tests</div>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Tests validate core InsightsClient functionality</li>
          <li>Silent failure test verifies graceful error handling</li>
          <li>Chain depth tracking ensures proper parent-child relationships</li>
          <li>All tests should pass for production readiness</li>
        </ul>
      </div>
    </div>
  );
}
