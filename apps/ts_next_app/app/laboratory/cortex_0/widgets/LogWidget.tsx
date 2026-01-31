'use client';

import React from 'react';
import { Box } from '@mui/material';
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
  const widget_scroll_styles = {
    overflowY: 'auto',
    maxHeight: '95%',
    scrollbarWidth: 'none',         // Firefox
    '&::-webkit-scrollbar': {
      display: 'none',              // Chrome, Safari
    }
  };

  return (
    <WidgetItem
      title="Log"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="log_display" sx={widget_scroll_styles}>
        {logHistory.map((log, index) => (
          <Box
            key={index}
            sx={{
              borderRadius: '8px',
              color: (log.indexOf('ERROR') > -1) ? 'error.light' : 'info.light',
            }}
          >
            {log}
          </Box>
        ))}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(LogWidget);
