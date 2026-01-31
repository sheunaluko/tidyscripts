'use client';

import React, { useRef, useEffect } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

interface VADMonitorProps {
  speechProbRef: React.MutableRefObject<number>;
  threshold: number;
  minSpeechStartMs: number;
  paused?: boolean;
  width?: number;
  height?: number;
  historyLength?: number;
}

export const VADMonitor: React.FC<VADMonitorProps> = ({
  speechProbRef,
  threshold,
  minSpeechStartMs,
  paused = false,
  width = 300,
  height = 80,
  historyLength = 150, // ~3 seconds at 50fps
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const historyRef = useRef<number[]>([]);
  const currentValueRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (paused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lineColor = theme.palette.success.main;
    const thresholdColor = theme.palette.warning.main;
    const bgColor = theme.palette.background.paper;
    const gridColor = alpha(theme.palette.divider, 0.2);

    const render = () => {
      // Get current probability and add to history
      const prob = speechProbRef.current;
      currentValueRef.current = prob;
      historyRef.current.push(prob);

      // Keep history at fixed length
      while (historyRef.current.length > historyLength) {
        historyRef.current.shift();
      }

      // Clear canvas
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines (0.25, 0.5, 0.75)
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

      // Draw threshold line
      ctx.strokeStyle = thresholdColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const thresholdY = height - threshold * height;
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(width, thresholdY);
      ctx.stroke();

      // Draw probability line
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();

      const history = historyRef.current;
      const step = width / (historyLength - 1);

      history.forEach((value, i) => {
        const x = i * step;
        const y = height - value * height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw window start indicator line
      const totalTimeMs = 3000; // 3 seconds of history
      const msPerSample = totalTimeMs / historyLength;
      const windowSamples = Math.floor(minSpeechStartMs / msPerSample);

      // Find rightmost point above threshold
      let rightmostAboveIdx = -1;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] >= threshold) {
          rightmostAboveIdx = i;
          break;
        }
      }

      // Draw window start line if valid
      if (rightmostAboveIdx >= 0) {
        const windowStartIdx = rightmostAboveIdx - windowSamples;
        if (windowStartIdx >= 0) {
          const windowX = windowStartIdx * step;
          ctx.strokeStyle = theme.palette.info.main;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.beginPath();
          ctx.moveTo(windowX, 0);
          ctx.lineTo(windowX, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw current value indicator (filled circle at the end)
      if (history.length > 0) {
        const lastX = (history.length - 1) * step;
        const lastY = height - history[history.length - 1] * height;
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speechProbRef, threshold, minSpeechStartMs, paused, width, height, historyLength, theme]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Speech Probability
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 3,
                backgroundColor: theme.palette.warning.main,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Threshold: {threshold.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 3,
                backgroundColor: theme.palette.info.main,
                borderStyle: 'dashed',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Window: {minSpeechStartMs}ms
            </Typography>
          </Box>
        </Stack>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ display: 'block' }}
        />
      </Box>
      {paused && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}
        >
          Start listening to see VAD activity
        </Typography>
      )}
    </Box>
  );
};

export default VADMonitor;
