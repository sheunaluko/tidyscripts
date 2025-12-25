// Result Analysis - AI-powered analysis of test results

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  Select,
  MenuItem,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  Science,
  Refresh,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { SUPPORTED_MODELS } from '../../constants';

const log = tsw.common.logger.get_logger({ id: 'ResultAnalysis' });
const debug = tsw.common.util.debug;

interface ResultAnalysisProps {
  testRunId: string;
}

export const ResultAnalysis: React.FC<ResultAnalysisProps> = ({ testRunId }) => {
  const {
    currentTestRun,
    analysisModel,
    isAnalyzing,
    setAnalysisModel,
    analyzeResults,
  } = useRaiStore();

  const [expanded, setExpanded] = React.useState(false);

  const testRun = currentTestRun?.id === testRunId ? currentTestRun : null;
  const hasResults = testRun && testRun.results.some(r => r.status === 'success');
  const hasAnalysis = testRun?.analysis !== null;

  // Auto-expand accordion when analysis is available (cached or newly generated)
  React.useEffect(() => {
    if (hasAnalysis && !isAnalyzing) {
      setExpanded(true);
    }
  }, [hasAnalysis, isAnalyzing]);

  log({
    msg: 'Render',
    testRunId,
    hasResults,
    hasAnalysis,
    isAnalyzing,
  });

  const handleAnalyze = async () => {
    debug.add('analysis_requested', { testRunId, analysisModel });
    log({ msg: 'Starting analysis', testRunId, model: analysisModel });
    setExpanded(true);
    await analyzeResults(testRunId);
  };

  const handleReanalyze = async () => {
    debug.add('reanalysis_requested', { testRunId, analysisModel });
    log({ msg: 'Reanalyzing results', testRunId, model: analysisModel });
    await analyzeResults(testRunId);
  };

  if (!hasResults) {
    return null;
  }

  return (
    <Paper sx={{ mb: 3 }}>
      <Accordion
        expanded={expanded}
        onChange={(_, isExpanded) => {
          setExpanded(isExpanded);
          debug.add('analysis_accordion_toggled', { expanded: isExpanded });
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Science color="primary" />
            <Typography variant="h6">Analyze Results</Typography>
            {hasAnalysis && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 2 }}>
                Analysis available
              </Typography>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Box>
            {/* Analysis Configuration */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                  Analysis Model
                </Typography>
                <Select
                  value={analysisModel}
                  onChange={(e) => {
                    setAnalysisModel(e.target.value);
                    debug.add('analysis_model_changed', { model: e.target.value });
                  }}
                  disabled={isAnalyzing}
                >
                  {SUPPORTED_MODELS.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!hasAnalysis ? (
                <Button
                  variant="contained"
                  startIcon={<Science />}
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  Analyze Results
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleReanalyze}
                  disabled={isAnalyzing}
                >
                  Re-analyze
                </Button>
              )}
            </Box>

            {/* Loading State */}
            {isAnalyzing && (
              <Box sx={{ mb: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Analyzing results with {analysisModel}...
                </Alert>
                <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} />
              </Box>
            )}

            {/* Analysis Content */}
            {hasAnalysis && !isAnalyzing && testRun.analysis && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Analyzed by {testRun.analysis.modelUsed} on{' '}
                    {testRun.analysis.timestamp.toLocaleString()}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 3,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    maxHeight: 600,
                    overflowY: 'auto',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    '& h1, & h2, & h3': {
                      mt: 2,
                      mb: 1,
                      fontWeight: 600,
                    },
                    '& h1': { fontSize: '1.5rem' },
                    '& h2': { fontSize: '1.25rem' },
                    '& h3': { fontSize: '1.1rem' },
                    '& ul, & ol': {
                      pl: 3,
                      mb: 2,
                    },
                    '& li': {
                      mb: 0.5,
                    },
                    '& p': {
                      mb: 2,
                    },
                    '& pre': {
                      bgcolor: 'action.hover',
                      p: 2,
                      borderRadius: 1,
                      overflowX: 'auto',
                      mb: 2,
                    },
                    '& code': {
                      bgcolor: 'action.hover',
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 0.5,
                      fontSize: '0.85em',
                    },
                    '& blockquote': {
                      borderLeft: 3,
                      borderColor: 'primary.main',
                      pl: 2,
                      ml: 0,
                      fontStyle: 'italic',
                      color: 'text.secondary',
                    },
                    '& table': {
                      width: '100%',
                      borderCollapse: 'collapse',
                      mb: 2,
                      fontSize: '0.875rem',
                    },
                    '& thead': {
                      bgcolor: 'action.hover',
                    },
                    '& th': {
                      textAlign: 'left',
                      p: 1.5,
                      fontWeight: 600,
                      borderBottom: 2,
                      borderColor: 'divider',
                    },
                    '& td': {
                      p: 1.5,
                      borderBottom: 1,
                      borderColor: 'divider',
                      verticalAlign: 'top',
                    },
                    '& tr:last-child td': {
                      borderBottom: 0,
                    },
                    '& tbody tr:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ReactMarkdown>{testRun.analysis.content}</ReactMarkdown>
                </Box>
              </Box>
            )}

            {/* Empty State */}
            {!hasAnalysis && !isAnalyzing && (
              <Alert severity="info">
                Click &quot;Analyze Results&quot; to get an AI-powered comparison of how each model performed.
                The analysis will include template syntax compliance, information extraction quality,
                and formatting assessment.
              </Alert>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};
