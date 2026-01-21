import { useState } from 'react';
import { reflectionsTestScenarios } from '../lib/reflectionsTestScenarios';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface ReflectionsTestSuiteProps {
  client: any;
  sessionId: string;
}

/**
 * Autonomous ReflectionsClient Test Suite
 *
 * Runs comprehensive tests to verify all 19 ReflectionsClient methods:
 * - 5 core query methods
 * - 11 exploration methods
 * - 3 cache/utility methods
 */
export function ReflectionsTestSuite({ client, sessionId }: ReflectionsTestSuiteProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState('');

  const runAllTests = async () => {
    if (!client) {
      alert('ReflectionsClient not initialized');
      return;
    }

    setRunning(true);
    setResults([]);
    const allResults: TestResult[] = [];

    console.log('[ReflectionsTestSuite] Starting autonomous test suite');

    // Core Query Methods (5)
    await runTest('queryEvents', () => reflectionsTestScenarios.queryEvents(client, sessionId), allResults);
    await runTest('getEventsBySession', () => reflectionsTestScenarios.getEventsBySession(client, sessionId), allResults);
    await runTest('getEventsByTrace', () => reflectionsTestScenarios.getEventsByTrace(client), allResults);
    await runTest('getEventsByType', () => reflectionsTestScenarios.getEventsByType(client), allResults);
    await runTest('getEventById', () => reflectionsTestScenarios.getEventById(client, sessionId), allResults);

    // Exploration Methods (11)
    await runTest('getEventTypes', () => reflectionsTestScenarios.getEventTypes(client), allResults);
    await runTest('getEventTypeStats', () => reflectionsTestScenarios.getEventTypeStats(client), allResults);
    await runTest('inspectPayloadSchema', () => reflectionsTestScenarios.inspectPayloadSchema(client), allResults);
    await runTest('getSessions', () => reflectionsTestScenarios.getSessions(client), allResults);
    await runTest('getTraces', () => reflectionsTestScenarios.getTraces(client), allResults);
    await runTest('inspectSession', () => reflectionsTestScenarios.inspectSession(client, sessionId), allResults);
    await runTest('inspectTrace', () => reflectionsTestScenarios.inspectTrace(client), allResults);
    await runTest('getAllTags', () => reflectionsTestScenarios.getAllTags(client), allResults);
    await runTest('getTimeRange', () => reflectionsTestScenarios.getTimeRange(client), allResults);
    await runTest('getDatabaseStats', () => reflectionsTestScenarios.getDatabaseStats(client), allResults);
    await runTest('sampleEvents', () => reflectionsTestScenarios.sampleEvents(client), allResults);

    // Cache/Utility Methods (3)
    await runTest('getCacheStats', () => reflectionsTestScenarios.getCacheStats(client), allResults);
    await runTest('clearCache', () => reflectionsTestScenarios.clearCache(client), allResults);
    await runTest('invalidateCache', () => reflectionsTestScenarios.invalidateCache(client), allResults);

    setRunning(false);
    const passedCount = allResults.filter(r => r.passed).length;
    console.log(`[ReflectionsTestSuite] Test suite completed: ${passedCount}/${allResults.length} passed`);
  };

  const runTest = async (
    name: string,
    testFn: () => Promise<{ passed: boolean; message: string }>,
    allResults: TestResult[]
  ) => {
    setCurrentTest(name);
    console.log(`[ReflectionsTestSuite] Running: ${name}`);

    const startTime = Date.now();

    try {
      const { passed, message } = await testFn();
      const duration = Date.now() - startTime;

      const testResult = {
        name,
        passed,
        message: `${message} (${duration}ms)`,
        duration
      };

      allResults.push(testResult);
      setResults([...allResults]);
      console.log(`[ReflectionsTestSuite] ${name}: ${passed ? 'PASS' : 'FAIL'} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const testResult = {
        name,
        passed: false,
        message: `✗ Unexpected error: ${error.message} (${duration}ms)`,
        duration
      };

      allResults.push(testResult);
      setResults([...allResults]);
      console.error(`[ReflectionsTestSuite] ${name}: ERROR - ${error.message}`);
    }
  };

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      borderRadius: '12px',
      color: '#333',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🔍 ReflectionsClient Test Suite</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
            Autonomous validation of all 19 ReflectionsClient methods
          </p>
        </div>
        <button
          onClick={runAllTests}
          disabled={running}
          style={{
            padding: '15px 30px',
            background: running ? '#9a9a9a' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: running ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {running ? '⏳ Running...' : '▶ Run All Tests'}
        </button>
      </div>

      {running && (
        <div style={{
          padding: '10px',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '6px',
          marginBottom: '15px',
          border: '1px solid #4caf50'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            Running: <span style={{ fontFamily: 'monospace', color: '#0070f3' }}>{currentTest}()</span>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            Results: <span style={{ color: passedCount === totalCount ? '#4caf50' : '#f44336' }}>
              {passedCount}/{totalCount} passed
            </span>
            {!running && passedCount === totalCount && (
              <span style={{ marginLeft: '10px', fontSize: '24px' }}>🎉</span>
            )}
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {results.map((result, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: result.passed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                  border: `1px solid ${result.passed ? '#4caf50' : '#f44336'}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {result.passed ? '✓' : '✗'} {result.name}()
                </div>
                <div style={{ opacity: 0.9, fontSize: '11px' }}>{result.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '15px',
        padding: '15px',
        background: 'rgba(255,255,255,0.4)',
        borderRadius: '8px',
        fontSize: '13px',
        border: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>Test Coverage:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#0070f3' }}>
              Core Queries (5)
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '1.6' }}>
              <li>queryEvents</li>
              <li>getEventsBySession</li>
              <li>getEventsByTrace</li>
              <li>getEventsByType</li>
              <li>getEventById</li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#4caf50' }}>
              Exploration (11)
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '1.6' }}>
              <li>getEventTypes</li>
              <li>getEventTypeStats</li>
              <li>inspectPayloadSchema</li>
              <li>getSessions</li>
              <li>getTraces</li>
              <li>inspectSession</li>
              <li>inspectTrace</li>
              <li>getAllTags</li>
              <li>getTimeRange</li>
              <li>getDatabaseStats</li>
              <li>sampleEvents</li>
            </ul>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '5px', color: '#ff9800' }}>
              Cache/Utilities (3)
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '1.6' }}>
              <li>getCacheStats</li>
              <li>clearCache</li>
              <li>invalidateCache</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
