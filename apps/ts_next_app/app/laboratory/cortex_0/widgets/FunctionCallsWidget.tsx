'use client';

import React, { useRef, useEffect } from 'react';
import { Box, Chip, Typography, Divider, useTheme, CircularProgress } from '@mui/material';
import { ObjectInspector } from 'react-inspector';
import { List, useDynamicRowHeight } from 'react-window';
import WidgetItem from '../WidgetItem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface FunctionCallEvent {
  name: string;
  args: any[];
  result?: any;
  duration?: number;
  error?: string;
  timestamp: number;
  callId: string;
  status?: 'running' | 'success' | 'error';
}

interface FunctionCallsWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  calls: FunctionCallEvent[];
}

const FunctionCallsWidget: React.FC<FunctionCallsWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  calls = []
}) => {
  const theme = useTheme();
  const listRef = useRef<any>(null);

  // Use dynamic row heights since function calls vary in size
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 200,
    key: calls.length // Reset heights when calls change
  });

  useEffect(() => {
    if (listRef.current && calls.length > 0) {
      listRef.current.scrollToRow({ index: calls.length - 1, align: 'end' });
    }
  }, [calls.length]);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <CircularProgress size={16} />;
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const FunctionCallRow = ({
    index,
    style,
    calls: callsData,
    getStatusIcon: getIconFn,
    formatTime: formatTimeFn,
    theme: themeData
  }: {
    index: number;
    style: React.CSSProperties;
    calls: FunctionCallEvent[];
    getStatusIcon: (status?: string) => React.ReactNode;
    formatTime: (timestamp: number) => string;
    theme: any;
  }) => {
    const call = callsData[index];

    return (
      <Box
        style={style}
        sx={{
          px: 1,
          py: 1
        }}
      >
        <Box
          sx={{
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: call.status === 'error' ? 'error.dark' : 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {getIconFn(call.status)}
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: call.status === 'error' ? 'error.contrastText' : 'primary.main'
              }}
            >
              {call.name}
            </Typography>
            <Chip label={`#${index + 1}`} size="small" variant="outlined" />
            {call.duration !== undefined && (
              <Chip label={`${call.duration}ms`} size="small" color="success" />
            )}
          </Box>

          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
            {formatTimeFn(call.timestamp)}
          </Typography>

          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
            Parameters:
          </Typography>
          <Box sx={{ ml: 1, mt: 0.5 }}>
            <ObjectInspector
              theme={themeData.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
              data={call.args[0] || {}}
              expandLevel={1}
            />
          </Box>

          {call.result !== undefined && !call.error && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                Result:
              </Typography>
              <Box sx={{ ml: 1, mt: 0.5 }}>
                <ObjectInspector
                  theme={themeData.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
                  data={call.result}
                  expandLevel={1}
                />
              </Box>
            </>
          )}

          {call.error && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1, color: 'error.contrastText' }}>
                Error:
              </Typography>
              <Box
                sx={{
                  ml: 1,
                  mt: 0.5,
                  p: 1,
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}
              >
                {call.error}
              </Box>
            </>
          )}
        </Box>
      </Box>
    );
  };

  if (calls.length === 0) {
    return (
      <WidgetItem
        title="Function Calls"
        fullscreen={fullscreen}
        onFocus={onFocus}
        onClose={onClose}
      >
        <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>
          No function calls yet
        </Box>
      </WidgetItem>
    );
  }

  return (
    <WidgetItem
      title="Function Calls"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="function_calls_display">
        <List
          listRef={listRef}
          rowComponent={FunctionCallRow}
          rowCount={calls.length}
          rowHeight={rowHeight}
          rowProps={{ calls, getStatusIcon, formatTime, theme } as any}
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

export default React.memo(FunctionCallsWidget);
