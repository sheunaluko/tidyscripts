import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Button,
  Divider
} from '@mui/material';
import { VerificationReport as VerificationReportType, VerificationState } from '../types';

interface VerificationReportProps {
  report: VerificationReportType | null;
  verifying: boolean;
  verificationState: VerificationState;
  loading: boolean;
  onToggleInferred: (index: number) => void;
  onToggleMissing: (index: number) => void;
  onRegenerate: () => void;
}

export const VerificationReport: React.FC<VerificationReportProps> = ({
  report,
  verifying,
  verificationState,
  loading,
  onToggleInferred,
  onToggleMissing,
  onRegenerate
}) => {
  if (verifying) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
        <CircularProgress size={24} />
        <Typography variant='body1' color='text.secondary'>
          Generating verification report...
        </Typography>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant='body1' color='text.secondary'>
          No verification report available yet.
        </Typography>
      </Box>
    );
  }

  const hasSelections = verificationState.inferredToRemove.size > 0 || verificationState.missingToAdd.size > 0;

  return (
    <Box sx={{ p: 2 }}>
      {/* ORIGINAL Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant='h6' sx={{ color: '#2e7d32', fontWeight: 'bold', mb: 1 }}>
          ✓ ORIGINAL ({report.original.length})
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
          Clinical facts preserved from the original note
        </Typography>
        <Box sx={{ pl: 2 }}>
          {report.original.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
              None
            </Typography>
          ) : (
            report.original.map((item, i) => (
              <Typography key={i} variant='body2' sx={{ mb: 0.5, color: '#2e7d32' }}>
                • {item}
              </Typography>
            ))
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* TRANSFORMED Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant='h6' sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>
          ⟳ TRANSFORMED ({report.transformed.length})
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
          Clinical facts rephrased or restructured while preserving meaning
        </Typography>
        <Box sx={{ pl: 2 }}>
          {report.transformed.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
              None
            </Typography>
          ) : (
            report.transformed.map((item, i) => (
              <Typography key={i} variant='body2' sx={{ mb: 0.5, color: '#1976d2' }}>
                • {item}
              </Typography>
            ))
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* INFERRED Section with Checkboxes */}
      <Box sx={{ mb: 3 }}>
        <Typography variant='h6' sx={{ color: '#ed6c02', fontWeight: 'bold', mb: 1 }}>
          ⚠ INFERRED ({report.inferred.length})
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
          Information NOT explicitly in the original note - check items to remove
        </Typography>
        <Box sx={{ pl: 2 }}>
          {report.inferred.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
              None
            </Typography>
          ) : (
            report.inferred.map((item, i) => (
              <FormControlLabel
                key={i}
                control={
                  <Checkbox
                    checked={verificationState.inferredToRemove.has(i)}
                    onChange={() => onToggleInferred(i)}
                    size='small'
                    sx={{ color: '#ed6c02' }}
                  />
                }
                label={
                  <Typography variant='body2' sx={{ color: '#ed6c02' }}>
                    {item}
                  </Typography>
                }
                sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
              />
            ))
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* MISSING Section with Checkboxes */}
      <Box sx={{ mb: 3 }}>
        <Typography variant='h6' sx={{ color: '#d32f2f', fontWeight: 'bold', mb: 1 }}>
          ✗ MISSING ({report.missing.length})
        </Typography>
        <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
          Important information from original that was omitted - check items to add
        </Typography>
        <Box sx={{ pl: 2 }}>
          {report.missing.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
              None
            </Typography>
          ) : (
            report.missing.map((item, i) => (
              <FormControlLabel
                key={i}
                control={
                  <Checkbox
                    checked={verificationState.missingToAdd.has(i)}
                    onChange={() => onToggleMissing(i)}
                    size='small'
                    sx={{ color: '#d32f2f' }}
                  />
                }
                label={
                  <Typography variant='body2' sx={{ color: '#d32f2f' }}>
                    {item}
                  </Typography>
                }
                sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
              />
            ))
          )}
        </Box>
      </Box>

      {/* Regenerate Button */}
      {(report.inferred.length > 0 || report.missing.length > 0) && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant='contained'
            color='secondary'
            onClick={onRegenerate}
            disabled={!hasSelections || loading}
            size='large'
          >
            {loading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Regenerating...
              </>
            ) : (
              `Regenerate Summary (${verificationState.inferredToRemove.size + verificationState.missingToAdd.size} changes)`
            )}
          </Button>
          {!hasSelections && (
            <Typography variant='caption' color='text.secondary' sx={{ ml: 2 }}>
              Select items to remove or add before regenerating
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
