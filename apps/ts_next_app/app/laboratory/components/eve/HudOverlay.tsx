'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { EveTheme, ProjectionMethod } from './lib/types';

interface HudOverlayProps {
  theme: EveTheme;
  pointCount: number;
  method: ProjectionMethod;
  dimensions: 2 | 3;
  visible: boolean;
  clusterCount?: number | null;
}

const cornerStyle = (
  theme: EveTheme,
  top?: boolean,
  left?: boolean,
): React.CSSProperties => ({
  position: 'absolute',
  width: 24,
  height: 24,
  ...(top ? { top: 8 } : { bottom: 8 }),
  ...(left ? { left: 8 } : { right: 8 }),
  borderColor: theme.primary,
  borderStyle: 'solid',
  borderWidth: 0,
  ...(top && left && { borderTopWidth: 2, borderLeftWidth: 2 }),
  ...(top && !left && { borderTopWidth: 2, borderRightWidth: 2 }),
  ...(!top && left && { borderBottomWidth: 2, borderLeftWidth: 2 }),
  ...(!top && !left && { borderBottomWidth: 2, borderRightWidth: 2 }),
  boxShadow: `0 0 6px ${theme.primary}40`,
  animation: 'evePulse 3s ease-in-out infinite',
});

export const HudOverlay: React.FC<HudOverlayProps> = ({
  theme,
  pointCount,
  method,
  dimensions,
  visible,
  clusterCount,
}) => {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        fontFamily: '"Share Tech Mono", "Courier New", monospace',
      }}
    >
      <style>{`
        @keyframes evePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes eveScanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      {/* Corner brackets */}
      <div style={cornerStyle(theme, true, true)} />
      <div style={cornerStyle(theme, true, false)} />
      <div style={cornerStyle(theme, false, true)} />
      <div style={cornerStyle(theme, false, false)} />

      {/* Title */}
      <Typography
        sx={{
          position: 'absolute',
          top: 16,
          left: 42,
          fontSize: '0.7rem',
          color: theme.primary,
          letterSpacing: 2,
          textShadow: `0 0 8px ${theme.primary}60`,
          opacity: 0.8,
        }}
      >
        EVE_v1.0
      </Typography>

      {/* Stats bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 42,
          display: 'flex',
          gap: 2,
          fontSize: '0.65rem',
          color: theme.primary,
          opacity: 0.7,
          letterSpacing: 1,
        }}
      >
        <span>POINTS: {pointCount}</span>
        <span>|</span>
        <span>METHOD: {method.toUpperCase()}</span>
        <span>|</span>
        <span>DIM: {dimensions}D</span>
        {clusterCount != null && (
          <>
            <span>|</span>
            <span>CLUSTERS: {clusterCount}</span>
          </>
        )}
      </Box>

      {/* Subtle scanline */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${theme.primary}05 2px,
            ${theme.primary}05 4px
          )`,
          opacity: 0.3,
        }}
      />
    </Box>
  );
};
