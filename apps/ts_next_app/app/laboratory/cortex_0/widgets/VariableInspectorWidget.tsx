'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import { ObjectInspector } from 'react-inspector';
import WidgetItem from '../WidgetItem';

interface VariableAssignment {
  name: string;
  value: any;
  timestamp: number;
}

interface VariableInspectorWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  variables: VariableAssignment[];
}

const VariableInspectorWidget: React.FC<VariableInspectorWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  variables = []
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

  // Group by variable name and keep track of changes
  const groupedVariables = useMemo(() => {
    const grouped = new Map<string, VariableAssignment[]>();

    variables.forEach(v => {
      if (!grouped.has(v.name)) {
        grouped.set(v.name, []);
      }
      grouped.get(v.name)!.push(v);
    });

    // Sort each group by timestamp
    grouped.forEach((assignments, name) => {
      assignments.sort((a, b) => a.timestamp - b.timestamp);
    });

    return grouped;
  }, [variables]);

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

  const getValueType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  return (
    <WidgetItem
      title="Variable Inspector"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
    >
      <Box id="variable_inspector_display" sx={widget_scroll_styles}>
        {groupedVariables.size === 0 ? (
          <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>
            No variables assigned yet
          </Box>
        ) : (
          Array.from(groupedVariables.entries()).map(([varName, assignments]) => {
            const latest = assignments[assignments.length - 1];
            const hasHistory = assignments.length > 1;

            return (
              <Box
                key={varName}
                sx={{
                  mb: 2,
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }}
              >
                {/* Variable Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      color: 'primary.main'
                    }}
                  >
                    {varName}
                  </Typography>
                  <Chip
                    label={getValueType(latest.value)}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                  {hasHistory && (
                    <Chip
                      label={`${assignments.length} changes`}
                      size="small"
                      color="info"
                    />
                  )}
                </Box>

                {/* Current Value */}
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                  Current Value:
                </Typography>
                <Box sx={{ ml: 1, mt: 0.5, mb: 1 }}>
                  <ObjectInspector
                    theme={theme.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
                    data={latest.value}
                    expandLevel={2}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic' }}
                >
                  Last updated: {formatTime(latest.timestamp)}
                </Typography>

                {/* History */}
                {hasHistory && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                      History:
                    </Typography>
                    {assignments.slice(0, -1).reverse().map((assignment, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          ml: 2,
                          mb: 1,
                          p: 1,
                          bgcolor: 'action.hover',
                          borderRadius: 0.5,
                          fontSize: '0.75rem'
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}
                        >
                          {formatTime(assignment.timestamp)}
                        </Typography>
                        <ObjectInspector
                          theme={theme.palette.mode === "dark" ? "chromeDark" : "chromeLight"}
                          data={assignment.value}
                          expandLevel={1}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(VariableInspectorWidget);
