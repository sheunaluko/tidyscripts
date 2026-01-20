import { useState } from 'react';
import { logCollector } from '../lib/logCollector';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

interface DatabaseTestSuiteProps {
  client: any;
  sessionId: string;
}

/**
 * Autonomous Database Test Suite
 *
 * Runs comprehensive end-to-end tests to verify:
 * - Single event write/read
 * - Event chains with trace_id
 * - Bulk operations
 * - Query filters
 * - Timestamp ordering
 */
export function DatabaseTestSuite({ client, sessionId }: DatabaseTestSuiteProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState('');

  const runAllTests = async () => {
    if (!client) {
      alert('InsightsClient not initialized');
      return;
    }

    setRunning(true);
    setResults([]);
    const allResults: TestResult[] = [];

    logCollector.log('DB_TEST', 'Starting autonomous database test suite');

    // Test 1: Write Single Event
    await runTest('Write Single Event', async () => {
      const eventId = await client.addEvent('db_test_single', {
        test: 'single_write',
        timestamp: Date.now()
      });

      await client.flushBatch();
      await delay(2000); // Wait for database write

      return { eventId };
    }, allResults);

    // Test 2: Read Single Event
    await runTest('Read Single Event', async () => {
      const response = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: 'db_test_single',
          limit: 1
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Query failed: ${data.error}`);
      }

      if (data.events.length === 0) {
        throw new Error('No events found in database');
      }

      return { eventsFound: data.events.length };
    }, allResults);

    // Test 3: Write Event Chain
    await runTest('Write Event Chain', async () => {
      const rootId = await client.startChain('db_test_chain', { step: 'root' });
      const child1Id = await client.addInChain('db_test_child', { step: 1 });
      const child2Id = await client.addInChain('db_test_child', { step: 2 });
      client.endChain();

      await client.flushBatch();
      await delay(2000);

      return { rootId, child1Id, child2Id };
    }, allResults);

    // Test 4: Read Event Chain
    await runTest('Read Event Chain', async () => {
      const response = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: 'db_test_chain',
          limit: 10
        })
      });

      const data = await response.json();

      if (data.events.length === 0) {
        throw new Error('Chain root event not found');
      }

      const root = data.events[0];
      if (!root.trace_id) {
        throw new Error('Root event missing trace_id');
      }

      // Query by trace_id to get full chain
      const chainResponse = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trace_id: root.trace_id,
          limit: 10
        })
      });

      const chainData = await chainResponse.json();

      if (chainData.events.length < 3) {
        throw new Error(`Expected 3 events in chain, found ${chainData.events.length}`);
      }

      return { chainLength: chainData.events.length, traceId: root.trace_id };
    }, allResults);

    // Test 5: Bulk Write (20 events)
    await runTest('Bulk Write (20 events)', async () => {
      for (let i = 0; i < 20; i++) {
        await client.addEvent('db_test_bulk', {
          index: i,
          timestamp: Date.now()
        });
      }

      await client.flushBatch();
      await delay(3000); // Wait longer for bulk write

      return { eventsCreated: 20 };
    }, allResults);

    // Test 6: Bulk Read
    await runTest('Bulk Read', async () => {
      const response = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          event_type: 'db_test_bulk',
          limit: 50
        })
      });

      const data = await response.json();

      if (data.events.length < 20) {
        throw new Error(`Expected 20 events, found ${data.events.length}`);
      }

      return { eventsRead: data.events.length };
    }, allResults);

    // Test 7: Query Filters (event_type, session_id, trace_id)
    await runTest('Query Filters', async () => {
      // Test event_type filter
      const typeResponse = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'db_test_bulk', limit: 5 })
      });
      const typeData = await typeResponse.json();

      // Test session_id filter
      const sessionResponse = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, limit: 10 })
      });
      const sessionData = await sessionResponse.json();

      if (typeData.events.length === 0 || sessionData.events.length === 0) {
        throw new Error('Query filters returned no results');
      }

      return {
        typeFilterResults: typeData.events.length,
        sessionFilterResults: sessionData.events.length
      };
    }, allResults);

    // Test 8: Timestamp Ordering
    await runTest('Timestamp Ordering', async () => {
      const response = await fetch('/api/insights/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          limit: 10
        })
      });

      const data = await response.json();

      if (data.events.length < 2) {
        throw new Error('Not enough events to verify ordering');
      }

      // Verify DESC ordering
      for (let i = 0; i < data.events.length - 1; i++) {
        const current = new Date(data.events[i].timestamp).getTime();
        const next = new Date(data.events[i + 1].timestamp).getTime();

        if (current < next) {
          throw new Error(`Events not ordered DESC: ${current} < ${next}`);
        }
      }

      return { eventsChecked: data.events.length };
    }, allResults);

    setRunning(false);
    const passedCount = allResults.filter(r => r.passed).length;
    logCollector.log('DB_TEST', `Database test suite completed: ${passedCount}/${allResults.length} passed`);
  };

  const runTest = async (
    name: string,
    testFn: () => Promise<any>,
    allResults: TestResult[]
  ) => {
    setCurrentTest(name);
    logCollector.log('DB_TEST', `Running: ${name}`);

    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      const testResult = {
        name,
        passed: true,
        message: `✓ PASS (${duration}ms) - ${JSON.stringify(result)}`,
        duration
      };

      allResults.push(testResult);
      setResults([...allResults]);
      logCollector.log('DB_TEST', `${name}: PASS (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const testResult = {
        name,
        passed: false,
        message: `✗ FAIL (${duration}ms) - ${error.message}`,
        duration
      };

      allResults.push(testResult);
      setResults([...allResults]);
      logCollector.log('DB_TEST', `${name}: FAIL - ${error.message}`);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <div style={{
      padding: '20px',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      borderRadius: '12px',
      color: 'white',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>🗄️ Database Test Suite</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
            Autonomous end-to-end database verification
          </p>
        </div>
        <button
          onClick={runAllTests}
          disabled={running}
          style={{
            padding: '15px 30px',
            background: running ? '#9a9a9a' : 'white',
            color: running ? 'white' : '#f5576c',
            border: 'none',
            borderRadius: '8px',
            cursor: running ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {running ? '⏳ Running...' : '▶ Run DB Tests'}
        </button>
      </div>

      {running && (
        <div style={{
          padding: '10px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          <div style={{ fontSize: '14px' }}>Current: {currentTest}</div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            Results: {passedCount}/{totalCount} passed
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {results.map((result, i) => (
              <div
                key={i}
                style={{
                  padding: '8px',
                  marginBottom: '8px',
                  background: result.passed ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{result.name}</div>
                <div style={{ marginTop: '4px' }}>{result.message}</div>
              </div>
            ))}
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
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Tests Include:</div>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Single event write/read verification</li>
          <li>Event chain write/read with trace_id</li>
          <li>Bulk operations (20 events)</li>
          <li>Query filter testing (type, session, trace)</li>
          <li>Timestamp ordering verification (DESC)</li>
        </ul>
      </div>
    </div>
  );
}
