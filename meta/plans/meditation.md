# Meditation: InsightsClient Testing & Observability Dashboard

## Overview
Meditation is a testing and observability dashboard for the InsightsClient library. The name "Meditation" reflects its purpose: to meditate on/observe the behavior of the InsightsClient.

**Location:** `apps/ts_next_app/app/laboratory/meditation/`

**Purpose:**
- Test all InsightsClient features in isolation
- Verify event tracking, batching, and storage
- Monitor real-time event flow from client → API → database
- Validate event chains and trace relationships
- Debug InsightsClient behavior before integrating into production apps (Cortex, RAI)

---

## Key Features

### 1. Event Generation Testing
Interactive controls to fire different event types and scenarios:
- Single events (user_input, llm_invocation, execution, etc.)
- Event chains (parent-child relationships)
- Batch flushing triggers
- Error scenarios
- High-volume event generation (stress testing)

### 2. Real-time Monitoring
Live feedback on InsightsClient behavior:
- Event queue visualization (pending events in batch)
- Batch flush triggers (size threshold, time interval)
- API request/response monitoring
- Success/failure indicators
- Event throughput metrics

### 3. Database Query Interface
Query and visualize stored events:
- Recent events table
- Filter by event_type, session_id, trace_id, app_name
- Event chain visualization (tree view)
- Parent-child relationship explorer
- Timeline view of events

### 4. Test Scenarios
Pre-built test scenarios:
- Basic event creation
- Event chain workflow
- Batch behavior (size/time triggers)
- Silent failure testing (API errors)
- Session management
- Trace ID propagation
- Concurrent event generation

### 5. Client State Inspector
View InsightsClient internal state:
- Current session ID
- Chain stack depth
- Event batch size
- Configuration settings
- Enabled/disabled status

---

## UI Layout

### Header
- App title: "Meditation - InsightsClient Observer"
- Connection status indicator (green = API healthy, red = error)
- Session ID display
- Enable/disable InsightsClient toggle

### Main Sections (Tabs or Panels)

#### Tab 1: Event Generator
**Quick Actions:**
- Button: "Add User Input Event"
- Button: "Add LLM Invocation Event"
- Button: "Add Execution Event"
- Button: "Add Custom Event"

**Event Chains:**
- Button: "Start Chain"
- Button: "Add Event in Chain"
- Button: "End Chain"
- Display: Current chain depth

**Batch Controls:**
- Button: "Flush Batch Now"
- Display: Events in batch (count)
- Display: Time until next auto-flush

**Stress Testing:**
- Input: Number of events to generate
- Button: "Generate Bulk Events"
- Checkbox: "Add random delays"

#### Tab 2: Event Monitor
**Real-time Event Feed:**
- Scrollable list of events as they're created
- Show event_id, event_type, timestamp
- Color-coded by type
- Expandable to see full payload

**Batch Activity:**
- Log of batch flush events
- API response details
- Error messages (if any)

#### Tab 3: Database Query
**Query Builder:**
- Dropdown: Event type filter
- Input: Session ID filter
- Input: Trace ID filter
- Date range picker
- Button: "Execute Query"

**Results Display:**
- Table of matching events
- Sortable columns
- Click to expand event details
- Export to JSON button

**Event Chain Viewer:**
- Input: Trace ID
- Display: Tree visualization of event chain
- Show parent-child relationships
- Highlight timing/duration

#### Tab 4: Validation Tests
**Automated Test Suite:**
- Test: "Event structure validation"
- Test: "Batch flush timing"
- Test: "Chain parent-child links"
- Test: "Silent failure mode"
- Test: "Session ID consistency"
- Button: "Run All Tests"
- Results: Pass/Fail indicators with details

---

## Implementation Steps

### Phase 1: Basic Setup & Infrastructure

