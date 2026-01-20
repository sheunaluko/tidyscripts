import { logCollector } from './logCollector';

/**
 * Console Interceptor
 *
 * Monkey-patches console.log/error/warn to capture ALL console output
 * including InsightsClient internal logs that use console.log directly.
 *
 * This is installed BEFORE InsightsClient initialization to ensure
 * all logs are captured without modifying InsightsClient implementation.
 */

export function setupConsoleInterceptor() {
  if (typeof window === 'undefined') return;

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Intercept console.log
  console.log = function(...args: any[]) {
    // Always call original to preserve browser console output
    originalLog.apply(console, args);

    // Convert all arguments to string for capture
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');

    // Capture [insights]:: logs from InsightsClient
    if (message.includes('[insights]::')) {
      logCollector.log('INSIGHTS_INTERNAL', message.replace('[insights]::', '').trim());
    }
    // Capture [Meditation] logs
    else if (message.includes('[Meditation]')) {
      const cleanMsg = message.replace('[Meditation]', '').trim();
      logCollector.log('MEDITATION', cleanMsg);
    }
    // Capture other prefixed logs (format: [prefix]:: message)
    else if (message.match(/^\[[\w-]+\]::/)) {
      const matches = message.match(/^\[([\w-]+)\]::\s*(.+)$/);
      if (matches) {
        logCollector.log(matches[1].toUpperCase(), matches[2]);
      }
    }
    // Capture generic console logs (optional - can be noisy)
    else {
      // Uncomment if you want to capture ALL console.log calls:
      // logCollector.log('CONSOLE', message);
    }
  };

  // Intercept console.error
  console.error = function(...args: any[]) {
    originalError.apply(console, args);

    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');

    logCollector.log('ERROR', message);
  };

  // Intercept console.warn
  console.warn = function(...args: any[]) {
    originalWarn.apply(console, args);

    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
    ).join(' ');

    logCollector.log('WARN', message);
  };

  console.log('[Meditation] Console interceptor installed');
}

/**
 * Restore original console methods
 * (useful for cleanup or testing)
 */
export function removeConsoleInterceptor() {
  // Note: We don't store original references globally,
  // so this is a placeholder for future enhancement
  console.log('[Meditation] Console interceptor removal not implemented');
}
