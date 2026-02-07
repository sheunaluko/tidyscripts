'use client';

import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Slider,
  TextField,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { VADMonitor } from '../../components/tivi/VADMonitor';
import { CalibrationPanel } from '../../components/tivi/CalibrationPanel';
import { VoiceSelector } from '../../components/tivi/VoiceSelector';
import type { UseTiviReturn } from '../../components/tivi/lib';
import type { TiviSettings } from '../../components/tivi/lib/settings';

interface WidgetConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

interface SettingsPanelProps {
  widgets: WidgetConfig[];
  toggleWidget: (id: string) => void;
  onApplyPreset?: (preset: string) => void;
  onResetLayout?: () => void;
  open: boolean;
  onClose: () => void;
  tiviParams?: TiviSettings;
  onTiviParamsChange?: (params: Partial<TiviSettings>) => void;
  tivi?: UseTiviReturn;
  speechProbRef?: React.MutableRefObject<number>;
  audioLevelRef?: React.MutableRefObject<number>;
  speechCooldownMs?: number;
  onSpeechCooldownChange?: (ms: number) => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  isListening?: boolean;
}

const VoiceSelectorToggle: React.FC = () => {
  const [showVoices, setShowVoices] = useState(false);
  return (
    <Box sx={{ mb: '15px' }}>
      <Button
        variant="outlined"
        size="small"
        fullWidth
        startIcon={<VolumeUpIcon />}
        onClick={() => setShowVoices(prev => !prev)}
      >
        {showVoices ? 'Hide Voice Selection' : 'Select Voice'}
      </Button>
      <Collapse in={showVoices}>
        <Box sx={{ mt: 1 }}>
          <VoiceSelector />
        </Box>
      </Collapse>
    </Box>
  );
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  widgets,
  toggleWidget,
  onApplyPreset,
  onResetLayout,
  open,
  onClose,
  tiviParams,
  onTiviParamsChange,
  tivi,
  speechProbRef,
  audioLevelRef,
  speechCooldownMs,
  onSpeechCooldownChange,
  playbackRate,
  onPlaybackRateChange,
  isListening = false
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: 350, p: 3 } }}
    >
      <Typography variant="h6" gutterBottom>
        Settings
      </Typography>

      {tiviParams && onTiviParamsChange && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Voice Recognition Settings
          </Typography>

          {isListening && (
            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 2 }}>
              Stop listening to change voice settings
            </Typography>
          )}

          {/* VADMonitor - only runs when drawer is open */}
          {speechProbRef && (
            <Box sx={{ my: 2 }}>
              <VADMonitor
                speechProbRef={speechProbRef}
                audioLevelRef={audioLevelRef}
                threshold={tiviParams.positiveSpeechThreshold}
                powerThreshold={tiviParams.mode === 'responsive' ? tiviParams.powerThreshold : undefined}
                minSpeechStartMs={tiviParams.minSpeechStartMs}
                paused={!open}
                width={300}
                height={60}
              />
            </Box>
          )}

          {/* Calibration */}
          {tivi && onTiviParamsChange && (
            <Box sx={{ mt: 2, mb: '15px' }}>
              <CalibrationPanel
                tivi={tivi}
                vadParams={tiviParams}
                updateVadParam={(key, value) => onTiviParamsChange({ [key]: value })}
                disabled={tivi.isSpeaking}
              />
            </Box>
          )}

          {/* Voice Selector — toggle */}
          <VoiceSelectorToggle />

          {/* Recognition Mode */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Recognition Mode
            </Typography>
            <Select
              value={tiviParams.mode}
              onChange={(e) => onTiviParamsChange({ mode: e.target.value as TiviSettings['mode'] })}
              size="small"
              fullWidth
              disabled={isListening}
            >
              <MenuItem value="guarded">Guarded (VAD-triggered)</MenuItem>
              <MenuItem value="responsive">Responsive (power-triggered)</MenuItem>
              <MenuItem value="continuous">Continuous</MenuItem>
            </Select>
          </Box>

          {/* Enable Voice Interruption Toggle */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={tiviParams.enableInterruption}
                  onChange={(e) => onTiviParamsChange({ enableInterruption: e.target.checked })}
                  disabled={isListening}
                />
              }
              label={<Typography variant="caption">Enable Voice Interruption</Typography>}
            />
          </Box>

          {/* Power Threshold - only show for responsive mode */}
          {tiviParams.mode === 'responsive' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Power Threshold: {tiviParams.powerThreshold.toFixed(3)}
              </Typography>
              <Slider
                value={tiviParams.powerThreshold}
                min={0.001}
                max={0.1}
                step={0.001}
                onChange={(_, value) => onTiviParamsChange({ powerThreshold: value as number })}
                valueLabelDisplay="auto"
                size="small"
                disabled={isListening}
                sx={{ mt: 1 }}
              />
            </Box>
          )}

          {/* Positive Speech Threshold */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Speech Detection Threshold: {tiviParams.positiveSpeechThreshold.toFixed(2)}
            </Typography>
            <Slider
              value={tiviParams.positiveSpeechThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, value) =>
                onTiviParamsChange({ positiveSpeechThreshold: value as number })
              }
              valueLabelDisplay="auto"
              size="small"
              disabled={isListening}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Negative Speech Threshold */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Silence Detection Threshold: {tiviParams.negativeSpeechThreshold.toFixed(2)}
            </Typography>
            <Slider
              value={tiviParams.negativeSpeechThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, value) =>
                onTiviParamsChange({ negativeSpeechThreshold: value as number })
              }
              valueLabelDisplay="auto"
              size="small"
              disabled={isListening}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* Min Speech Start Duration */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Min Speech Start (ms)
            </Typography>
            <TextField
              type="number"
              value={tiviParams.minSpeechStartMs}
              onChange={(e) =>
                onTiviParamsChange({ minSpeechStartMs: parseInt(e.target.value) || 150 })
              }
              size="small"
              fullWidth
              disabled={isListening}
              inputProps={{ min: 32, max: 500, step: 32 }}
            />
          </Box>

          {/* Speech Cooldown */}
          {speechCooldownMs !== undefined && onSpeechCooldownChange && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Speech Cooldown: {(speechCooldownMs / 1000).toFixed(1)}s
              </Typography>
              <Slider
                value={speechCooldownMs}
                min={0}
                max={5000}
                step={250}
                onChange={(_, value) => onSpeechCooldownChange(value as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${(v / 1000).toFixed(1)}s`}
                size="small"
                disabled={isListening}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Ignore speech within this time of last utterance
              </Typography>
            </Box>
          )}

          {/* Playback Speed */}
          {playbackRate !== undefined && onPlaybackRateChange && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Playback Speed: {playbackRate.toFixed(1)}x
              </Typography>
              <Slider
                value={playbackRate}
                min={0.5}
                max={2.0}
                step={0.1}
                onChange={(_, value) => onPlaybackRateChange(value as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}x`}
                size="small"
                disabled={isListening}
                sx={{ mt: 1 }}
              />
            </Box>
          )}

          {/* Language */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Recognition Language
            </Typography>
            <Select
              value={tiviParams.language}
              onChange={(e) => onTiviParamsChange({ language: e.target.value })}
              size="small"
              fullWidth
              disabled={isListening}
            >
              <MenuItem value="en-US">English (US)</MenuItem>
              <MenuItem value="en-GB">English (UK)</MenuItem>
              <MenuItem value="es-ES">Spanish</MenuItem>
              <MenuItem value="fr-FR">French</MenuItem>
              <MenuItem value="de-DE">German</MenuItem>
              <MenuItem value="it-IT">Italian</MenuItem>
              <MenuItem value="pt-BR">Portuguese (Brazil)</MenuItem>
              <MenuItem value="ja-JP">Japanese</MenuItem>
              <MenuItem value="zh-CN">Chinese (Simplified)</MenuItem>
              <MenuItem value="ko-KR">Korean</MenuItem>
            </Select>
          </Box>

          {/* Verbose Logging */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={tiviParams.verbose}
                  onChange={(e) => onTiviParamsChange({ verbose: e.target.checked })}
                  disabled={isListening}
                />
              }
              label={<Typography variant="caption">Verbose Logging</Typography>}
            />
          </Box>

        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Widget Toggles */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Visible Widgets
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
          {widgets.map(widget => (
            <FormControlLabel
              key={widget.id}
              control={
                <Switch
                  size="small"
                  checked={widget.visible}
                  onChange={() => toggleWidget(widget.id)}
                />
              }
              label={widget.name}
            />
          ))}
        </Box>
      </Box>


      {onResetLayout && (
        <>
          <Divider sx={{ my: 2 }} />

          {/* Reset Button */}
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={onResetLayout}
          >
            Reset Layout to Default
          </Button>
        </>
      )}
    </Drawer>
  );
};
