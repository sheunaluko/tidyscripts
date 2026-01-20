import { useState } from 'react';

export function EventGenerator({ client, onEventCreated }: {
  client: any;
  onEventCreated: (event: any) => void;
}) {
  const [chainActive, setChainActive] = useState(false);
  const [customEvent, setCustomEvent] = useState({
    event_type: 'custom_event',
    payload: '{"test": true}'
  });
  const [bulkCount, setBulkCount] = useState(10);

  const addUserInput = async () => {
    if (!client) return;
    const eventId = await client.addUserInput({
      input_mode: 'test',
      input_length: 42,
      context: { test: true, timestamp: Date.now() }
    });
    onEventCreated({ eventId, type: 'user_input', timestamp: new Date() });
    console.log('[Meditation] Created user_input event:', eventId);
  };

  const addLLMInvocation = async () => {
    if (!client) return;
    const eventId = await client.addLLMInvocation({
      model: 'test-model-1',
      provider: 'test-provider',
      prompt_tokens: Math.floor(Math.random() * 500) + 100,
      completion_tokens: Math.floor(Math.random() * 200) + 50,
      latency_ms: Math.floor(Math.random() * 2000) + 100,
      status: 'success'
    });
    onEventCreated({ eventId, type: 'llm_invocation', timestamp: new Date() });
    console.log('[Meditation] Created llm_invocation event:', eventId);
  };

  const addExecution = async () => {
    if (!client) return;
    const eventId = await client.addExecution({
      execution_type: 'test_execution',
      status: Math.random() > 0.8 ? 'error' : 'success',
      duration_ms: Math.floor(Math.random() * 500) + 50,
      function_calls: Math.floor(Math.random() * 10),
      variables_assigned: Math.floor(Math.random() * 20)
    });
    onEventCreated({ eventId, type: 'execution', timestamp: new Date() });
    console.log('[Meditation] Created execution event:', eventId);
  };

  const startChain = async () => {
    if (!client) return;
    const eventId = await client.startChain('test_chain', {
      test: 'chain_root',
      timestamp: Date.now()
    });
    setChainActive(true);
    onEventCreated({ eventId, type: 'chain_start', timestamp: new Date() });
    console.log('[Meditation] Started event chain:', eventId);
  };

  const addInChain = async () => {
    if (!client) return;
    const eventId = await client.addInChain('chain_event', {
      step: 'test_step',
      data: Math.random()
    });
    onEventCreated({ eventId, type: 'chain_event', timestamp: new Date() });
    console.log('[Meditation] Added event in chain:', eventId);
  };

  const endChain = () => {
    if (!client) return;
    client.endChain();
    setChainActive(false);
    console.log('[Meditation] Ended event chain');
  };

  const addCustomEvent = async () => {
    if (!client) return;
    try {
      const payload = JSON.parse(customEvent.payload);
      const eventId = await client.addEvent(
        customEvent.event_type,
        payload
      );
      onEventCreated({ eventId, type: customEvent.event_type, timestamp: new Date() });
      console.log('[Meditation] Created custom event:', eventId);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      alert('Invalid JSON payload!');
    }
  };

  const generateBulkEvents = async () => {
    if (!client) return;
    console.log(`[Meditation] Generating ${bulkCount} bulk events...`);
    for (let i = 0; i < bulkCount; i++) {
      const eventId = await client.addEvent('bulk_test', {
        index: i,
        timestamp: Date.now()
      });
      onEventCreated({ eventId, type: 'bulk_test', timestamp: new Date() });
      // Small delay to avoid blocking
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    console.log(`[Meditation] Generated ${bulkCount} events`);
  };

  const buttonStyle = {
    padding: '10px 20px',
    background: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const sectionStyle = {
    marginBottom: '30px',
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '8px'
  };

  return (
    <div>
      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={addUserInput} style={buttonStyle}>
            Add User Input Event
          </button>
          <button onClick={addLLMInvocation} style={buttonStyle}>
            Add LLM Invocation Event
          </button>
          <button onClick={addExecution} style={buttonStyle}>
            Add Execution Event
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Event Chains</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={startChain}
            disabled={chainActive}
            style={{
              ...buttonStyle,
              background: chainActive ? '#ccc' : '#4caf50',
              cursor: chainActive ? 'not-allowed' : 'pointer'
            }}
          >
            Start Chain
          </button>
          <button
            onClick={addInChain}
            disabled={!chainActive}
            style={{
              ...buttonStyle,
              background: !chainActive ? '#ccc' : '#ff9800',
              cursor: !chainActive ? 'not-allowed' : 'pointer'
            }}
          >
            Add Event in Chain
          </button>
          <button
            onClick={endChain}
            disabled={!chainActive}
            style={{
              ...buttonStyle,
              background: !chainActive ? '#ccc' : '#f44336',
              cursor: !chainActive ? 'not-allowed' : 'pointer'
            }}
          >
            End Chain
          </button>
          {chainActive && (
            <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
              🔗 Chain Active
            </span>
          )}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Custom Event</h3>
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Event Type:
            </label>
            <input
              type="text"
              value={customEvent.event_type}
              onChange={e => setCustomEvent({ ...customEvent, event_type: e.target.value })}
              style={{
                padding: '8px',
                width: '300px',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Payload (JSON):
            </label>
            <textarea
              value={customEvent.payload}
              onChange={e => setCustomEvent({ ...customEvent, payload: e.target.value })}
              style={{
                padding: '8px',
                width: '100%',
                minHeight: '80px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
            />
          </div>
          <div>
            <button onClick={addCustomEvent} style={buttonStyle}>
              Add Custom Event
            </button>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Stress Testing</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px' }}>
            Number of events:
          </label>
          <input
            type="number"
            value={bulkCount}
            onChange={e => setBulkCount(parseInt(e.target.value) || 10)}
            style={{
              padding: '8px',
              width: '100px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button onClick={generateBulkEvents} style={buttonStyle}>
            Generate Bulk Events
          </button>
        </div>
      </div>
    </div>
  );
}
