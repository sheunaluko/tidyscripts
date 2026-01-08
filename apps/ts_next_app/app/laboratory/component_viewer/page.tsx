// Component Viewer Page

import { ComponentViewerClient } from './ComponentViewerClient';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function ComponentViewerPage() {
  return <ComponentViewerClient />;
}
