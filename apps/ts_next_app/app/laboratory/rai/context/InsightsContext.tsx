/**
 * InsightsContext - Provides InsightsClient to RAI components
 */

import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import * as tsw from 'tidyscripts_web';

const { insights } = tsw.common;
const log = tsw.common.logger.get_logger({ id: 'rai_insights' });

interface InsightsContextValue {
  client: any | null;
  sessionId: string;
  isReady: boolean;
}

const InsightsContext = createContext<InsightsContextValue>({
  client: null,
  sessionId: '',
  isReady: false,
});

export function useInsights(): InsightsContextValue {
  return useContext(InsightsContext);
}

interface InsightsProviderProps {
  children: React.ReactNode;
  appName?: string;
  appVersion?: string;
}

export function InsightsProvider({
  children,
  appName = 'rai',
  appVersion = '2.0.0',
}: InsightsProviderProps): React.ReactElement {
  const clientRef = useRef<any>(null);
  const [sessionId, setSessionId] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Generate session ID
    const sid = insights.generateSessionId();
    setSessionId(sid);

    // Get user info from Firebase if available
    let userId = 'rai_user';
    try {
      if (typeof window !== 'undefined' && (window as any).getAuth) {
        const auth = (window as any).getAuth();
        if (auth?.currentUser) {
          const { uid, email, displayName } = auth.currentUser;
          userId = `${uid}|${email}|${displayName}`;
        }
      }
    } catch (e) {
      // No Firebase auth available
    }

    // Create InsightsClient
    clientRef.current = new insights.InsightsClient({
      app_name: appName,
      app_version: appVersion,
      user_id: userId,
      session_id: sid,
    });

    // Expose for debugging
    if (typeof window !== 'undefined') {
      (window as any).raiInsights = clientRef.current;
    }

    log(`InsightsClient initialized with session ${sid}`);
    setIsReady(true);

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.shutdown?.();
      }
    };
  }, [appName, appVersion]);

  const value: InsightsContextValue = {
    client: clientRef.current,
    sessionId,
    isReady,
  };

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
}

export default InsightsContext;
