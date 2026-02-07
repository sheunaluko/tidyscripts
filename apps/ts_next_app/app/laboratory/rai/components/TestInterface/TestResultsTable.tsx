// Test Results Table - Display test results in table format with expandable rows

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  ContentCopy,
  CheckCircle,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import * as tsw from 'tidyscripts_web';
import { ModelTestResult } from '../../types';
import { useRaiStore } from '../../store/useRaiStore';

const log = tsw.common.logger.get_logger({ id: 'TestResultsTable' });
const debug = tsw.common.util.debug;

interface TestResultsTableProps {
  results: ModelTestResult[];
}

export const TestResultsTable: React.FC<TestResultsTableProps> = ({ results }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [copiedModel, setCopiedModel] = useState<string>('');
  const { copyToClipboard } = useRaiStore();

  log({ msg: 'Render', resultsCount: results.length });

  const toggleRow = (model: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(model)) {
      newExpanded.delete(model);
      debug.add('result_row_collapsed', { model });
    } else {
      newExpanded.add(model);
      debug.add('result_row_expanded', { model });
    }
    setExpandedRows(newExpanded);
  };

  const handleCopy = async (model: string, note: string) => {
    const success = await copyToClipboard(note);
    if (success) {
      setCopiedModel(model);
      setSnackbarOpen(true);
      debug.add('note_copied', { model, length: note.length });
      log({ msg: 'Note copied to clipboard', model });
    } else {
      log({ msg: 'Copy failed', model });
    }
  };

  const getStatusChip = (status: ModelTestResult['status'], isCached?: boolean) => {
    if (isCached) {
      return <Chip label="Cached" color="info" size="small" />;
    }

    switch (status) {
      case 'success':
        return <Chip label="Success" color="success" size="small" />;
      case 'error':
        return <Chip label="Error" color="error" size="small" />;
      case 'running':
        return <Chip label="Running" color="info" size="small" />;
      case 'pending':
        return <Chip label="Pending" color="default" size="small" />;
    }
  };

  const formatDuration = (duration: number | null) => {
    if (duration === null) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const successfulResults = results.filter(r => r.status === 'success');
  const errorResults = results.filter(r => r.status === 'error');

  log({
    msg: 'Results summary',
    total: results.length,
    success: successfulResults.length,
    errors: errorResults.length,
  });

  if (results.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No results yet. Run a test to see results here.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Test Results</Typography>
          <Typography variant="body2" color="text.secondary">
            {successfulResults.length} successful, {errorResults.length} failed
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result) => {
                const isExpanded = expandedRows.has(result.model);
                const canExpand = result.status === 'success' && result.note;

                return (
                  <React.Fragment key={result.model}>
                    <TableRow
                      hover
                      sx={{ cursor: canExpand ? 'pointer' : 'default' }}
                      onClick={() => canExpand && toggleRow(result.model)}
                    >
                      <TableCell>
                        {canExpand && (
                          <IconButton size="small">
                            {isExpanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {result.model}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(result.status)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {formatDuration(result.duration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {result.status === 'success' && result.note && (
                          <Button
                            size="small"
                            startIcon={<ContentCopy />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(result.model, result.note!);
                            }}
                          >
                            Copy
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expandable row for note content */}
                    {canExpand && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, borderBottom: isExpanded ? 1 : 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 3, bgcolor: 'background.default' }}>
                              <Box
                                sx={{
                                  p: 3,
                                  bgcolor: 'background.paper',
                                  borderRadius: 1,
                                  border: 1,
                                  borderColor: 'divider',
                                  maxHeight: 600,
                                  overflowY: 'auto',
                                  fontFamily: 'monospace',
                                  fontSize: '0.875rem',
                                  lineHeight: 1.6,
                                  '& pre': {
                                    bgcolor: 'action.hover',
                                    p: 2,
                                    borderRadius: 1,
                                    overflowX: 'auto',
                                  },
                                  '& code': {
                                    bgcolor: 'action.hover',
                                    px: 0.5,
                                    borderRadius: 0.5,
                                  },
                                }}
                              >
                                <ReactMarkdown>{result.note || ''}</ReactMarkdown>
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Error message row */}
                    {result.status === 'error' && result.error && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, borderBottom: 0 }}>
                          <Box sx={{ p: 2, bgcolor: 'error.lighter' }}>
                            <Typography variant="body2" color="error">
                              <strong>Error:</strong> {result.error}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Copy success snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          icon={<CheckCircle />}
          sx={{ width: '100%' }}
        >
          Note copied from {copiedModel}
        </Alert>
      </Snackbar>
    </>
  );
};
