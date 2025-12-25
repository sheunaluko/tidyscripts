// Hash Router Hook - Manages URL hash routing lifecycle

import { useEffect } from 'react';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../store/useRaiStore';
import { getCurrentHash } from '../lib/router';

const log = tsw.common.logger.get_logger({ id: 'useHashRouter' });

/**
 * Hook to manage hash-based routing
 * - Listens for hash changes (back/forward buttons)
 * - Applies initial route on mount
 * - Prevents infinite loops between hash changes and state updates
 *
 * @example
 * function App() {
 *   useHashRouter(); // Initialize routing
 *   return <div>...</div>;
 * }
 */
export function useHashRouter() {
  const { applyRoute, setRoutingEnabled } = useRaiStore();

  useEffect(() => {
    log('Hash router initializing...');

    // Enable routing
    setRoutingEnabled(true);

    // Apply initial route from current hash
    const initialHash = getCurrentHash();
    log(`Initial hash: "${initialHash}"`);
    applyRoute(initialHash);

    // Listen for hash changes (back/forward buttons, manual hash changes)
    const handleHashChange = () => {
      const newHash = getCurrentHash();
      log(`Hash changed to: "${newHash}"`);
      applyRoute(newHash);
    };

    // Use 'popstate' event for browser back/forward
    window.addEventListener('popstate', handleHashChange);

    // Also listen to 'hashchange' for manual hash changes
    window.addEventListener('hashchange', handleHashChange);

    log('Hash router initialized');

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleHashChange);
      window.removeEventListener('hashchange', handleHashChange);
      setRoutingEnabled(false);
      log('Hash router cleaned up');
    };
  }, [applyRoute, setRoutingEnabled]);
}
