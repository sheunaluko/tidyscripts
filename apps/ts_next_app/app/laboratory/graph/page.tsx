'use client';

import dynamic from 'next/dynamic';

const GraphDemo = dynamic(() => import('./graph_demo'), {
  ssr: false,
  loading: () => <div>Loading graph...</div>
});

export default GraphDemo;