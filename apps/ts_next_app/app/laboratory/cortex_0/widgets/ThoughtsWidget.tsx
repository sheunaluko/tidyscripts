'use client';

import React from 'react';
import { Box } from '@mui/material';
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
      title="Thoughts"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="thought_display" sx={widget_scroll_styles}>
        {thoughtHistory.map((thought, index) => (
          <Box
            key={index}
            sx={{
              borderRadius: '8px',
              color: 'success.light'
            }}
          >
            {thought}
          </Box>
        ))}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(ThoughtsWidget);
