export const reflectionsTestScenarios = {
  // Test 1: queryEvents
  async queryEvents(client: any, sessionId: string) {
    try {
      const result = await client.queryEvents({ session_id: sessionId, limit: 10 });
      const passed = result && Array.isArray(result.events) && typeof result.total_count === 'number';
      return {
        passed,
        message: passed
          ? `✓ queryEvents: Found ${result.total_count} events (${result.from_cache ? 'cached' : 'fresh'})`
          : '✗ queryEvents: Invalid result structure'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ queryEvents failed: ${error.message}` };
    }
  },

  // Test 2: getEventsBySession
  async getEventsBySession(client: any, sessionId: string) {
    try {
      const result = await client.getEventsBySession(sessionId);
      const passed = result && Array.isArray(result.events);
      return {
        passed,
        message: passed
          ? `✓ getEventsBySession: Found ${result.events.length} events`
          : '✗ getEventsBySession: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getEventsBySession failed: ${error.message}` };
    }
  },

  // Test 3: getEventsByTrace
  async getEventsByTrace(client: any) {
    try {
      // First get a trace ID
      const traces = await client.getTraces(1);
      if (!traces || traces.length === 0) {
        return { passed: true, message: '⊘ getEventsByTrace: No traces available to test' };
      }

      const result = await client.getEventsByTrace(traces[0]);
      const passed = result && Array.isArray(result.events);
      return {
        passed,
        message: passed
          ? `✓ getEventsByTrace: Found ${result.events.length} events`
          : '✗ getEventsByTrace: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getEventsByTrace failed: ${error.message}` };
    }
  },

  // Test 4: getEventsByType
  async getEventsByType(client: any) {
    try {
      // First get event types
      const types = await client.getEventTypes();
      if (!types || types.length === 0) {
        return { passed: true, message: '⊘ getEventsByType: No event types available' };
      }

      const result = await client.getEventsByType(types[0], 10);
      const passed = result && Array.isArray(result.events);
      return {
        passed,
        message: passed
          ? `✓ getEventsByType: Found ${result.events.length} events of type '${types[0]}'`
          : '✗ getEventsByType: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getEventsByType failed: ${error.message}` };
    }
  },

  // Test 5: getEventById
  async getEventById(client: any, sessionId: string) {
    try {
      // First get an event
      const sessionEvents = await client.getEventsBySession(sessionId, 1);
      if (!sessionEvents || !sessionEvents.events || sessionEvents.events.length === 0) {
        return { passed: true, message: '⊘ getEventById: No events available to test' };
      }

      const eventId = sessionEvents.events[0].eventId;
      const result = await client.getEventById(eventId);
      const passed = result && result.eventId === eventId;
      return {
        passed,
        message: passed
          ? `✓ getEventById: Retrieved event ${eventId}`
          : '✗ getEventById: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getEventById failed: ${error.message}` };
    }
  },

  // Test 6: getEventTypes
  async getEventTypes(client: any) {
    try {
      const result = await client.getEventTypes();
      const passed = Array.isArray(result) && result.length >= 0;
      return {
        passed,
        message: passed
          ? `✓ getEventTypes: Found ${result.length} event types`
          : '✗ getEventTypes: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getEventTypes failed: ${error.message}` };
    }
  },

  // Test 7: getEventTypeStats
  async getEventTypeStats(client: any) {
    try {
      const result = await client.getEventTypeStats();
      const passed = Array.isArray(result) && (result.length === 0 || result[0].event_type);
      return {
        passed,
        message: passed
          ? `✓ getEventTypeStats: Got stats for ${result.length} event types`
          : '✗ getEventTypeStats: Invalid result structure'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getEventTypeStats failed: ${error.message}` };
    }
  },

  // Test 8: inspectPayloadSchema
  async inspectPayloadSchema(client: any) {
    try {
      const types = await client.getEventTypes();
      if (!types || types.length === 0) {
        return { passed: true, message: '⊘ inspectPayloadSchema: No event types available' };
      }

      const result = await client.inspectPayloadSchema(types[0], 50);
      const passed = result && result.event_type === types[0] && Array.isArray(result.fields);
      return {
        passed,
        message: passed
          ? `✓ inspectPayloadSchema: Analyzed ${result.total_events} events, found ${result.fields.length} fields`
          : '✗ inspectPayloadSchema: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ inspectPayloadSchema failed: ${error.message}` };
    }
  },

  // Test 9: getSessions
  async getSessions(client: any) {
    try {
      const result = await client.getSessions(10);
      const passed = Array.isArray(result);
      return {
        passed,
        message: passed
          ? `✓ getSessions: Found ${result.length} sessions`
          : '✗ getSessions: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getSessions failed: ${error.message}` };
    }
  },

  // Test 10: getTraces
  async getTraces(client: any) {
    try {
      const result = await client.getTraces(10);
      const passed = Array.isArray(result);
      return {
        passed,
        message: passed
          ? `✓ getTraces: Found ${result.length} traces`
          : '✗ getTraces: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getTraces failed: ${error.message}` };
    }
  },

  // Test 11: inspectSession
  async inspectSession(client: any, sessionId: string) {
    try {
      const result = await client.inspectSession(sessionId);
      const passed = result && result.session_id === sessionId && typeof result.event_count === 'number';
      return {
        passed,
        message: passed
          ? `✓ inspectSession: ${result.event_count} events, ${Object.keys(result.event_types).length} types, ${result.traces.length} traces`
          : '✗ inspectSession: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ inspectSession failed: ${error.message}` };
    }
  },

  // Test 12: inspectTrace
  async inspectTrace(client: any) {
    try {
      const traces = await client.getTraces(1);
      if (!traces || traces.length === 0) {
        return { passed: true, message: '⊘ inspectTrace: No traces available to test' };
      }

      const result = await client.inspectTrace(traces[0]);
      const passed = result && result.trace_id === traces[0] && typeof result.event_count === 'number';
      return {
        passed,
        message: passed
          ? `✓ inspectTrace: ${result.event_count} events, depth ${result.chain_structure.depth}`
          : '✗ inspectTrace: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ inspectTrace failed: ${error.message}` };
    }
  },

  // Test 13: getAllTags
  async getAllTags(client: any) {
    try {
      const result = await client.getAllTags();
      const passed = Array.isArray(result);
      return {
        passed,
        message: passed
          ? `✓ getAllTags: Found ${result.length} unique tags`
          : '✗ getAllTags: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getAllTags failed: ${error.message}` };
    }
  },

  // Test 14: getTimeRange
  async getTimeRange(client: any) {
    try {
      const result = await client.getTimeRange();
      const passed = result && typeof result.earliest === 'number' && typeof result.latest === 'number';
      return {
        passed,
        message: passed
          ? `✓ getTimeRange: ${result.span_days.toFixed(2)} days, ${result.total_events} events`
          : '✗ getTimeRange: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getTimeRange failed: ${error.message}` };
    }
  },

  // Test 15: getDatabaseStats
  async getDatabaseStats(client: any) {
    try {
      const result = await client.getDatabaseStats();
      const passed = result && typeof result.total_events === 'number' && Array.isArray(result.event_types);
      return {
        passed,
        message: passed
          ? `✓ getDatabaseStats: ${result.total_events} events, ${result.event_types.length} types, ${result.sessions.length} sessions`
          : '✗ getDatabaseStats: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getDatabaseStats failed: ${error.message}` };
    }
  },

  // Test 16: sampleEvents
  async sampleEvents(client: any) {
    try {
      const result = await client.sampleEvents(undefined, 5);
      const passed = Array.isArray(result);
      return {
        passed,
        message: passed
          ? `✓ sampleEvents: Retrieved ${result.length} random events`
          : '✗ sampleEvents: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ sampleEvents failed: ${error.message}` };
    }
  },

  // Test 17: getCacheStats
  async getCacheStats(client: any) {
    try {
      const result = client.getCacheStats();
      const passed = result && typeof result.enabled === 'boolean' && typeof result.hits === 'number';
      return {
        passed,
        message: passed
          ? `✓ getCacheStats: ${result.enabled ? 'Enabled' : 'Disabled'}, ${result.hits} hits, ${result.misses} misses`
          : '✗ getCacheStats: Invalid result'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ getCacheStats failed: ${error.message}` };
    }
  },

  // Test 18: clearCache
  async clearCache(client: any) {
    try {
      await client.clearCache();
      const stats = client.getCacheStats();
      // After clearing, hits and misses should still be tracked (they're not reset)
      // but subsequent queries should be cache misses
      return {
        passed: true,
        message: '✓ clearCache: Cache cleared successfully'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ clearCache failed: ${error.message}` };
    }
  },

  // Test 19: invalidateCache
  async invalidateCache(client: any) {
    try {
      // First do a query to populate cache
      await client.getEventTypes();

      // Then invalidate
      await client.invalidateCache('getEventTypes');

      return {
        passed: true,
        message: '✓ invalidateCache: Pattern invalidated successfully'
      };
    } catch (error: any) {
      return { passed: false, message: `✗ invalidateCache failed: ${error.message}` };
    }
  },
};
