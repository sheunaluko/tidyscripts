'use client';

import React from 'react';
import { Box, Chip, Typography, Divider, useTheme, CircularProgress } from '@mui/material';
import { ObjectInspector } from 'react-inspector';
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

  const widget_scroll_styles = {
    overflowY: 'auto',
    maxHeight: '95%',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    }
  };

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

  return (
    <WidgetItem
      title="Function Calls"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="function_calls_display" sx={widget_scroll_styles}>
        {calls.length === 0 ? (
          <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>
            No function calls yet
          </Box>
        ) : (
          calls.map((call, index) => (
            <Box
              key={call.callId}
              sx={{
                mb: 2,
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: call.status === 'error' ? 'error.dark' : 'background.paper'
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getStatusIcon(call.status)}
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
                <Chip
                  label={`#${index + 1}`}
                  size="small"
                  variant="outlined"
                />
                {call.duration !== undefined && (
                  <Chip
                    label={`${call.duration}ms`}
                    size="small"
                    color="success"
                  />
                )}
              </Box>

              {/* Timestamp */}
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                {formatTime(call.timestamp)}
              </Typography>

              {/* Parameters */}
              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                Parameters:
              </Typography>
              <Box sx={{ ml: 1, mt: 0.5 }}>
                <ObjectInspector
                  theme={theme.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
                  data={call.args[0] || {}}
                  expandLevel={1}
                />
              </Box>

              {/* Result */}
              {call.result !== undefined && !call.error && (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                    Result:
                  </Typography>
                  <Box sx={{ ml: 1, mt: 0.5 }}>
                    <ObjectInspector
                      theme={theme.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
                      data={call.result}
                      expandLevel={1}
                    />
                  </Box>
                </>
              )}

              {/* Error */}
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

              {index < calls.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))
        )}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(FunctionCallsWidget);
