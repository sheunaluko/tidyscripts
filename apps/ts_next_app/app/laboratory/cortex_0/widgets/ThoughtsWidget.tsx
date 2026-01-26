'use client';

import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { List, useDynamicRowHeight } from 'react-window';
import WidgetItem from '../WidgetItem';

interface ThoughtsWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  thoughtHistory: string[];
}

const ThoughtsWidget: React.FC<ThoughtsWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  thoughtHistory
}) => {
  const listRef = useRef<any>(null);

  // Use dynamic row heights since thoughts vary in length
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 45,
    key: thoughtHistory.length
  });

  useEffect(() => {
    if (listRef.current && thoughtHistory.length > 0) {
      listRef.current.scrollToRow({ index: thoughtHistory.length - 1, align: 'end' });
    }
  }, [thoughtHistory.length]);

  const ThoughtRow = ({ index, style, thoughts }: { index: number; style: React.CSSProperties; thoughts: string[] }) => {
    const thought = thoughts[index];
    return (
      <Box
        style={style}
        sx={{
          borderRadius: '8px',
          color: 'success.light',
          px: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'flex-start',
          overflow: 'hidden'
        }}
      >
        <Box component="span" sx={{ mr: 0.5, flexShrink: 0 }}>🧠</Box>
        <Box component="span" sx={{ wordBreak: 'break-word' }}>{thought}</Box>
      </Box>
    );
  };

  return (
    <WidgetItem
      title="Thoughts"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="thought_display">
        <List
          listRef={listRef}
          rowComponent={ThoughtRow}
          rowCount={thoughtHistory.length}
          rowHeight={rowHeight}
          rowProps={{ thoughts: thoughtHistory } as any}
          style={{
            height: fullscreen ? window.innerHeight - 150 : 280,
            width: '100%',
            scrollbarWidth: 'none'
          }}
        />
      </Box>
    </WidgetItem>
  );
};

export default React.memo(ThoughtsWidget);
