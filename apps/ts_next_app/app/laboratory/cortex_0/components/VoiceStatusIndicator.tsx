'use client';

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  CircularProgress,
  alpha
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { theme } from '../../../theme';

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceStatusIndicatorProps {
  status: VoiceStatus;
  interimResult?: string;
  onStop?: () => void;
  visible: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  interimResult,
  onStop,
  visible
}) => {
  if (!visible || status === 'idle') return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 80, // Below top bar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: `2px solid ${getStatusColor(status)}`,
        boxShadow: `0 8px 32px ${alpha(getStatusColor(status), 0.3)}`,
        minWidth: 300,
        maxWidth: 600,
        animation: 'slideDown 0.3s ease-out',
        '@keyframes slideDown': {
          from: {
            opacity: 0,
            transform: 'translateX(-50%) translateY(-20px)',
          },
          to: {
            opacity: 1,
            transform: 'translateX(-50%) translateY(0)',
          }
        }
      }}
    >
      {/* Status Icon */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: alpha(getStatusColor(status), 0.15),
          color: getStatusColor(status),
        }}
      >
        {status === 'listening' && (
          <MicIcon sx={{
            fontSize: 28,
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.1)' }
            }
          }} />
        )}
        {status === 'processing' && (
          <PsychologyIcon sx={{ fontSize: 28 }} />
        )}
        {status === 'speaking' && (
          <VolumeUpIcon sx={{
            fontSize: 28,
            animation: 'bounce 0.6s infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.15)' }
            }
          }} />
        )}
      </Box>

      {/* Status Text & Details */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: getStatusColor(status),
            mb: interimResult ? 0.5 : 0
          }}
        >
          {getStatusText(status)}
        </Typography>

        {/* Interim Transcription */}
        {status === 'listening' && interimResult && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            &ldquo;{interimResult}&rdquo;
          </Typography>
        )}

        {/* Processing indicator */}
        {status === 'processing' && (
          <Typography variant="body2" color="text.secondary">
            Analyzing your request...
          </Typography>
        )}

        {/* Speaking indicator */}
        {status === 'speaking' && (
          <Typography variant="body2" color="text.secondary">
            Click stop to interrupt
          </Typography>
        )}
      </Box>

      {/* Action Buttons */}
      {status === 'speaking' && onStop && (
        <IconButton
          onClick={onStop}
          size="small"
          sx={{
            background: alpha(theme.palette.error.main, 0.1),
            '&:hover': {
              background: alpha(theme.palette.error.main, 0.2),
            }
          }}
        >
          <StopIcon />
        </IconButton>
      )}

      {status === 'processing' && (
        <CircularProgress size={24} thickness={4} />
      )}
    </Paper>
  );
};

// Helper functions
function getStatusColor(status: VoiceStatus): string {
  switch (status) {
    case 'listening': return '#4caf50'; // Green
    case 'processing': return '#ff9800'; // Orange
    case 'speaking': return '#2196f3'; // Blue
    default: return '#9e9e9e'; // Gray
  }
}

function getStatusText(status: VoiceStatus): string {
  switch (status) {
    case 'listening': return 'Listening...';
    case 'processing': return 'Thinking...';
    case 'speaking': return 'Speaking...';
    default: return 'Ready';
  }
}
