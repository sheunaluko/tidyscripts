'use client';

import React, { useRef, useEffect } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import type { ProbSample, Phase1Results, Phase2Results, Spike } from './lib/useCalibration';

// -- Shared drawing helpers --

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, bgColor: string, gridColor: string) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Grid lines at 0.25, 0.5, 0.75
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  [0.25, 0.5, 0.75].forEach((v) => {
    const y = height - v * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawProbLine(ctx: CanvasRenderingContext2D, data: ProbSample[], width: number, height: number, color: string, timeStart: number, timeEnd: number) {
  if (data.length === 0) return;

  const duration = timeEnd - timeStart;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();

  data.forEach((sample, i) => {
    const x = ((sample.timestamp - timeStart) / duration) * width;
    const y = height - sample.prob * height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

function drawThresholdLine(ctx: CanvasRenderingContext2D, threshold: number, width: number, height: number, color: string, label?: string) {
  const y = height - threshold * height;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (label) {
    ctx.fillStyle = color;
    ctx.font = '11px monospace';
    ctx.fillText(label, 4, y - 4);
  }
}

// -- Phase 1 Visualization --

interface Phase1VizProps {
  results: Phase1Results;
  width?: number;
  height?: number;
}

export const Phase1Viz: React.FC<Phase1VizProps> = ({
  results,
  width = 600,
  height = 160,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || results.data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgColor = theme.palette.background.paper;
    const gridColor = alpha(theme.palette.divider, 0.2);
    const lineColor = theme.palette.success.main;
    const thresholdColor = theme.palette.warning.main;
    const speechColor = alpha(theme.palette.primary.main, 0.12);
    const ambientColor = alpha(theme.palette.grey[500], 0.08);

    const data = results.data;
    const timeStart = data[0].timestamp;
    const timeEnd = data[data.length - 1].timestamp;
    const duration = timeEnd - timeStart;

    // Background
    drawBackground(ctx, width, height, bgColor, gridColor);

    // Shade speech regions (above threshold) and ambient regions (below)
    const thresholdVal = results.positiveSpeechThreshold;
    let inSpeech = false;
    let regionStart = 0;

    for (let i = 0; i < data.length; i++) {
      const aboveThreshold = data[i].prob >= thresholdVal;

      if (aboveThreshold && !inSpeech) {
        inSpeech = true;
        regionStart = data[i].timestamp;
      } else if (!aboveThreshold && inSpeech) {
        inSpeech = false;
        const x1 = ((regionStart - timeStart) / duration) * width;
        const x2 = ((data[i].timestamp - timeStart) / duration) * width;
        ctx.fillStyle = speechColor;
        ctx.fillRect(x1, 0, x2 - x1, height);
      }
    }
    // Close open region
    if (inSpeech) {
      const x1 = ((regionStart - timeStart) / duration) * width;
      ctx.fillStyle = speechColor;
      ctx.fillRect(x1, 0, width - x1, height);
    }

    // Shade ambient ceiling region
    const ambientY = height - results.ambientCeiling * height;
    ctx.fillStyle = ambientColor;
    ctx.fillRect(0, ambientY, width, height - ambientY);

    // Probability line
    drawProbLine(ctx, data, width, height, lineColor, timeStart, timeEnd);

    // Threshold line
    drawThresholdLine(ctx, thresholdVal, width, height, thresholdColor, `threshold: ${thresholdVal.toFixed(2)}`);

    // Ambient ceiling indicator
    ctx.strokeStyle = alpha(theme.palette.grey[500], 0.5);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, ambientY);
    ctx.lineTo(width, ambientY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = '10px sans-serif';
    ctx.fillStyle = alpha(theme.palette.text.secondary, 0.7);
    ctx.fillText('ambient', 4, height - 4);
    ctx.fillText('speech', 4, 14);

  }, [results, width, height, theme]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Phase 1: Speech Profile
        </Typography>
        <Stack direction="row" spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 3, backgroundColor: theme.palette.warning.main }} />
            <Typography variant="caption" color="text.secondary">
              Threshold: {results.positiveSpeechThreshold.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 8, backgroundColor: alpha(theme.palette.primary.main, 0.2), borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Speech
            </Typography>
          </Box>
        </Stack>
      </Stack>
      <Box
        sx={{
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', width: '100%', height: 'auto' }} />
      </Box>
    </Box>
  );
};

// -- Phase 2 Visualization --

interface Phase2VizProps {
  results: Phase2Results;
  width?: number;
  height?: number;
}

export const Phase2Viz: React.FC<Phase2VizProps> = ({
  results,
  width = 600,
  height = 160,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || results.data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgColor = theme.palette.background.paper;
    const gridColor = alpha(theme.palette.divider, 0.2);
    const lineColor = theme.palette.success.main;
    const thresholdColor = theme.palette.warning.main;
    const spikeColor = alpha(theme.palette.error.main, 0.15);
    const spikeBorderColor = theme.palette.error.main;

    const data = results.data;
    const timeStart = data[0].timestamp;
    const timeEnd = data[data.length - 1].timestamp;
    const duration = timeEnd - timeStart;

    // Background
    drawBackground(ctx, width, height, bgColor, gridColor);

    // Highlight leakage spikes
    results.spikes.forEach((spike) => {
      const x1 = ((spike.startTime - timeStart) / duration) * width;
      const x2 = ((spike.endTime - timeStart) / duration) * width;
      const spikeWidth = Math.max(x2 - x1, 2);

      // Shaded region
      ctx.fillStyle = spikeColor;
      ctx.fillRect(x1, 0, spikeWidth, height);

      // Side borders
      ctx.strokeStyle = spikeBorderColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, height);
      ctx.moveTo(x1 + spikeWidth, 0);
      ctx.lineTo(x1 + spikeWidth, height);
      ctx.stroke();

      // Duration label
      const labelX = x1 + spikeWidth / 2;
      const label = `${Math.round(spike.duration)}ms`;
      ctx.font = '10px monospace';
      ctx.fillStyle = spikeBorderColor;
      ctx.textAlign = 'center';
      ctx.fillText(label, labelX, height - 6);
      ctx.textAlign = 'left';
    });

    // Probability line
    drawProbLine(ctx, data, width, height, lineColor, timeStart, timeEnd);

    // Threshold line
    drawThresholdLine(ctx, results.threshold, width, height, thresholdColor, `threshold: ${results.threshold.toFixed(2)}`);

    // minSpeechStartMs bracket indicator at bottom
    if (results.minSpeechStartMs > 0 && duration > 0) {
      const bracketWidth = (results.minSpeechStartMs / duration) * width;
      const bracketX = width - bracketWidth - 10;
      const bracketY = 14;

      ctx.strokeStyle = theme.palette.info.main;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(bracketX, bracketY);
      ctx.lineTo(bracketX + bracketWidth, bracketY);
      ctx.stroke();

      // Left tick
      ctx.beginPath();
      ctx.moveTo(bracketX, bracketY - 4);
      ctx.lineTo(bracketX, bracketY + 4);
      ctx.stroke();

      // Right tick
      ctx.beginPath();
      ctx.moveTo(bracketX + bracketWidth, bracketY - 4);
      ctx.lineTo(bracketX + bracketWidth, bracketY + 4);
      ctx.stroke();

      // Label
      ctx.fillStyle = theme.palette.info.main;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`minSpeechStart: ${results.minSpeechStartMs}ms`, bracketX + bracketWidth / 2, bracketY + 16);
      ctx.textAlign = 'left';
    }

  }, [results, width, height, theme]);

  const hasSpikes = results.spikes.length > 0;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Phase 2: TTS Leakage
        </Typography>
        <Stack direction="row" spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 3, backgroundColor: theme.palette.warning.main }} />
            <Typography variant="caption" color="text.secondary">
              Threshold
            </Typography>
          </Box>
          {hasSpikes && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 8, backgroundColor: alpha(theme.palette.error.main, 0.3), borderRadius: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Leakage ({results.spikes.length} spike{results.spikes.length !== 1 ? 's' : ''})
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
      <Box
        sx={{
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', width: '100%', height: 'auto' }} />
      </Box>
    </Box>
  );
};
