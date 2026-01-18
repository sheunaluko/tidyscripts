'use client';

import React from 'react';
import { Box } from '@mui/material';
import WidgetItem from '../WidgetItem';
import Code_Widget from '../CodeWidget';

interface CodeWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  codeParams: any;
  onChange: (params: any) => void;
}

const CodeWidget: React.FC<CodeWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  codeParams,
  onChange
}) => {
  return (
    <WidgetItem
      title="Code Display"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box
        id="code_display"
        sx={{
          overflowY: 'auto',
          height: '95%',
          scrollbarWidth: 'none',         // Firefox
          '&::-webkit-scrollbar': {
            display: 'none',              // Chrome, Safari
          }
        }}
      >
        <Code_Widget code_params={codeParams} onChange={onChange} />
      </Box>
    </WidgetItem>
  );
};

export default React.memo(CodeWidget);
