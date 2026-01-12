'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Responsive, noCompactor } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export interface WidgetGridConfig {
  i: string; // widget id
  x: number;
  y: number;
  w: number; // width in grid units (out of 12)
  h: number; // height in grid units
  minW?: number;
  minH?: number;
}

interface DraggableWidgetGridProps {
  visibleWidgets: Array<{ id: string; name: string }>;
  renderWidget: (widgetId: string) => React.ReactNode;
  onLayoutChange: (layout: WidgetGridConfig[]) => void;
  initialLayout?: WidgetGridConfig[];
}

const DEFAULT_LAYOUT: { [key: string]: WidgetGridConfig } = {
  // Left column - no gaps
    chat: { i: 'chat', x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 },
    chatInput: { i: 'chatInput', x: 0, y: 2, w: 6, h: 1, minW: 4, minH: 1 },
  log: { i: 'log', x: 0, y: 3, w: 6, h: 3, minW: 4, minH: 2 },
  html: { i: 'html', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },    

  // Right column - no gaps
  thoughts: { i: 'thoughts', x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 2 },
  workspace: { i: 'workspace', x: 6, y: 4, w: 6, h: 2, minW: 4, minH: 3 },    
  code: { i: 'code', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },

};

export const DraggableWidgetGrid: React.FC<DraggableWidgetGridProps> = ({
  visibleWidgets,
  renderWidget,
  onLayoutChange,
  initialLayout
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  // Handle container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const [layout, setLayout] = useState<WidgetGridConfig[]>(() => {
    if (initialLayout && initialLayout.length > 0) {
      return initialLayout;
    }

    // Generate layout for visible widgets
    return visibleWidgets.map(widget =>
      DEFAULT_LAYOUT[widget.id] || {
        i: widget.id,
        x: 0,
        y: Infinity, // Put at bottom
        w: 6,
        h: 3,
        minW: 4,
        minH: 2
      }
    );
  });

  const handleLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
    const updatedLayout = currentLayout.map((item: any) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH
    })) as WidgetGridConfig[];
    setLayout(updatedLayout);
    onLayoutChange(updatedLayout);
  }, [onLayoutChange]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Responsive
        className="widget-grid-layout"
        layouts={{ lg: layout, md: layout, sm: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 12 }}
        width={width}
        onLayoutChange={handleLayoutChange}
        gridConfig={{
          cols: 12,
          rowHeight: 60,
          margin: [16, 16],
          containerPadding: [20, 20]
        }}
        dragConfig={{
          enabled: true,
          handle: '.widget-drag-handle'
        }}
        resizeConfig={{
          enabled: true
        }}
        compactor={noCompactor}
      >
        {visibleWidgets.map(widget => (
          <div key={widget.id} className="widget-grid-item">
            {renderWidget(widget.id)}
          </div>
        ))}
      </Responsive>
    </div>
  );
};
