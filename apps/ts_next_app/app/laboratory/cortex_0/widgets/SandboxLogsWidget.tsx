'use client';

import React, { useRef, useEffect } from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { ObjectInspector } from 'react-inspector';
import { List } from 'react-window';
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
  const listRef = useRef<any>(null);

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
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }
    return null;
  };

  useEffect(() => {
    if (listRef.current && logs.length > 0) {
      listRef.current.scrollToRow({ index: logs.length - 1, align: 'end' });
    }
  }, [logs.length]);

  const SandboxLogRow = ({
    index,
    style,
    logs: logsData,
    getLevelColor: getColor,
    formatTime: formatTimeFn,
    formatLogArg: formatArg,
    theme: themeData
  }: {
    index: number;
    style: React.CSSProperties;
    logs: SandboxLog[];
    getLevelColor: (level: string) => any;
    formatTime: (timestamp: number) => string;
    formatLogArg: (arg: any) => string | null;
    theme: any;
  }) => {
    const log = logsData[index];
    const colors = getColor(log.level);

    return (
      <Box
        style={style}
        sx={{
          px: 1,
          py: 0.5
        }}
      >
        <Box
          sx={{
            p: 1.5,
            bgcolor: colors.bg,
            color: colors.text,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip
              label={log.level.toUpperCase()}
              size="small"
              color={colors.chip as any}
              sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }}
            />
            <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
              {formatTimeFn(log.timestamp)}
            </Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            {log.args.map((arg, argIndex) => {
              const simpleValue = formatArg(arg);
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
                        theme={themeData.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
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
      </Box>
    );
  };

  if (logs.length === 0) {
    return (
      <WidgetItem
        title="Sandbox Logs"
        fullscreen={fullscreen}
        onFocus={onFocus}
        onClose={onClose}
      >
        <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>
          No logs yet
        </Box>
      </WidgetItem>
    );
  }

  return (
    <WidgetItem
      title="Sandbox Logs"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="sandbox_logs_display">
        <List
          listRef={listRef}
          rowComponent={SandboxLogRow}
          rowCount={logs.length}
          rowHeight={100}
          rowProps={{ logs, getLevelColor, formatTime, formatLogArg, theme } as any}
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

export default React.memo(SandboxLogsWidget);
