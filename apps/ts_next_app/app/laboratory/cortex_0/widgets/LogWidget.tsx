'use client';

import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { List } from 'react-window';
import WidgetItem from '../WidgetItem';

interface LogWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  logHistory: string[];
}

const LogWidget: React.FC<LogWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  logHistory
}) => {
  const listRef = useRef<any>(null);

  useEffect(() => {
    if (listRef.current && logHistory.length > 0) {
      listRef.current.scrollToRow({ index: logHistory.length - 1, align: 'end' });
    }
  }, [logHistory.length]);

  const LogRow = ({ index, style, logs }: { index: number; style: React.CSSProperties; logs: string[] }) => {
    const log = logs[index];
    return (
      <Box
        style={style}
        sx={{
          borderRadius: '8px',
          color: (log.indexOf('ERROR') > -1) ? 'error.light' : 'info.light',
          px: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'flex-start',
          wordBreak: 'break-word',
          overflow: 'hidden'
        }}
      >
        {log}
      </Box>
    );
  };

  return (
    <WidgetItem
      title="Log"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="log_display">
        <List
          listRef={listRef}
          rowComponent={LogRow}
          rowCount={logHistory.length}
          rowHeight={40}
          rowProps={{ logs: logHistory } as any}
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

export default React.memo(LogWidget);
