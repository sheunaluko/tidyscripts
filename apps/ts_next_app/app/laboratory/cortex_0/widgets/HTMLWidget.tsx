'use client';

import React from 'react';
import { Box } from '@mui/material';
import WidgetItem from '../WidgetItem';
import HTML_Widget from '../HTMLWidget';

interface HTMLWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  htmlDisplay: string;
}

const HTMLWidget: React.FC<HTMLWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  htmlDisplay
}) => {
  return (
    <WidgetItem
      title="HTML"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box
        id="html_display"
        sx={{
          overflowY: 'auto',
          height: '95%',
          scrollbarWidth: 'none',         // Firefox
          '&::-webkit-scrollbar': {
            display: 'none',              // Chrome, Safari
          }
        }}
      >
        <HTML_Widget to_display={htmlDisplay} />
      </Box>
    </WidgetItem>
  );
};

export default React.memo(HTMLWidget);
