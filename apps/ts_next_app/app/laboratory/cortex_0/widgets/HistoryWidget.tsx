'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Chip, IconButton, Typography, useTheme, Tooltip, Card, CardContent, Collapse, Menu, MenuItem, ListItemIcon } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import CheckIcon from '@mui/icons-material/Check';
import WidgetItem from '../WidgetItem';
import { ExecutionSnapshot } from '../types/execution';

interface HistoryWidgetProps {
  fullscreen?: boolean;
  onFocus?: () => void;
  onClose?: () => void;
  executions: ExecutionSnapshot[];
  selectedIndex: number; // -1 means latest, >= 0 means specific index
  isPinned: boolean;
  onSelectExecution: (index: number) => void;
  onTogglePin: () => void;
}

const SIZE_PRESETS = [
  { label: 'Small', value: 100 },
  { label: 'Medium', value: 200 },
  { label: 'Large', value: 300 },
  { label: 'XL', value: 400 }
];

const HistoryWidget: React.FC<HistoryWidgetProps> = ({
  fullscreen = false,
  onFocus,
  onClose,
  executions,
  selectedIndex,
  isPinned,
  onSelectExecution,
  onTogglePin
}) => {
  const theme = useTheme();
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');

  // Load itemSize from localStorage on mount
  const [itemSize, setItemSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('historyWidget_itemSize');
      return saved ? parseInt(saved, 10) : 200;
    }
    return 200;
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sizeMenuAnchor, setSizeMenuAnchor] = useState<null | HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save itemSize to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('historyWidget_itemSize', itemSize.toString());
    }
  }, [itemSize]);

  const widget_scroll_styles = {
    overflowY: layout === 'vertical' ? 'auto' : 'hidden',
    overflowX: layout === 'horizontal' ? 'auto' : 'hidden',
    maxHeight: '100%',
    scrollbarWidth: 'thin',
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f1f1f1',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.mode === 'dark' ? '#555' : '#888',
      borderRadius: '4px',
    },
  };

  // Determine which execution is selected
  const getSelectedExecutionIndex = () => {
    if (executions.length === 0) return -1;
    if (selectedIndex === -1) return executions.length - 1;
    return Math.min(selectedIndex, executions.length - 1);
  };

  const isExecutionSelected = (index: number) => {
    return index === getSelectedExecutionIndex();
  };

  // Auto-scroll to selected item within widget only (don't scroll the page)
  useEffect(() => {
    if (scrollContainerRef.current && executions.length > 0) {
      const container = scrollContainerRef.current;
      const selectedIdx = getSelectedExecutionIndex();
      const selectedElement = container.children[selectedIdx] as HTMLElement;

      if (selectedElement) {
        // Manually scroll within the container to avoid scrolling the whole page
        if (layout === 'vertical') {
          const containerRect = container.getBoundingClientRect();
          const elementRect = selectedElement.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top + container.scrollTop;

          // Only scroll if element is not fully visible
          if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
            container.scrollTo({
              top: relativeTop - containerRect.height / 2 + elementRect.height / 2,
              behavior: 'smooth'
            });
          }
        } else {
          const containerRect = container.getBoundingClientRect();
          const elementRect = selectedElement.getBoundingClientRect();
          const relativeLeft = elementRect.left - containerRect.left + container.scrollLeft;

          // Only scroll if element is not fully visible
          if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
            container.scrollTo({
              left: relativeLeft - containerRect.width / 2 + elementRect.width / 2,
              behavior: 'smooth'
            });
          }
        }
      }
    }
  }, [selectedIndex, executions.length, layout]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const formatCode = (code: string, maxLines: number = 3) => {
    const lines = code.split('\n');
    if (lines.length <= maxLines) return code;
    return lines.slice(0, maxLines).join('\n') + '\n...';
  };

  const toggleExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSizeMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setSizeMenuAnchor(event.currentTarget);
  };

  const handleSizeMenuClose = () => {
    setSizeMenuAnchor(null);
  };

  const handleSizeSelect = (size: number) => {
    setItemSize(size);
    handleSizeMenuClose();
  };

  return (
    <WidgetItem
      title="Execution History"
      fullscreen={fullscreen}
      onFocus={onFocus}
      onClose={onClose}
      controls={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Size Preset Menu */}
          <Tooltip title="Card size">
            <IconButton size="small" onClick={handleSizeMenuClick}>
              <ViewComfyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={sizeMenuAnchor}
            open={Boolean(sizeMenuAnchor)}
            onClose={handleSizeMenuClose}
          >
            {SIZE_PRESETS.map((preset) => (
              <MenuItem
                key={preset.value}
                onClick={() => handleSizeSelect(preset.value)}
                selected={itemSize === preset.value}
              >
                <ListItemIcon>
                  {itemSize === preset.value && <CheckIcon fontSize="small" />}
                </ListItemIcon>
                {preset.label}
              </MenuItem>
            ))}
          </Menu>

          {/* Pin Toggle */}
          <Tooltip title={isPinned ? "Unpin (auto-advance to latest)" : "Pin to selected execution"}>
            <IconButton
              size="small"
              onClick={onTogglePin}
              sx={{ color: isPinned ? theme.palette.primary.main : theme.palette.text.secondary }}
            >
              {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Layout Toggle */}
          <Tooltip title={layout === 'vertical' ? "Switch to horizontal layout" : "Switch to vertical layout"}>
            <IconButton
              size="small"
              onClick={() => setLayout(layout === 'vertical' ? 'horizontal' : 'vertical')}
            >
              {layout === 'vertical' ? <ViewCarouselIcon fontSize="small" /> : <ViewColumnIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Execution List */}
        {executions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: theme.palette.text.secondary }}>
            <Typography variant="body2">No executions yet</Typography>
          </Box>
        ) : (
          <Box
            ref={scrollContainerRef}
            sx={{
              ...widget_scroll_styles,
              flex: 1,
              display: 'flex',
              flexDirection: layout === 'vertical' ? 'column' : 'row',
              gap: 1,
              p: 1,
            }}
          >
            {executions.map((execution, index) => {
              const isSelected = isExecutionSelected(index);
              const isExpanded = expandedId === execution.executionId;

              return (
                <Card
                  key={execution.executionId}
                  onClick={() => onSelectExecution(index)}
                  sx={{
                    minWidth: layout === 'horizontal' ? `${itemSize}px` : 'auto',
                    minHeight: layout === 'vertical' ? `${itemSize}px` : 'auto',
                    height: layout === 'vertical' ? (isExpanded ? 'auto' : `${itemSize}px`) : 'auto',
                    width: layout === 'horizontal' ? `${itemSize}px` : 'auto',
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                    backgroundColor: isSelected
                      ? theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.04)'
                      : theme.palette.background.paper,
                    boxShadow: isSelected ? theme.shadows[4] : theme.shadows[1],
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                      boxShadow: theme.shadows[3],
                    },
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{ p: 1.5, pb: '12px !important', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {execution.status === 'success' ? (
                          <CheckCircleIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />
                        ) : (
                          <ErrorIcon sx={{ fontSize: 18, color: theme.palette.error.main }} />
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          #{execution.executionId.slice(-8)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => toggleExpanded(execution.executionId, e)}
                        sx={{ p: 0.5 }}
                      >
                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </Box>

                    {/* Compact Info */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {formatTimestamp(execution.timestamp)}
                      </Typography>
                      <Chip
                        label={`${execution.duration}ms`}
                        size="small"
                        sx={{ width: 'fit-content', height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>

                    {/* Expanded Details */}
                    <Collapse in={isExpanded} timeout="auto">
                      <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                        {/* Code Preview */}
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 0.5 }}>
                          Code:
                        </Typography>
                        <Box
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                            p: 0.5,
                            borderRadius: 0.5,
                            mb: 1,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '100px',
                            overflow: 'auto',
                          }}
                        >
                          {formatCode(execution.code)}
                        </Box>

                        {/* Stats */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            label={`${execution.functionCalls.length} calls`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          <Chip
                            label={`${execution.variableAssignments.length} vars`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                          <Chip
                            label={`${execution.sandboxLogs.length} logs`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>

                        {/* Error Message */}
                        {execution.error && (
                          <Box
                            sx={{
                              mt: 1,
                              p: 0.5,
                              backgroundColor: theme.palette.error.main + '20',
                              borderRadius: 0.5,
                              borderLeft: `3px solid ${theme.palette.error.main}`,
                            }}
                          >
                            <Typography variant="caption" sx={{ color: theme.palette.error.main, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                              {execution.error}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </WidgetItem>
  );
};

export default React.memo(HistoryWidget);
