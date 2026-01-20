export async function runFullDemo(
  client: any,
  onEventCreated: (event: any) => void,
  onStatusUpdate: (status: string) => void,
  onComplete: () => void
) {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Step 1: Create some basic events
    onStatusUpdate('🎯 Creating basic events...');
    await delay(1000);

    const userInputId = await client.addUserInput({
      input_mode: 'demo',
      input_length: 42,
      context: { demo: true }
    });
    onEventCreated({ eventId: userInputId, type: 'user_input', timestamp: new Date() });
    await delay(500);

    const llmId = await client.addLLMInvocation({
      model: 'demo-model',
      provider: 'demo-provider',
      prompt_tokens: 150,
      completion_tokens: 75,
      latency_ms: 350,
      status: 'success'
    });
    onEventCreated({ eventId: llmId, type: 'llm_invocation', timestamp: new Date() });
    await delay(500);

    const execId = await client.addExecution({
      execution_type: 'demo_execution',
      status: 'success',
      duration_ms: 250,
      function_calls: 5,
      variables_assigned: 10
    });
    onEventCreated({ eventId: execId, type: 'execution', timestamp: new Date() });
    await delay(1000);

    // Step 2: Create an event chain
    onStatusUpdate('🔗 Creating event chain...');
    await delay(1000);

    const rootId = await client.startChain('demo_workflow', {
      step: 'initialization',
      timestamp: Date.now()
    });
    onEventCreated({ eventId: rootId, type: 'chain_start', timestamp: new Date() });
    await delay(500);

    for (let i = 1; i <= 3; i++) {
      const childId = await client.addInChain('workflow_step', {
        step: `step_${i}`,
        progress: (i / 3) * 100
      });
      onEventCreated({ eventId: childId, type: 'chain_event', timestamp: new Date() });
      await delay(500);
    }

    const completionId = await client.addInChain('workflow_complete', {
      status: 'success',
      total_steps: 3
    });
    onEventCreated({ eventId: completionId, type: 'chain_event', timestamp: new Date() });
    await delay(500);

    client.endChain();
    await delay(1000);

    // Step 3: Generate bulk events
    onStatusUpdate('📦 Generating bulk events (20 events)...');
    await delay(1000);

    for (let i = 0; i < 20; i++) {
      const bulkId = await client.addEvent('bulk_demo', {
        index: i,
        batch: 1,
        timestamp: Date.now()
      });
      onEventCreated({ eventId: bulkId, type: 'bulk_test', timestamp: new Date() });

      if (i % 5 === 4) {
        await delay(300); // Pause every 5 events to show batching
      }
    }
    await delay(1000);

    // Step 4: Create a nested chain workflow
    onStatusUpdate('🌲 Creating nested event chains...');
    await delay(1000);

    const outerChainId = await client.startChain('outer_process', {
      level: 'outer'
    });
    onEventCreated({ eventId: outerChainId, type: 'chain_start', timestamp: new Date() });
    await delay(500);

    const innerChainId = await client.startChain('inner_process', {
      level: 'inner'
    });
    onEventCreated({ eventId: innerChainId, type: 'chain_start', timestamp: new Date() });
    await delay(500);

    const deepEventId = await client.addInChain('deep_operation', {
      depth: 2
    });
    onEventCreated({ eventId: deepEventId, type: 'chain_event', timestamp: new Date() });
    await delay(500);

    client.endChain(); // End inner chain
    await delay(300);

    const outerEventId = await client.addInChain('outer_operation', {
      depth: 1
    });
    onEventCreated({ eventId: outerEventId, type: 'chain_event', timestamp: new Date() });
    await delay(500);

    client.endChain(); // End outer chain
    await delay(1000);

    // Step 5: Simulate error scenario
    onStatusUpdate('⚠️ Testing error handling...');
    await delay(1000);

    const errorExecId = await client.addExecution({
      execution_type: 'error_simulation',
      status: 'error',
      duration_ms: 100,
      error: 'Simulated error for testing'
    });
    onEventCreated({ eventId: errorExecId, type: 'execution', timestamp: new Date() });
    await delay(1000);

    // Step 6: Force batch flush
    onStatusUpdate('💾 Flushing batch to API...');
    await delay(1000);
    await client.flushBatch();
    await delay(1500);

    // Step 7: Create final summary event
    onStatusUpdate('✅ Creating summary event...');
    await delay(500);

    const summaryId = await client.addEvent('demo_complete', {
      total_events_created: 30,
      chains_created: 3,
      demo_duration_seconds: 15,
      status: 'success'
    });
    onEventCreated({ eventId: summaryId, type: 'custom_event', timestamp: new Date() });
    await delay(500);

    onStatusUpdate('🎉 Demo workflow complete!');
    await delay(1000);

    onComplete();

  } catch (error: any) {
    onStatusUpdate(`❌ Demo failed: ${error.message}`);
    console.error('[Meditation Demo] Error:', error);
    onComplete();
  }
}
