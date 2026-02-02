'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Typography,
  Divider,
  Tooltip,
  alpha
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import ChatIcon from '@mui/icons-material/Chat';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import SettingsIcon from '@mui/icons-material/Settings';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useTheme } from '@mui/material/styles';
import AudioVisualization from './AudioVisualization';
import { VoiceStatusIndicator } from './VoiceStatusIndicator';

interface TopBarProps {
  // Mode
  mode: 'voice' | 'chat';
  onModeChange: (mode: 'voice' | 'chat') => void;

  // Voice controls
  started: boolean;
  onStartStop: () => void;

  // Transcription
  transcribe: boolean;
  onTranscribeToggle: () => void;

  // Speech
  isSpeaking: boolean;
  onCancelSpeech: () => void;

  // Model
  aiModel: string;
  onModelChange: (model: string) => void;

  // Settings
  onOpenSettings: () => void;

  // Audio visualization
  audioLevelRef: React.MutableRefObject<number>;

  // Voice status
  voiceStatus: 'idle' | 'listening' | 'processing' | 'speaking';
  interimResult?: string;

  // Context usage (optional - only shown when available)
  contextUsage?: {
    usagePercent: number
    totalUsed: number
    contextWindow: number
  } | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  started,
  onStartStop,
  transcribe,
  onTranscribeToggle,
  isSpeaking,
  onCancelSpeech,
  aiModel,
  onModelChange,
  onOpenSettings,
  audioLevelRef,
  voiceStatus,
  interimResult,
  contextUsage
}) => {
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      sx={{
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: 'none'
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: '64px', px: 3 }}>
        {/* Logo/Title */}
        <Typography variant="h6" sx={{ fontWeight: 700, mr: 2, color: theme.palette.text.primary }}>
          Cortex
        </Typography>

        <Divider orientation="vertical" flexItem />

        {/* Mode Toggle */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(e, newMode) => newMode && onModeChange(newMode)}
          size="small"
          sx={{ height: 40 }}
        >
          <ToggleButton value="voice">
            <MicIcon sx={{ mr: 1 }} />
            Voice
          </ToggleButton>
          <ToggleButton value="chat">
            <ChatIcon sx={{ mr: 1 }} />
            Chat
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Voice Mode Controls - Only shown in voice mode */}
        {mode === 'voice' && (
          <>
            {/* Start/Stop Button */}
            <Tooltip title={started ? "Stop listening" : "Start listening"}>
              <IconButton
                onClick={onStartStop}
                color={started ? "error" : "primary"}
                sx={{
                  width: 40,
                  height: 40,
                  background: started
                    ? alpha(theme.palette.error.main, 0.1)
                    : alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    background: started
                      ? alpha(theme.palette.error.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                {started ? <StopIcon /> : <PlayArrowIcon />}
              </IconButton>
            </Tooltip>

            {/* Transcribe Toggle */}
            <Tooltip title="Toggle transcription">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={transcribe}
                    onChange={() => onTranscribeToggle()}
                  />
                }
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GraphicEqIcon fontSize="small" />
                  <Typography variant="body2">Listen</Typography>
                </Box>}
                sx={{ ml: 1, mr: 1 }}
              />
            </Tooltip>

            {/* Pause Speech Button */}
            {isSpeaking && (
              <Tooltip title="Stop speaking">
                <IconButton
                  onClick={onCancelSpeech}
                  color="warning"
                  size="small"
                  sx={{
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.6 }
                    }
                  }}
                >
                  <PauseIcon />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Audio Visualization - centered, only in voice mode */}
        {mode === 'voice' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AudioVisualization
              audioLevelRef={audioLevelRef}
              paused={!started}
              width={120}
              height={40}
              backgroundColor="transparent"
              particleColor="#34eb49"
              particleCount={25}
            />
          </Box>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Voice Status Indicator - only in voice mode */}
        {mode === 'voice' && (
          <Box sx={{ mr: '20px' }}>
            <VoiceStatusIndicator
              status={voiceStatus}
              interimResult={interimResult}
              onStop={onCancelSpeech}
              visible={true}
              inline={true}
            />
          </Box>
        )}

        {/* Context Usage Display */}
        {contextUsage && (
          <Tooltip title={`${contextUsage.totalUsed.toLocaleString()} / ${contextUsage.contextWindow.toLocaleString()} tokens`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: contextUsage.usagePercent < 33
                    ? '#4caf50'  // green
                    : contextUsage.usagePercent < 66
                      ? '#ff9800'  // yellow/orange
                      : '#f44336'  // red
                }}
              >
                {contextUsage.usagePercent.toFixed(0)}%
              </Typography>
            </Box>
          </Tooltip>
        )}

        {/* Model Selector */}
        <Select
          value={aiModel}
          onChange={(e) => onModelChange(e.target.value)}
          size="small"
          sx={{ minWidth: 150, height: 40 }}
        >
          <MenuItem value="gpt-4o">GPT-4o</MenuItem>
          <MenuItem value="gpt-4o-mini-2024-07-18">GPT-4o Mini</MenuItem>
          <MenuItem value="o4-mini">o4-Mini</MenuItem>
          <MenuItem value="chatgpt-4o-latest">ChatGPT-4o</MenuItem>
          <MenuItem value="gemini-3-flash-preview">Gemini Flash</MenuItem>
        </Select>

        {/* Settings Button */}
        <Tooltip title="Settings & Widget Controls">
          <IconButton onClick={onOpenSettings}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};
