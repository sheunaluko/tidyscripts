'use client';

import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { EvePoint, EveTheme } from './lib/types';

interface DetailPanelProps {
  point: EvePoint | null;
  theme: EveTheme;
  visible: boolean;
  onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  point,
  theme,
  visible,
  onClose,
}) => {
  const show = visible && point != null;
  const scorePercent = point?.score != null ? Math.round(point.score * 100) : null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: `${theme.background}f0`,
        borderLeft: `1px solid ${theme.primary}40`,
        boxShadow: `inset 2px 0 12px ${theme.primary}10`,
        transform: show ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'auto',
        zIndex: 10,
        fontFamily: '"Share Tech Mono", "Courier New", monospace',
        p: 2,
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: theme.primary,
          '&:hover': { background: `${theme.primary}20` },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {point && (
        <>
          {/* Label */}
          <Typography
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              color: theme.primary,
              mb: 1,
              pr: 4,
              textShadow: `0 0 8px ${theme.primary}40`,
            }}
          >
            {point.label || point.id}
          </Typography>

          {/* Score */}
          {scorePercent != null && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 0.5 }}>
                RELEVANCE SCORE
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: `${theme.primary}15`,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${scorePercent}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${theme.scoreGradient[0]}, ${theme.scoreGradient[1]})`,
                      borderRadius: 3,
                      boxShadow: `0 0 6px ${theme.primary}40`,
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: '0.8rem', color: theme.primary, minWidth: 40 }}>
                  {scorePercent}%
                </Typography>
              </Box>
            </Box>
          )}

          {/* Group */}
          {point.group && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 0.5 }}>
                GROUP
              </Typography>
              <Box
                sx={{
                  display: 'inline-block',
                  px: 1.5,
                  py: 0.5,
                  fontSize: '0.75rem',
                  color: theme.secondary,
                  border: `1px solid ${theme.secondary}50`,
                  borderRadius: 1,
                }}
              >
                {point.group}
              </Box>
            </Box>
          )}

          {/* Content */}
          {point.content && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 0.5 }}>
                CONTENT
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: '#ccc',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {point.content}
              </Typography>
            </Box>
          )}

          {/* Metadata */}
          {point.metadata && Object.keys(point.metadata).length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.7rem', color: '#888', mb: 0.5 }}>
                METADATA
              </Typography>
              {Object.entries(point.metadata).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 0.5,
                    borderBottom: `1px solid ${theme.primary}10`,
                    fontSize: '0.75rem',
                  }}
                >
                  <Typography sx={{ color: '#888', fontSize: 'inherit' }}>
                    {key}
                  </Typography>
                  <Typography sx={{ color: '#ccc', fontSize: 'inherit', textAlign: 'right' }}>
                    {String(value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