#### 1.1 Create App Structure
**Files to create:**
```
apps/ts_next_app/app/laboratory/meditation/
├── page.tsx                    # Main Meditation component
├── components/
│   ├── EventGenerator.tsx      # Event generation controls
│   ├── EventMonitor.tsx        # Real-time event feed
│   ├── DatabaseQuery.tsx       # Query interface
│   ├── ValidationTests.tsx     # Test suite
│   └── ClientStateView.tsx     # InsightsClient state inspector
├── lib/
│   ├── testScenarios.ts        # Pre-built test scenarios
│   └── databaseClient.ts       # SurrealDB query helpers
└── types.ts                    # Local type definitions
```

#### 1.2 Initialize InsightsClient
**In `page.tsx`:**
```typescript
import * as tsw from "tidyscripts_web";
const { insights } = tsw.common;

// Initialize InsightsClient
const insightsClient = useRef<any>(null);
const [clientState, setClientState] = useState({
  sessionId: '',
  batchSize: 0,
  chainDepth: 0,
  enabled: true
});

useEffect(() => {
  insightsClient.current = insights.createClient({
    app_name: 'meditation',
    app_version: '0.1.0',
    user_id: 'test_user',
    session_id: insights.generateSessionId(),
    batch_size: 10,  // Small batch for testing
    batch_interval_ms: 5000,
  });

  // Store in window for debugging
  window.meditationInsights = insightsClient.current;

  // Update state
  setClientState({
    sessionId: insightsClient.current.getSessionId(),
    batchSize: 0,
    chainDepth: 0,
    enabled: true
  });
}, []);
```

### Phase 2: Event Generator Component

#### 2.1 Quick Action Buttons
```typescript
// EventGenerator.tsx
export function EventGenerator({ client, onEventCreated }) {
  const addUserInput = async () => {
    const eventId = await client.addUserInput({
      input_mode: 'test',
      input_length: 42,
      context: { test: true }
    });
    onEventCreated({ eventId, type: 'user_input' });
  };

  const addLLMInvocation = async () => {
    const eventId = await client.addLLMInvocation({
      model: 'test-model',
      provider: 'test',
      prompt_tokens: 100,
      completion_tokens: 50,
      latency_ms: 250,
      status: 'success'
    });
    onEventCreated({ eventId, type: 'llm_invocation' });
  };

  const addExecution = async () => {
    const eventId = await client.addExecution({
      execution_type: 'test',
      status: 'success',
      duration_ms: 150
    });
    onEventCreated({ eventId, type: 'execution' });
  };

  return (
    <div>
      <h3>Quick Actions</h3>
      <button onClick={addUserInput}>Add User Input</button>
      <button onClick={addLLMInvocation}>Add LLM Invocation</button>
      <button onClick={addExecution}>Add Execution</button>
    </div>
  );
}
```

#### 2.2 Event Chain Controls
```typescript
const [chainActive, setChainActive] = useState(false);

const startChain = async () => {
  const eventId = await client.startChain('test_chain', {
    test: 'chain_root'
  });
  setChainActive(true);
  onEventCreated({ eventId, type: 'chain_start' });
};

const addInChain = async () => {
  const eventId = await client.addInChain('chain_event', {
    step: 'test_step'
  });
  onEventCreated({ eventId, type: 'chain_event' });
};

const endChain = () => {
  client.endChain();
  setChainActive(false);
};
```

#### 2.3 Custom Event Builder
```typescript
const [customEvent, setCustomEvent] = useState({
  event_type: '',
  payload: '{}'
});

const addCustomEvent = async () => {
  try {
    const payload = JSON.parse(customEvent.payload);
    const eventId = await client.addEvent(
      customEvent.event_type,
      payload
    );
    onEventCreated({ eventId, type: customEvent.event_type });
  } catch (error) {
    console.error('Invalid JSON payload:', error);
  }
};
```

### Phase 3: Real-time Event Monitor

#### 3.1 Event Feed Display
```typescript
// EventMonitor.tsx
export function EventMonitor({ events }) {
  return (
    <div className="event-monitor">
      <h3>Event Feed</h3>
      <div className="event-list">
        {events.map((event, i) => (
          <EventCard key={i} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="event-card" onClick={() => setExpanded(!expanded)}>
      <div className="event-header">
        <span className="event-type">{event.type}</span>
        <span className="event-id">{event.eventId}</span>
        <span className="timestamp">{new Date().toLocaleTimeString()}</span>
      </div>
      {expanded && (
        <pre className="event-payload">
          {JSON.stringify(event, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

#### 3.2 Batch Activity Monitor
```typescript
const [batchActivity, setBatchActivity] = useState([]);

