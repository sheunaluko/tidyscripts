'use client';
import dynamic from 'next/dynamic';

const App = dynamic(() => import('./app3'), { ssr: false });

export default App; 
