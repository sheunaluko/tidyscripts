'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactGridLayout, { useContainerWidth, verticalCompactor } from 'react-grid-layout';
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
    chat: { i: 'chat', x: 0, y: 0, w: 6, h: 2, minW: 1, minH: 1 },
    chatInput: { i: 'chatInput', x: 0, y: 2, w: 6, h: 1, minW: 1, minH: 1 },
  log: { i: 'log', x: 0, y: 3, w: 6, h: 3, minW: 1, minH: 1 },
  html: { i: 'html', x: 0, y: 6, w: 6, h: 4, minW: 1, minH: 1 },

  // Right column - no gaps
  thoughts: { i: 'thoughts', x: 6, y: 0, w: 6, h: 4, minW: 1, minH: 1 },
  workspace: { i: 'workspace', x: 6, y: 4, w: 6, h: 2, minW: 1, minH: 1 },
  code: { i: 'code', x: 6, y: 6, w: 6, h: 4, minW: 1, minH: 1 },

  // New observability widgets - row below
  codeExecution: { i: 'codeExecution', x: 0, y: 10, w: 6, h: 4, minW: 1, minH: 1 },
  functionCalls: { i: 'functionCalls', x: 6, y: 10, w: 6, h: 4, minW: 1, minH: 1 },
  sandboxLogs: { i: 'sandboxLogs', x: 0, y: 14, w: 6, h: 3, minW: 1, minH: 1 },
  variableInspector: { i: 'variableInspector', x: 6, y: 14, w: 6, h: 3, minW: 1, minH: 1 },
  history: { i: 'history', x: 0, y: 17, w: 12, h: 4, minW: 1, minH: 1 },

};

export const DraggableWidgetGrid: React.FC<DraggableWidgetGridProps> = ({
  visibleWidgets,
  renderWidget,
  onLayoutChange,
  initialLayout
}) => {
  const { width, containerRef, mounted } = useContainerWidth();

  // Determine current breakpoint
  const breakpoint = useMemo(() => {
    if (width >= 1200) return 'lg';
    if (width >= 996) return 'md';
    return 'sm';
  }, [width]);

  // Determine columns based on breakpoint
  const cols = useMemo(() => {
    return 12; // All breakpoints use 12 cols in your config
  }, [breakpoint]);

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
        minW: 1,
        minH: 1
      }
    );
  });

  const handleLayoutChange = useCallback((currentLayout: any) => {
    const updatedLayout = currentLayout.map((item: any) => {
      // Preserve minW/minH from existing layout as callback doesn't include them
      const existingItem = layout.find(l => l.i === item.i);
      return {
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: existingItem?.minW ?? 1,
        minH: existingItem?.minH ?? 1
      };
    }) as WidgetGridConfig[];
    setLayout(updatedLayout);
    onLayoutChange(updatedLayout);
  }, [onLayoutChange, layout]);

  return (
    // @ts-ignore - useContainerWidth ref type mismatch, works at runtime
    <div ref={containerRef} style={{ width: '100%' }}>
      {mounted && (
        <ReactGridLayout
          className="widget-grid-layout"
          layout={layout}
          width={width}
          onLayoutChange={handleLayoutChange}
          gridConfig={{
            cols: cols,
            rowHeight: 60,
            margin: [16, 16],
            containerPadding: [20, 20],
            // @ts-ignore - preventCollision works at runtime, type definitions incomplete
            preventCollision: true
          }}
          dragConfig={{
            enabled: true,
            handle: '.widget-drag-handle'
          }}
          resizeConfig={{
            enabled: true
          }}
          compactor={verticalCompactor}
        >
          {visibleWidgets.map(widget => (
            <div key={widget.id} className="widget-grid-item">
              {renderWidget(widget.id)}
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
};
