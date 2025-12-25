// Test History List - Display past test runs with load/delete options

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Delete,
  PlayArrow,
  DeleteSweep,
} from '@mui/icons-material';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';

const log = tsw.common.logger.get_logger({ id: 'TestHistoryList' });
const debug = tsw.common.util.debug;

export const TestHistoryList: React.FC = () => {
  const { testHistory, loadTestRun, deleteTestRun, saveTestHistory } = useRaiStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  log({ msg: 'Render', historyCount: testHistory.length });

  const handleLoad = (testRunId: string) => {
    debug.add('test_history_load_clicked', { testRunId });
    log({ msg: 'Loading test run from history', testRunId });
    loadTestRun(testRunId);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteId) {
      debug.add('test_history_delete_confirmed', { testRunId: confirmDeleteId });
      log({ msg: 'Deleting test run', testRunId: confirmDeleteId });
      deleteTestRun(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleClearAllConfirm = () => {
    debug.add('test_history_clear_all_confirmed', { count: testHistory.length });
    log({ msg: 'Clearing all test history', count: testHistory.length });
    // Clear by setting empty array and saving
    const { set } = useRaiStore.getState() as any;
    set({ testHistory: [] });
    saveTestHistory();
    setConfirmClearAll(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (testHistory.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No test history yet. Run a test to see it appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">Test History</Typography>
            <Typography variant="caption" color="text.secondary">
              {testHistory.length} test run{testHistory.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteSweep />}
            onClick={() => {
              setConfirmClearAll(true);
              log('Clear all history clicked');
            }}
          >
            Clear All
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <List>
          {testHistory.map((testRun, index) => {
            const successCount = testRun.results.filter(r => r.status === 'success').length;
            const errorCount = testRun.results.filter(r => r.status === 'error').length;

            return (
              <React.Fragment key={testRun.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: 2,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" fontWeight={500}>
                          {testRun.templateTitle}
                        </Typography>
                        <Chip
                          label={`${testRun.models.length} models`}
                          size="small"
                          variant="outlined"
                        />
                        {testRun.analysis && (
                          <Chip
                            label="Analyzed"
                            size="small"
                            color="info"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {formatDate(testRun.createdAt)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Input: {truncateText(testRun.inputText)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={`${successCount} success`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          {errorCount > 0 && (
                            <Chip
                              label={`${errorCount} error`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        edge="end"
                        onClick={() => handleLoad(testRun.id)}
                        color="primary"
                        title="Load this test"
                      >
                        <PlayArrow />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setConfirmDeleteId(testRun.id);
                          debug.add('delete_test_clicked', { testRunId: testRun.id });
                        }}
                        color="error"
                        title="Delete this test"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
      >
        <DialogTitle>Delete Test Run?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this test run? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog
        open={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
      >
        <DialogTitle>Clear All Test History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete all {testHistory.length} test runs? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearAll(false)}>Cancel</Button>
          <Button onClick={handleClearAllConfirm} color="error" variant="contained">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
