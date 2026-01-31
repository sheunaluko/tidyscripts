'use client';

import React from 'react';
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
  MenuItem
} from '@mui/material';
import { VADMonitor } from '../../components/tivi/VADMonitor';

interface WidgetConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

interface TiviParams {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  minSpeechStartMs: number;
  language: string;
  verbose: boolean;
}

interface SettingsPanelProps {
  widgets: WidgetConfig[];
  toggleWidget: (id: string) => void;
  onApplyPreset?: (preset: string) => void;
  onResetLayout?: () => void;
  open: boolean;
  onClose: () => void;
  tiviParams?: TiviParams;
  onTiviParamsChange?: (params: Partial<TiviParams>) => void;
  speechProbRef?: React.MutableRefObject<number>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  widgets,
  toggleWidget,
  onApplyPreset,
  onResetLayout,
  open,
  onClose,
  tiviParams,
  onTiviParamsChange,
  speechProbRef
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: 350, p: 3 } }}
    >
      <Typography variant="h6" gutterBottom>
        Widget Settings
      </Typography>

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

      {tiviParams && onTiviParamsChange && (
        <>
          <Divider sx={{ my: 2 }} />

          {/* Tivi Voice Recognition Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Voice Recognition Settings
            </Typography>

            {/* VADMonitor - only runs when drawer is open */}
            {speechProbRef && (
              <Box sx={{ my: 2 }}>
                <VADMonitor
                  speechProbRef={speechProbRef}
                  threshold={tiviParams.positiveSpeechThreshold}
                  minSpeechStartMs={tiviParams.minSpeechStartMs}
                  paused={!open}
                  width={300}
                  height={60}
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
                inputProps={{ min: 32, max: 500, step: 32 }}
              />
            </Box>

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
                  />
                }
                label={<Typography variant="caption">Verbose Logging</Typography>}
              />
            </Box>
          </Box>
        </>
      )}

      {onApplyPreset && (
        <>
          <Divider sx={{ my: 2 }} />

          {/* Layout Presets */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Layout Presets
            </Typography>
            <Box display="flex" flexDirection="column" gap={1} mt={2}>
              <Button
                variant="outlined"
                onClick={() => onApplyPreset('focus')}
                fullWidth
              >
                Focus Mode
              </Button>
              <Button
                variant="outlined"
                onClick={() => onApplyPreset('development')}
                fullWidth
              >
                Development
              </Button>
              <Button
                variant="outlined"
                onClick={() => onApplyPreset('debug')}
                fullWidth
              >
                Debug View
              </Button>
              <Button
                variant="outlined"
                onClick={() => onApplyPreset('minimal')}
                fullWidth
              >
                Minimal
              </Button>
            </Box>
          </Box>
        </>
      )}

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
