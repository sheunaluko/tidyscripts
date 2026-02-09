'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import type { EvePoint, EveTheme } from './lib/types';

interface TooltipProps {
  point: EvePoint | null;
  cursorPosition: { x: number; y: number } | null;
  theme: EveTheme;
}

export const EveTooltip: React.FC<TooltipProps> = ({ point, cursorPosition, theme }) => {
  if (!point || !cursorPosition) return null;

  const scorePercent = point.score != null ? Math.round(point.score * 100) : null;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: cursorPosition.x + 16,
        top: cursorPosition.y - 8,
        pointerEvents: 'none',
        zIndex: 1000,
        maxWidth: 280,
        p: 1.5,
        background: `${theme.background}ee`,
        border: `1px solid ${theme.primary}60`,
        borderRadius: 1,
        boxShadow: `0 0 12px ${theme.primary}20`,
        fontFamily: '"Share Tech Mono", "Courier New", monospace',
      }}
    >
      {/* Label */}
      {point.label && (
        <Typography
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: theme.primary,
            mb: 0.5,
            textShadow: `0 0 6px ${theme.primary}40`,
          }}
        >
          {point.label}
        </Typography>
      )}

      {/* Score bar */}
      {scorePercent != null && (
        <Box sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#aaa', mb: 0.25 }}>
            Score: {scorePercent}%
          </Typography>
          <Box
            sx={{
              width: '100%',
              height: 4,
              borderRadius: 2,
              background: `${theme.primary}20`,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${scorePercent}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${theme.scoreGradient[0]}, ${theme.scoreGradient[1]})`,
                borderRadius: 2,
              }}
            />
          </Box>
        </Box>
      )}

      {/* Content preview */}
      {point.content && (
        <Typography
          sx={{
            fontSize: '0.7rem',
            color: '#ccc',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {point.content.length > 100 ? point.content.slice(0, 100) + '...' : point.content}
        </Typography>
      )}

      {/* Group chip */}
      {point.group && (
        <Box
          sx={{
            display: 'inline-block',
            mt: 0.5,
            px: 1,
            py: 0.25,
            fontSize: '0.6rem',
            color: theme.secondary,
            border: `1px solid ${theme.secondary}50`,
            borderRadius: 1,
          }}
        >
          {point.group}
        </Box>
      )}
    </Box>
  );
};
