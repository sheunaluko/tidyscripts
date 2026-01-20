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

          // Log API call details
          logCollector.addAPIResponse(
            url,
            {
              method: config?.method || 'GET',
              body: config?.body ? JSON.parse(config.body as string) : null,
              timestamp: new Date().toISOString()
            },
            {
              status: response.status,
              statusText: response.statusText,
              body,
              duration_ms: duration
            }
          );

          logCollector.log('API', `${config?.method || 'GET'} ${url} → ${response.status} (${duration}ms)`);

          // Log batch-specific details
          if (url.includes('/batch')) {
            logCollector.log('API', `Batch: ${body.events_stored}/${body.events_received} events stored`);
            if (body.errors && body.errors.length > 0) {
              body.errors.forEach((err: string) => {
                logCollector.log('ERROR', `Batch error: ${err}`);
              });
            }
          }

          // Log query-specific details
          if (url.includes('/query')) {
            logCollector.log('API', `Query returned ${body.events?.length || 0} events`);
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
