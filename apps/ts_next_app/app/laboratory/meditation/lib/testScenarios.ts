export const testScenarios = {
  async basicEvent(client: any) {
    try {
      const eventId = await client.addEvent('test_event', { test: true, timestamp: Date.now() });
      return {
        passed: eventId && eventId.startsWith('evt_'),
        message: `✓ Event created with ID: ${eventId}`
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Failed to create event: ${error.message}`
      };
    }
  },

  async eventChain(client: any) {
    try {
      const rootId = await client.startChain('chain_root', { step: 1 });
      const child1Id = await client.addInChain('chain_child', { step: 2 });
      const child2Id = await client.addInChain('chain_child', { step: 3 });
      client.endChain();

      const passed = rootId && child1Id && child2Id &&
                     rootId.startsWith('evt_') &&
                     child1Id.startsWith('evt_') &&
                     child2Id.startsWith('evt_');

      return {
        passed,
        message: passed
          ? `✓ Chain created: ${rootId} → ${child1Id} → ${child2Id}`
          : '✗ Failed to create complete chain'
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Chain creation failed: ${error.message}`
      };
    }
  },

  async batchFlush(client: any) {
    try {
      const startTime = Date.now();

      // Add multiple events
      for (let i = 0; i < 5; i++) {
        await client.addEvent('batch_test', { index: i, timestamp: Date.now() });
      }

      // Trigger flush
      await client.flushBatch();

      const duration = Date.now() - startTime;

      return {
        passed: duration < 5000,
        message: `✓ Batch flush completed in ${duration}ms`
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Batch flush failed: ${error.message}`
      };
    }
  },

  async silentFailure(client: any) {
    try {
      // Store original endpoint
      const originalEndpoint = client.config.endpoint;

      // Temporarily break the endpoint
      client.config.endpoint = '/api/invalid_endpoint_that_does_not_exist';

      const eventId = await client.addEvent('failure_test', { test: true });

      // Restore endpoint
      client.config.endpoint = originalEndpoint;

      // Should still return an event ID despite failure
      const passed = eventId && eventId.startsWith('evt_');

      return {
        passed,
        message: passed
          ? '✓ Silent failure working - returned dummy ID despite invalid endpoint'
          : '✗ Silent failure failed - did not return event ID'
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Silent failure broken - threw error: ${error.message}`
      };
    }
  },

  async sessionManagement(client: any) {
    try {
      const sessionId = client.getSessionId();
      const passed = sessionId && sessionId.startsWith('ses_');

      return {
        passed,
        message: passed
          ? `✓ Session ID valid: ${sessionId}`
          : '✗ Invalid session ID format'
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Session management failed: ${error.message}`
      };
    }
  },

  async chainDepthTracking(client: any) {
    try {
      const initialDepth = client.getChainDepth();

      await client.startChain('depth_test', { step: 1 });
      const depth1 = client.getChainDepth();

      await client.startChain('nested_chain', { step: 2 });
      const depth2 = client.getChainDepth();

      client.endChain();
      const depth3 = client.getChainDepth();

      client.endChain();
      const finalDepth = client.getChainDepth();

      const passed = initialDepth === 0 && depth1 === 1 && depth2 === 2 && depth3 === 1 && finalDepth === 0;

      return {
        passed,
        message: passed
          ? `✓ Chain depth tracking correct: ${initialDepth} → ${depth1} → ${depth2} → ${depth3} → ${finalDepth}`
          : `✗ Chain depth tracking incorrect: ${initialDepth} → ${depth1} → ${depth2} → ${depth3} → ${finalDepth}`
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Chain depth tracking failed: ${error.message}`
      };
    }
  },

  async convenienceMethods(client: any) {
    try {
      const userInputId = await client.addUserInput({
        input_mode: 'test',
        input_length: 100
      });

      const llmId = await client.addLLMInvocation({
        model: 'test-model',
        provider: 'test',
        prompt_tokens: 100,
        completion_tokens: 50,
        latency_ms: 200,
        status: 'success'
      });

      const execId = await client.addExecution({
        execution_type: 'test',
        status: 'success',
        duration_ms: 150
      });

      const passed = userInputId && llmId && execId &&
                     userInputId.startsWith('evt_') &&
                     llmId.startsWith('evt_') &&
                     execId.startsWith('evt_');

      return {
        passed,
        message: passed
          ? '✓ All convenience methods working correctly'
          : '✗ Some convenience methods failed'
      };
    } catch (error: any) {
      return {
        passed: false,
        message: `✗ Convenience methods failed: ${error.message}`
      };
    }
  }
};
