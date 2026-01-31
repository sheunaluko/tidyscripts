'use client';

import React from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { ObjectInspector } from 'react-inspector';
import WidgetItem from '../WidgetItem';

interface SandboxLog {
  level: 'log' | 'error' | 'warn' | 'info';
  args: any[];
  timestamp: number;
}

interface SandboxLogsWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  logs: SandboxLog[];
}

const SandboxLogsWidget: React.FC<SandboxLogsWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  logs = []
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return { bg: 'error.dark', text: 'error.contrastText', chip: 'error' };
      case 'warn': return { bg: 'warning.dark', text: 'warning.contrastText', chip: 'warning' };
      case 'info': return { bg: 'info.dark', text: 'info.contrastText', chip: 'info' };
      default: return { bg: 'grey.800', text: 'grey.100', chip: 'default' };
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

  const formatLogArg = (arg: any) => {
    // If it's a simple string or number, display directly
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }

    // For objects, use ObjectInspector
    return null;
  };

  return (
    <WidgetItem
      title="Sandbox Logs"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="sandbox_logs_display" sx={widget_scroll_styles}>
        {logs.length === 0 ? (
          <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>
            No logs yet
          </Box>
        ) : (
          logs.map((log, index) => {
            const colors = getLevelColor(log.level);

            return (
              <Box
                key={index}
                sx={{
                  mb: 1,
                  p: 1.5,
                  bgcolor: colors.bg,
                  color: colors.text,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip
                    label={log.level.toUpperCase()}
                    size="small"
                    color={colors.chip as any}
                    sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: 'inherit', opacity: 0.8 }}
                  >
                    {formatTime(log.timestamp)}
                  </Typography>
                </Box>

                {/* Log Arguments */}
                <Box sx={{ mt: 1 }}>
                  {log.args.map((arg, argIndex) => {
                    const simpleValue = formatLogArg(arg);

                    return (
                      <Box key={argIndex} sx={{ mb: argIndex < log.args.length - 1 ? 0.5 : 0 }}>
                        {simpleValue !== null ? (
                          <Typography
                            component="span"
                            sx={{
                              color: 'inherit',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}
                          >
                            {simpleValue}
                            {argIndex < log.args.length - 1 && ' '}
                          </Typography>
                        ) : (
                          <Box sx={{ mt: 0.5 }}>
                            <ObjectInspector
                              theme={theme.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
                              data={arg}
                              expandLevel={1}
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(SandboxLogsWidget);
