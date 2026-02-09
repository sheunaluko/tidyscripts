/**
 * Auth Check — detects logged-out state when cloud storage mode is active
 *
 * Cortex-specific version. When a user was previously logged in with cloud
 * storage and then logs out (or session expires), surreal_query sends
 * unauthenticated requests that return empty results rather than errors.
 * This module detects that state and notifies the user with actionable options.
 */

import { getCortexStore } from './storage';
import { toast_toast } from '../../../../components/Toast';

declare var window: any;

// ─── Login helper (popup, no redirect) ──────────────────────────────

/**
 * Trigger Google sign-in popup directly from the current page.
 * On success, reloads Cortex data from cloud so the UI updates in place.
 * Falls back to redirect if popup fails (e.g. blocked by browser).
 */
async function signInAndReload(
  emitFn?: (type: string, payload: Record<string, any>) => void,
): Promise<void> {
  try {
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);

    if (emitFn) emitFn('cloud_auth_action', { action: 'logged_in_via_popup' });

    // Reload cloud data now that we're authenticated
    if (window.__cortex_0__?.dispatch) {
      await window.__cortex_0__.dispatch('loadSettings');
      await window.__cortex_0__.dispatch('loadConversation');
    }

    toast_toast({
      title: 'Signed in successfully',
      description: 'Cloud data loaded',
      status: 'success',
      duration: 3000,
    });
  } catch (err: any) {
    // Popup blocked or failed — fall back to redirect
    if (emitFn) emitFn('cloud_auth_action', { action: 'login_popup_failed', error: err?.message });
    window.location.href = '/laboratory/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.hash);
  }
}

// ─── Auth checks ────────────────────────────────────────────────────

/**
 * Check if Firebase currentUser exists (synchronous — may be false at page load).
 */
export function isFirebaseAuthenticated(): boolean {
  try {
    if (typeof window !== 'undefined' && (window as any).getAuth) {
      const auth = (window as any).getAuth();
      return !!auth?.currentUser;
    }
  } catch {
    // No Firebase auth available
  }
  return false;
}

/**
 * Wait for Firebase Auth to resolve its persisted auth state.
 * On page load, `getAuth().currentUser` is null until the SDK loads the
 * auth token from IndexedDB (~300-800ms). This function listens for
 * `onAuthStateChanged` with a timeout so callers can wait before
 * making authenticated cloud requests.
 *
 * Returns true if a user was found, false otherwise.
 */
export function waitForFirebaseAuth(timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !(window as any).getAuth) {
      resolve(false);
      return;
    }
    const auth = (window as any).getAuth();
    // If already resolved, return immediately
    if (auth?.currentUser) {
      resolve(true);
      return;
    }
    // Listen for auth state change
    let settled = false;
    const unsubscribe = auth?.onAuthStateChanged?.((user: any) => {
      if (!settled) {
        settled = true;
        unsubscribe?.();
        clearTimeout(timer);
        resolve(!!user);
      }
    });
    // Timeout fallback — user is genuinely logged out
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsubscribe?.();
        resolve(false);
      }
    }, timeoutMs);
    // If onAuthStateChanged wasn't available, resolve immediately
    if (!unsubscribe) {
      settled = true;
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Combined check: is the app in cloud mode but lacking authentication?
 */
export function checkCloudAuth(): {
  isCloudMode: boolean;
  isAuthenticated: boolean;
  needsAttention: boolean;
} {
  const store = getCortexStore();
  const isCloudMode = store.getMode() === 'cloud';
  const isAuthenticated = isFirebaseAuthenticated();
  return {
    isCloudMode,
    isAuthenticated,
    needsAttention: isCloudMode && !isAuthenticated,
  };
}

// ─── Shared toast buttons ───────────────────────────────────────────

/**
 * Returns the 3 action buttons used in all auth toasts:
 * LOG IN (popup), USE LOCAL, Dismiss
 */
function authToastButtons(
  emitFn: ((type: string, payload: Record<string, any>) => void) | undefined,
  onClose: () => void,
) {
  const React = require('react');
  return [
    React.createElement('button', {
      key: 'login',
      onClick: () => {
        onClose();
        if (typeof window !== 'undefined' && window.openLoginModal) {
          window.openLoginModal();
        } else {
          signInAndReload(emitFn);
        }
      },
      style: {
        background: '#4299E1',
        color: 'white',
        border: 'none',
        padding: '6px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
      },
    }, 'LOG IN'),
    React.createElement('button', {
      key: 'local',
      onClick: () => {
        if (typeof window !== 'undefined' && window.__cortex_0__?.dispatch) {
          window.__cortex_0__.dispatch('switchStorageMode', 'local');
        }
        if (emitFn) {
          emitFn('cloud_auth_action', { action: 'switch_to_local' });
        }
        onClose();
      },
      style: {
        background: '#48BB78',
        color: 'white',
        border: 'none',
        padding: '6px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
      },
    }, 'USE LOCAL'),
    React.createElement('button', {
      key: 'dismiss',
      onClick: () => {
        if (emitFn) {
          emitFn('cloud_auth_action', { action: 'dismissed' });
        }
        onClose();
      },
      style: {
        background: 'transparent',
        color: '#A0AEC0',
        border: '1px solid #4A5568',
        padding: '6px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
      },
    }, 'Dismiss'),
  ];
}

// ─── Debounced toast notification ───────────────────────────────────

let _lastNotifyTime = 0;
const DEBOUNCE_MS = 30_000; // 30 seconds

/**
 * Show a warning toast when cloud mode is active but user is not authenticated.
 * Debounced to avoid spamming the user.
 *
 * Returns true if the toast was shown, false if debounced.
 */
export function notifyCloudAuthRequired(
  context: string,
  emitFn?: (type: string, payload: Record<string, any>) => void,
): boolean {
  const now = Date.now();
  if (now - _lastNotifyTime < DEBOUNCE_MS) {
    return false;
  }
  _lastNotifyTime = now;

  // Emit telemetry
  if (emitFn) {
    emitFn('cloud_auth_required', { context });
  }

  const React = require('react');

  toast_toast({
    status: 'warning',
    duration: 15000,
    isClosable: true,
    render: ({ onClose }: { onClose: () => void }) => {
      return React.createElement('div', {
        style: {
          background: '#2D3748',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          maxWidth: '420px',
        },
      },
        React.createElement('div', {
          style: { fontWeight: 600, marginBottom: '8px', fontSize: '15px' },
        }, 'Welcome to Cortex'),
        React.createElement('div', {
          style: { marginBottom: '12px', fontSize: '14px', lineHeight: '1.5' },
        },
          'Log in to sync your conversations and settings across devices, or switch to local storage to use Cortex without an account.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: '8px' } },
          ...authToastButtons(emitFn, onClose),
        ),
      );
    },
  } as any);

  return true;
}
