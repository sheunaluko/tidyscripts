'use client';

import React, { useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Button,
  Typography,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import TuneIcon from '@mui/icons-material/Tune';
import type { UseTiviReturn, TiviMode } from './lib';
import { useCalibration } from './lib/useCalibration';
import type { CalibrationPhase } from './lib/useCalibration';
import { Phase1Viz, Phase2Viz } from './CalibrationViz';

type VadParamKey = 'positiveSpeechThreshold' | 'negativeSpeechThreshold' | 'minSpeechStartMs' | 'verbose' | 'mode' | 'powerThreshold' | 'enableInterruption';

export interface CalibrationPanelRef {
  startCalibration: () => void;
}

export interface CalibrationPanelProps {
  tivi: UseTiviReturn;
  vadParams: {
    mode: TiviMode;
    enableInterruption: boolean;
    [key: string]: any;
  };
  updateVadParam: (key: VadParamKey, value: any) => void;
  onParametersAccepted?: (params: {
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    minSpeechStartMs: number;
    disableInterruption?: boolean;
  }) => void;
  onPhaseChange?: (phase: CalibrationPhase) => void;
  disabled?: boolean;
  showTrigger?: boolean;
}

export const CalibrationPanel = forwardRef<CalibrationPanelRef, CalibrationPanelProps>(({
  tivi,
  vadParams,
  updateVadParam,
  onParametersAccepted,
  onPhaseChange,
  disabled = false,
  showTrigger = true,
}, ref) => {
  const theme = useTheme();
  const calibration = useCalibration(tivi, vadParams, updateVadParam);
  const isCalibrating = calibration.phase !== 'idle';

  useImperativeHandle(ref, () => ({
    startCalibration: calibration.startCalibration,
  }), [calibration.startCalibration]);

  // Notify parent of phase changes
  useEffect(() => {
    onPhaseChange?.(calibration.phase);
  }, [calibration.phase, onPhaseChange]);

  // Wrap applyResults to also call onParametersAccepted
  const handleApply = useCallback(() => {
    calibration.applyResults();

    if (onParametersAccepted) {
      const params: Parameters<NonNullable<CalibrationPanelProps['onParametersAccepted']>>[0] = {
        positiveSpeechThreshold: calibration.phase1Results?.positiveSpeechThreshold ?? vadParams.positiveSpeechThreshold,
        negativeSpeechThreshold: calibration.phase1Results?.negativeSpeechThreshold ?? vadParams.negativeSpeechThreshold,
        minSpeechStartMs: calibration.phase2Results?.minSpeechStartMs ?? vadParams.minSpeechStartMs,
      };
      if (calibration.phase2Results?.recommendDisableInterruption) {
        params.disableInterruption = true;
      }
      onParametersAccepted(params);
    }
  }, [calibration, onParametersAccepted, vadParams]);

  // Idle: show button if showTrigger, otherwise render nothing
  if (!isCalibrating) {
    if (!showTrigger) return null;
    return (
      <Button
        variant="outlined"
        fullWidth
        startIcon={<TuneIcon />}
        onClick={calibration.startCalibration}
        disabled={disabled}
      >
        Calibrate
      </Button>
    );
  }

  // Active calibration flow
  return (
    <Box
      sx={{
        p: 2,
        background: alpha(theme.palette.background.paper, 0.8),
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
      }}
    >
      <Stack spacing={2}>
        {/* Phase 1: Collect speech */}
        {calibration.phase === 'phase1' && (
          <>
            <Typography variant="subtitle2" color="primary">
              Calibration — Step 1: Speech Profile
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wait a moment, then speak 1-2 full sentences naturally. Press Done when finished.
            </Typography>
            <Box display="flex" gap={2}>
              <Button variant="contained" onClick={calibration.finishPhase1} fullWidth>
                Done
              </Button>
              <Button variant="outlined" color="error" onClick={calibration.cancelCalibration}>
                Cancel
              </Button>
            </Box>
          </>
        )}

        {/* Phase 1 Summary */}
        {calibration.phase === 'phase1-summary' && calibration.phase1Results && (
          <>
            <Typography variant="subtitle2" color="primary">
              Calibration — Step 1 Results
            </Typography>
            {calibration.phase1Results.noSpeechDetected ? (
              <>
                <Alert severity="warning">
                  <Typography variant="body2">
                    No speech detected. Make sure to speak 1-2 full sentences before pressing Done.
                  </Typography>
                </Alert>
                <Box display="flex" gap={2}>
                  <Button variant="contained" onClick={calibration.startCalibration} fullWidth>
                    Try Again
                  </Button>
                  <Button variant="outlined" color="error" onClick={calibration.cancelCalibration}>
                    Cancel
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Phase1Viz results={calibration.phase1Results} />
                <Stack direction="row" spacing={2}>
                  <Chip
                    label={`Speech Threshold: ${calibration.phase1Results.positiveSpeechThreshold.toFixed(2)}`}
                    color="warning"
                    size="small"
                  />
                  <Chip
                    label={`Silence Threshold: ${calibration.phase1Results.negativeSpeechThreshold.toFixed(2)}`}
                    size="small"
                  />
                  <Chip
                    label={`Ambient Ceiling: ${calibration.phase1Results.ambientCeiling.toFixed(2)}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Box display="flex" gap={2}>
                  <Button variant="contained" onClick={calibration.startPhase2} fullWidth>
                    Next — Test TTS Echo
                  </Button>
                  <Button variant="outlined" color="error" onClick={calibration.cancelCalibration}>
                    Cancel
                  </Button>
                </Box>
              </>
            )}
          </>
        )}

        {/* Phase 2: TTS Leakage */}
        {calibration.phase === 'phase2' && (
          <>
            <Typography variant="subtitle2" color="primary">
              Calibration — Step 2: TTS Echo Test
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Playing test audio. Measuring echo cancellation quality...
            </Typography>
            <Box display="flex" gap={2}>
              <Button variant="outlined" color="error" onClick={calibration.cancelCalibration}>
                Cancel
              </Button>
            </Box>
          </>
        )}

        {/* Phase 2 Summary */}
        {calibration.phase === 'phase2-summary' && calibration.phase2Results && (
          <>
            <Typography variant="subtitle2" color="primary">
              Calibration — Step 2 Results
            </Typography>
            <Phase2Viz results={calibration.phase2Results} />
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                label={`Min Speech Start: ${calibration.phase2Results.minSpeechStartMs}ms`}
                color="info"
                size="small"
              />
              {calibration.phase2Results.spikes.length > 0 && (
                <Chip
                  label={`Max Leakage Spike: ${Math.round(calibration.phase2Results.maxSpikeDuration)}ms`}
                  color="error"
                  size="small"
                  variant="outlined"
                />
              )}
              {calibration.phase2Results.spikes.length === 0 && (
                <Chip
                  label="OK to apply"
                  color="success"
                  size="small"
                />
              )}
            </Stack>
            {calibration.phase2Results.recommendDisableInterruption && (
              <Alert severity="warning">
                <Typography variant="body2">
                  TTS leakage is significant (spikes &gt; 500ms). Recommend disabling voice interruption for best experience.
                </Typography>
              </Alert>
            )}
            <Box display="flex" gap={2}>
              <Button variant="contained" color="primary" onClick={handleApply} fullWidth>
                Apply Settings
              </Button>
              <Button variant="outlined" color="error" onClick={calibration.cancelCalibration}>
                Cancel
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
});

CalibrationPanel.displayName = 'CalibrationPanel';

export default CalibrationPanel;
