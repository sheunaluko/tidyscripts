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
import { useTheme } from '@mui/material/styles';

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceStatusIndicatorProps {
  status: VoiceStatus;
  interimResult?: string;
  onStop?: () => void;
  visible: boolean;
  inline?: boolean; // If true, renders inline instead of fixed positioned
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  status,
  interimResult,
  onStop,
  visible,
  inline = false
}) => {
  const theme = useTheme();

  if (!visible || status === 'idle') return null;

  return (
    <Paper
      elevation={inline ? 2 : 8}
      sx={{
        position: inline ? 'static' : 'fixed',
        top: inline ? undefined : 80,
        left: inline ? undefined : '50%',
        transform: inline ? undefined : 'translateX(-50%)',
        zIndex: inline ? undefined : 9999,
        display: 'flex',
        alignItems: 'center',
        gap: inline ? 1 : 2,
        px: inline ? 2 : 3,
        py: inline ? 1 : 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
        backdropFilter: 'blur(20px)',
        borderRadius: inline ? 2 : 3,
        border: `2px solid ${getStatusColor(status)}`,
        boxShadow: inline ? `0 2px 8px ${alpha(getStatusColor(status), 0.2)}` : `0 8px 32px ${alpha(getStatusColor(status), 0.3)}`,
        minWidth: inline ? 200 : 300,
        maxWidth: inline ? 400 : 600,
        animation: inline ? undefined : 'slideDown 0.3s ease-out',
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
          width: inline ? 32 : 48,
          height: inline ? 32 : 48,
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
            &ldquo;{interimResult.length > 10 ? '...' + interimResult.slice(-10) : interimResult}&rdquo;
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
