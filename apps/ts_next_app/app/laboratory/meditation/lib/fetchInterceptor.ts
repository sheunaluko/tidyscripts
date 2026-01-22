import { logCollector } from './logCollector';

/**
 * Fetch Interceptor
 *
 * Wraps window.fetch to capture ALL insights API requests/responses
 * including HTTP status, response bodies, errors, and timing.
 *
 * Only intercepts /api/insights/* calls, all other fetch calls pass through.
 */

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;

  window.fetch = async function(resource, config) {
    const url = typeof resource === 'string'
      ? resource
      : resource instanceof Request
        ? resource.url
        : resource.toString();

    // Only intercept insights API calls
    if (url.includes('/api/insights/')) {
      const startTime = Date.now();

      try {
        const response = await originalFetch.apply(this, [resource, config]);
        const responseClone = response.clone();
        const duration = Date.now() - startTime;

        try {
          const body = await responseClone.json();

          // Capture server logs if present
          if (body.server_logs && Array.isArray(body.server_logs)) {
            body.server_logs.forEach((serverLog: string) => {
              logCollector.log('SERVER', serverLog);
            });
          }

          // Create a summary of the response (not the full body)
          const responseSummary: any = {
            status: response.status,
            statusText: response.statusText,
            duration_ms: duration
          };

          // Add summary based on endpoint type
          if (url.includes('/batch')) {
            responseSummary.events_stored = body.events_stored;
            responseSummary.events_received = body.events_received;
            responseSummary.errors_count = body.errors?.length || 0;
          } else if (url.includes('/query')) {
            responseSummary.events_count = body.events?.length || 0;
            responseSummary.from_cache = body.from_cache || false;
          }

          // Log API call details with SUMMARY only (not full body)
          logCollector.addAPIResponse(
            url,
            {
              method: config?.method || 'GET',
              body: config?.body ? JSON.parse(config.body as string) : null,
              timestamp: new Date().toISOString()
            },
            responseSummary
          );

          logCollector.log('API', `${config?.method || 'GET'} ${url} → ${response.status} (${duration}ms)`);

          // Log batch-specific details
          if (url.includes('/batch')) {
            logCollector.log('API', `Batch: ${body.events_stored}/${body.events_received} events stored`);
            if (body.errors && body.errors.length > 0) {
              logCollector.log('ERROR', `Batch error count: ${body.errors.length}`);
            }
          }

          // Log query-specific details
          if (url.includes('/query')) {
            logCollector.log('API', `Query returned ${body.events?.length || 0} events${body.from_cache ? ' (cached)' : ''}`);
          }

        } catch (jsonError) {
          // Response is not JSON (rare for insights API)
          logCollector.log('API', `${config?.method || 'GET'} ${url} → ${response.status} (non-JSON response)`);
        }

        return response;

      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Capture network errors
        logCollector.addAPIResponse(
          url,
          {
            method: config?.method || 'GET',
            body: config?.body ? JSON.parse(config.body as string) : null,
            timestamp: new Date().toISOString()
          },
          {
            status: 0,
            statusText: 'Network Error',
            body: { error: error.message },
            duration_ms: duration
          }
        );

        logCollector.log('ERROR', `${config?.method || 'GET'} ${url} FAILED: ${error.message}`);

        throw error;
      }
    }

    // Non-insights API calls pass through unchanged
    return originalFetch.apply(this, [resource, config]);
  };

  console.log('[Meditation] Fetch interceptor installed');
}

/**
 * Restore original fetch
 * (useful for cleanup or testing)
 */
export function removeFetchInterceptor() {
  // Note: We don't store original reference globally,
  // so this is a placeholder for future enhancement
  console.log('[Meditation] Fetch interceptor removal not implemented');
}
