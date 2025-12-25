// Test Progress Tracker - Real-time progress display during test execution

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Schedule,
} from '@mui/icons-material';
import { ModelTestResult } from '../../types';

interface TestProgressTrackerProps {
  results: ModelTestResult[];
}

export const TestProgressTracker: React.FC<TestProgressTrackerProps> = ({ results }) => {
  const pendingCount = results.filter(r => r.status === 'pending').length;
  const runningCount = results.filter(r => r.status === 'running').length;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalCount = results.length;
  const completedCount = successCount + errorCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getStatusIcon = (status: ModelTestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Schedule color="disabled" />;
      case 'running':
        return <CircularProgress size={24} />;
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
    }
  };

  const getStatusColor = (status: ModelTestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'running':
        return 'info';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
    }
  };

  const formatDuration = (duration: number | null) => {
    if (duration === null) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Test Progress</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {runningCount > 0 && (
            <Chip
              label={`${runningCount} running`}
              color="info"
              size="small"
            />
          )}
          <Chip
            label={`${successCount}/${totalCount} complete`}
            color={successCount === totalCount ? 'success' : 'default'}
            size="small"
          />
          {errorCount > 0 && (
            <Chip
              label={`${errorCount} failed`}
              color="error"
              size="small"
            />
          )}
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 3, height: 8, borderRadius: 4 }}
      />

      <List>
        {results.map((result) => (
          <ListItem
            key={result.model}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              bgcolor: result.status === 'running' ? 'action.hover' : 'background.paper',
            }}
          >
            <ListItemIcon>
              {getStatusIcon(result.status)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" component="span">
                    {result.model}
                  </Typography>
                  <Chip
                    label={result.status}
                    color={getStatusColor(result.status) as any}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              }
              secondary={
                result.status === 'error' ? (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    Error: {result.error}
                  </Typography>
                ) : result.duration !== null ? (
                  <Typography variant="body2" color="text.secondary">
                    Duration: {formatDuration(result.duration)}
                  </Typography>
                ) : null
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
