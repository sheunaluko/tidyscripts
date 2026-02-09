'use client';
import dynamic from 'next/dynamic';
import { InsightsProvider } from '../rai/context/InsightsContext';

const App3 = dynamic(() => import('./app3'), { ssr: false });

export default function CortexPage() {
  return (
    <InsightsProvider appName="cortex_0" appVersion="3.1.0">
      <App3 />
    </InsightsProvider>
  );
}
