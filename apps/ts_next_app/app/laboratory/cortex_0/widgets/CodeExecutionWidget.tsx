'use client';

import React from 'react';
import { Box, Chip, useTheme } from '@mui/material';
import WidgetItem from '../WidgetItem';
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-kuroir";
import "ace-builds/src-noconflict/theme-solarized_dark";

interface CodeExecutionWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  currentCode?: string;
  executionId?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: string;
  duration?: number;
}

const CodeExecutionWidget: React.FC<CodeExecutionWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  currentCode = '',
  executionId = '',
  status = 'idle',
  error = '',
  duration = 0
}) => {
  const theme = useTheme();

  const widget_scroll_styles = {
    overflowY: 'auto',
    maxHeight: '95%',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'info';
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'running': return 'Running...';
      case 'success': return `Success (${duration}ms)`;
      case 'error': return 'Error';
      default: return 'Idle';
    }
  };

  return (
    <WidgetItem
      title="Code Execution"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="code_execution_display" sx={widget_scroll_styles}>
        {/* Status Badge */}
        <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
          />
          {executionId && (
            <Chip
              label={`ID: ${executionId.slice(-8)}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        {/* Code Display */}
        {currentCode ? (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <AceEditor
              mode="javascript"
              theme={theme.palette.mode === "dark" ? "solarized_dark" : "kuroir"}
              value={currentCode}
              readOnly={true}
              width="100%"
		height="400px"
		fontSize={16}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={false}
              setOptions={{
                  useWorker: false,
		  wrap : true,
                showLineNumbers: true,
                tabSize: 2,
              }}
            />
          </Box>
        ) : (
          <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>
            No code executing
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'error.dark',
              color: 'error.contrastText',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            {error}
          </Box>
        )}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(CodeExecutionWidget);