// Hook into InsightsClient flush events
// (This would require adding an event emitter to InsightsClient)
// For now, poll the batch size
useEffect(() => {
  const interval = setInterval(() => {
    // Check batch size via exposed method
    const size = insightsClient.current?.eventBatch?.length || 0;
    setClientState(prev => ({ ...prev, batchSize: size }));
  }, 100);

  return () => clearInterval(interval);
}, []);
```

### Phase 4: Database Query Interface

#### 4.1 Database Client Helper
```typescript
// lib/databaseClient.ts
export async function queryInsightsEvents(filters: {
  event_type?: string;
  session_id?: string;
  trace_id?: string;
  limit?: number;
}) {
  // Call SurrealDB via API endpoint
  const response = await fetch('/api/insights/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters)
  });

  return response.json();
}
```

#### 4.2 Query API Endpoint
**Create:** `apps/ts_next_app/pages/api/insights/query.ts`
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import * as tsn from "tidyscripts_node";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { event_type, session_id, trace_id, limit = 50 } = req.body;

  try {
    // Connect to SurrealDB
    const db = await tsn.apis.surreal.connect_to_surreal({
      url: process.env.SURREAL_TIDYSCRIPTS_BACKEND_URL || 'ws://localhost:8000/rpc',
      namespace: 'production',
      database: 'insights_events',
      auth: {
        username: process.env.SURREAL_TIDYSCRIPTS_BACKEND_USER || 'root',
        password: process.env.SURREAL_TIDYSCRIPTS_BACKEND_PASSWORD || 'root',
      },
    });

    // Build query
    let query = 'SELECT * FROM insights_events';
    const conditions = [];
    const params: any = {};

    if (event_type) {
      conditions.push('event_type = $event_type');
      params.event_type = event_type;
    }
    if (session_id) {
      conditions.push('session_id = $session_id');
      params.session_id = session_id;
    }
    if (trace_id) {
      conditions.push('trace_id = $trace_id');
      params.trace_id = trace_id;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT $limit';
    params.limit = limit;

    const result = await db.query(query, params);

    await db.close();

    res.status(200).json({
      success: true,
      events: result[0] || []
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

#### 4.3 Query Interface Component
```typescript
// components/DatabaseQuery.tsx
export function DatabaseQuery() {
  const [filters, setFilters] = useState({
    event_type: '',
    session_id: '',
    trace_id: '',
    limit: 50
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const data = await queryInsightsEvents(filters);
      setResults(data.events);
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Database Query</h3>
      <div className="filters">
        <input
          placeholder="Event Type"
          value={filters.event_type}
          onChange={e => setFilters({ ...filters, event_type: e.target.value })}
        />
        <input
          placeholder="Session ID"
          value={filters.session_id}
          onChange={e => setFilters({ ...filters, session_id: e.target.value })}
        />
        <input
          placeholder="Trace ID"
          value={filters.trace_id}
          onChange={e => setFilters({ ...filters, trace_id: e.target.value })}
        />
        <button onClick={executeQuery} disabled={loading}>
          {loading ? 'Querying...' : 'Execute Query'}
        </button>
      </div>

      <div className="results">
        {results.length === 0 ? (
          <p>No results</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Type</th>
                <th>Timestamp</th>
                <th>Parent</th>
                <th>Trace</th>
              </tr>
            </thead>
            <tbody>
              {results.map((event: any) => (
                <tr key={event.event_id}>
                  <td>{event.event_id}</td>
                  <td>{event.event_type}</td>
                  <td>{new Date(event.timestamp).toLocaleString()}</td>
                  <td>{event.parent_event_id || '-'}</td>
                  <td>{event.trace_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

### Phase 5: Validation Tests

#### 5.1 Test Scenarios
```typescript
// lib/testScenarios.ts
export const testScenarios = {
  async basicEvent(client: any) {
    const eventId = await client.addEvent('test_event', { test: true });
    return {
      passed: eventId && eventId.startsWith('evt_'),
      message: `Event created with ID: ${eventId}`
    };
  },

  async eventChain(client: any) {
    const rootId = await client.startChain('chain_root', { step: 1 });
    const child1Id = await client.addInChain('chain_child', { step: 2 });
    const child2Id = await client.addInChain('chain_child', { step: 3 });
    client.endChain();

    return {
      passed: rootId && child1Id && child2Id,
      message: `Chain created: ${rootId} → ${child1Id} → ${child2Id}`
    };
  },

  async batchFlush(client: any) {
    const startTime = Date.now();

    // Add multiple events
    for (let i = 0; i < 5; i++) {
      await client.addEvent('batch_test', { index: i });
    }

    // Trigger flush
    await client.flushBatch();

    const duration = Date.now() - startTime;

    return {
      passed: duration < 5000,
      message: `Batch flush completed in ${duration}ms`
    };
  },

  async silentFailure(client: any) {
    // Temporarily break the endpoint
    const originalEndpoint = client.config.endpoint;
    client.config.endpoint = '/api/invalid_endpoint';

    try {
      const eventId = await client.addEvent('failure_test', { test: true });

      // Should still return an event ID despite failure
      const passed = eventId && eventId.startsWith('evt_');

      client.config.endpoint = originalEndpoint;

      return {
        passed,
        message: passed
          ? 'Silent failure working - returned dummy ID'
          : 'Silent failure failed - threw error'
      };
    } catch (error) {
      client.config.endpoint = originalEndpoint;
      return {
        passed: false,
        message: `Silent failure broken - threw error: ${error}`
      };
    }
  }
};
```

#### 5.2 Test Runner Component
```typescript
// components/ValidationTests.tsx
export function ValidationTests({ client }) {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const runAllTests = async () => {
    setRunning(true);
    setTestResults([]);

    const results = [];

    for (const [name, testFn] of Object.entries(testScenarios)) {
      try {
        const result = await testFn(client);
        results.push({ name, ...result });
      } catch (error) {
        results.push({
          name,
          passed: false,
          message: `Error: ${error}`
        });
      }
    }

    setTestResults(results);
    setRunning(false);
  };

  return (
    <div>
      <h3>Validation Tests</h3>
      <button onClick={runAllTests} disabled={running}>
        {running ? 'Running Tests...' : 'Run All Tests'}
      </button>

      <div className="test-results">
        {testResults.map((result, i) => (
          <div key={i} className={`test-result ${result.passed ? 'pass' : 'fail'}`}>
            <span className="test-name">{result.name}</span>
            <span className="test-status">{result.passed ? '✓ PASS' : '✗ FAIL'}</span>
            <div className="test-message">{result.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 6: Main Page Assembly

#### 6.1 Main Meditation Page
```typescript
// page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import * as tsw from "tidyscripts_web";
import { EventGenerator } from './components/EventGenerator';
import { EventMonitor } from './components/EventMonitor';
import { DatabaseQuery } from './components/DatabaseQuery';
import { ValidationTests } from './components/ValidationTests';
import { ClientStateView } from './components/ClientStateView';

const { insights } = tsw.common;

export default function MeditationPage() {
  const insightsClient = useRef<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('generator');
  const [clientState, setClientState] = useState({
    sessionId: '',
    batchSize: 0,
    chainDepth: 0,
    enabled: true
  });

  useEffect(() => {
    // Initialize InsightsClient
    insightsClient.current = insights.createClient({
      app_name: 'meditation',
      app_version: '0.1.0',
      user_id: 'test_user',
      session_id: insights.generateSessionId(),
      batch_size: 10,
      batch_interval_ms: 5000,
    });

    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).meditationInsights = insightsClient.current;
    }

    setClientState({
      sessionId: insightsClient.current.getSessionId(),
      batchSize: 0,
      chainDepth: insightsClient.current.getChainDepth(),
      enabled: true
    });

    // Cleanup on unmount
    return () => {
      if (insightsClient.current) {
        insightsClient.current.shutdown();
      }
    };
  }, []);

  const handleEventCreated = (event: any) => {
    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events

    // Update client state
    setClientState(prev => ({
      ...prev,
      batchSize: insightsClient.current?.eventBatch?.length || 0,
      chainDepth: insightsClient.current?.getChainDepth() || 0
    }));
  };

  return (
    <div className="meditation-container">
      <header>
        <h1>🧘 Meditation - InsightsClient Observer</h1>
        <ClientStateView state={clientState} />
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'generator' ? 'active' : ''}
          onClick={() => setActiveTab('generator')}
        >
          Event Generator
        </button>
        <button
          className={activeTab === 'monitor' ? 'active' : ''}
          onClick={() => setActiveTab('monitor')}
        >
          Event Monitor
        </button>
        <button
          className={activeTab === 'database' ? 'active' : ''}
          onClick={() => setActiveTab('database')}
        >
          Database Query
        </button>
        <button
          className={activeTab === 'tests' ? 'active' : ''}
          onClick={() => setActiveTab('tests')}
        >
          Validation Tests
        </button>
      </nav>

      <main>
        {activeTab === 'generator' && (
          <EventGenerator
            client={insightsClient.current}
            onEventCreated={handleEventCreated}
          />
        )}
        {activeTab === 'monitor' && (
          <EventMonitor events={events} />
        )}
        {activeTab === 'database' && (
          <DatabaseQuery />
        )}
        {activeTab === 'tests' && (
          <ValidationTests client={insightsClient.current} />
        )}
      </main>
    </div>
  );
}
```

---

## Testing Workflows

### Workflow 1: Basic Event Creation
1. Open Meditation dashboard
2. Navigate to "Event Generator" tab
3. Click "Add User Input Event"
4. Verify event appears in Event Monitor
5. Switch to "Database Query" tab
6. Query by session ID
7. Verify event is stored in database

### Workflow 2: Event Chain Validation
1. Click "Start Chain"
2. Click "Add Event in Chain" 3 times
3. Click "End Chain"
4. Query database by trace_id
5. Verify parent-child relationships in results

### Workflow 3: Batch Behavior
1. Set batch_size to 5
2. Generate 10 events rapidly
3. Observe batch queue size
4. Verify auto-flush after 5 events
5. Check API response logs

### Workflow 4: Silent Failure Mode
1. Navigate to "Validation Tests"
2. Run "Silent Failure" test
3. Verify test passes (client doesn't crash)
4. Check that dummy event ID was returned

### Workflow 5: Stress Testing
1. Generate 100 events
2. Monitor batch flush frequency
3. Query database for all events
4. Verify count matches generated count

---

## Success Criteria

✅ InsightsClient initializes without errors
✅ Events can be created via UI buttons
✅ Event Monitor shows events in real-time
✅ Batch queue size updates correctly
✅ Events are stored in SurrealDB
✅ Database queries return correct results
✅ Event chains maintain parent-child links
✅ Trace IDs propagate correctly
✅ Silent failure mode works (no app crashes)
✅ Validation tests all pass

---

## Future Enhancements

- **Event Chain Visualizer:** Graph view of parent-child relationships
- **Performance Metrics:** Chart of event throughput over time
- **Batch Timeline:** Visualize when batches flush
- **Error Simulation:** Test various API failure scenarios
- **Export Data:** Download query results as CSV/JSON
- **Session Comparison:** Compare events across multiple sessions
- **Parameter Tuning:** Live adjustment of batch_size, batch_interval_ms

---

## Notes

- Meditation serves as the reference implementation for Arch principles
- Keep UI simple and functional - focus on observability, not polish
- All insights are logged to console for debugging
- Use this dashboard to validate InsightsClient before integrating into Cortex/RAI
- The patterns established here (event modeling, parameter definitions) will inform future Arch apps
