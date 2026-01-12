'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WidgetConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'chat', name: 'Chat', visible: true, order: 0 },
  { id: 'workspace', name: 'Workspace', visible: true, order: 1 },
  { id: 'thoughts', name: 'Thoughts', visible: true, order: 2 },
  { id: 'log', name: 'Log', visible: true, order: 3 },
  { id: 'code', name: 'Code', visible: true, order: 4 },
  { id: 'html', name: 'HTML', visible: true, order: 5 },
];

export function useWidgetConfig() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cortex_widget_config');
      return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
    }
    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cortex_widget_config', JSON.stringify(widgets));
    }
  }, [widgets]);

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => prev.map(w =>
      w.id === id ? { ...w, visible: !w.visible } : w
    ));
  }, []);

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return { widgets, visibleWidgets, toggleWidget };
}
