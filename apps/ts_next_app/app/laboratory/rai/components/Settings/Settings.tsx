// Settings Component

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  FormControlLabel,
  Select,
  MenuItem,
  Checkbox,
  Paper,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Switch,
  Collapse,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { useInsights } from '../../context/InsightsContext';
import { SUPPORTED_MODELS, DEFAULT_SETTINGS, ADVANCED_FEATURES_PASSWORD_HASH } from '../../constants';
import { getRaiStore } from '../../lib/storage';
import { useTivi } from '../../../components/tivi/lib/index';
import { useTiviSettings } from '../../../components/tivi/lib/useTiviSettings';
import { VADMonitor } from '../../../components/tivi/VADMonitor';
import { CalibrationPanel } from '../../../components/tivi/CalibrationPanel';
import { VoiceSelector } from '../../../components/tivi/VoiceSelector';

export const Settings: React.FC = () => {
  const { settings, updateSettings, switchStorageMode } = useRaiStore();
  const { settings: tiviSettings, updateSettings: updateTiviSettingsFn, resetSettings: resetTiviSettingsFn } = useTiviSettings();
  const { client: insightsClient } = useInsights();

  const addInsightEvent = (type: string, payload: Record<string, any>) => {
    try { insightsClient?.addEvent(type, payload); } catch (_) {}
  };

  const trackAndUpdate = (updates: Partial<typeof settings>) => {
    updateSettings(updates);
    addInsightEvent('settings_changed', updates);
  };

  const trackAndUpdateTivi = useCallback((updates: Parameters<typeof updateTiviSettingsFn>[0]) => {
    updateTiviSettingsFn(updates);
    addInsightEvent('voice_settings_changed', updates);
  }, [updateTiviSettingsFn, insightsClient]);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showVoices, setShowVoices] = useState(false);

  // Own tivi instance for calibration/monitoring on Settings page
  const tivi = useTivi({
    mode: tiviSettings.mode,
    positiveSpeechThreshold: tiviSettings.positiveSpeechThreshold,
    negativeSpeechThreshold: tiviSettings.negativeSpeechThreshold,
    minSpeechStartMs: tiviSettings.minSpeechStartMs,
    powerThreshold: tiviSettings.powerThreshold,
    enableInterruption: tiviSettings.enableInterruption,
    language: 'en-US',
    verbose: false,
  });

  const updateVadParam = useCallback((key: string, value: any) => {
    trackAndUpdateTivi({ [key]: value });
  }, [trackAndUpdateTivi]);

  const handleParametersAccepted = useCallback((params: {
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    minSpeechStartMs: number;
    disableInterruption?: boolean;
  }) => {
    const updates: Record<string, any> = {
      positiveSpeechThreshold: params.positiveSpeechThreshold,
      negativeSpeechThreshold: params.negativeSpeechThreshold,
      minSpeechStartMs: params.minSpeechStartMs,
    };
    if (params.disableInterruption) {
      updates.enableInterruption = false;
    }
    updateTiviSettingsFn(updates);
    addInsightEvent('calibration_accepted', params);
  }, [updateTiviSettingsFn, insightsClient]);

  const handleAdvancedFeaturesToggle = (checked: boolean) => {
    if (checked && !settings.advancedFeaturesEnabled) {
      setPasswordDialogOpen(true);
      setPasswordInput('');
      setPasswordError('');
    } else {
      trackAndUpdate({ advancedFeaturesEnabled: false });
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const hashedPassword = await tsw.common.apis.cryptography.sha256(passwordInput);

      if (hashedPassword === ADVANCED_FEATURES_PASSWORD_HASH) {
        updateSettings({ advancedFeaturesEnabled: true });
        addInsightEvent('settings_changed', { advancedFeaturesEnabled: true });
        setPasswordDialogOpen(false);
        setPasswordInput('');
        setPasswordError('');
      } else {
        setPasswordError('Incorrect password');
      }
    } catch (error) {
      setPasswordError('Error verifying password');
    }
  };

  const handleReset = () => {
    updateSettings(DEFAULT_SETTINGS);
    resetTiviSettingsFn();
    addInsightEvent('settings_reset', { ...DEFAULT_SETTINGS, voiceReset: true });
  };

  const vadParams = {
    positiveSpeechThreshold: tiviSettings.positiveSpeechThreshold,
    negativeSpeechThreshold: tiviSettings.negativeSpeechThreshold,
    minSpeechStartMs: tiviSettings.minSpeechStartMs,
    powerThreshold: tiviSettings.powerThreshold,
    enableInterruption: tiviSettings.enableInterruption,
    mode: tiviSettings.mode,
    verbose: false,
    language: 'en-US',
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure your preferences for the RAI app
      </Typography>

      <Paper sx={{ p: 3, width : "90%" , padding : "20px"  }}>
        {/* Input Mode */}
        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend">Input Mode</FormLabel>
          <Select
            value={settings.inputMode}
            onChange={(e) => trackAndUpdate({ inputMode: e.target.value as 'voice' | 'text' })}
            size="small"
          >
            <MenuItem value="voice">Voice</MenuItem>
            <MenuItem value="text">Text Input</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* AI Model Selection */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          AI Models
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            Note Generation Model
          </FormLabel>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Used for generating the final clinical note from collected information
          </Typography>
          <Select
            value={settings.aiModel}
            onChange={(e) => trackAndUpdate({ aiModel: e.target.value })}
            size="small"
          >
            {SUPPORTED_MODELS.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            Voice Agent Model
          </FormLabel>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Used for conversation during information collection. Faster models work better for real-time interaction.
          </Typography>
          <Select
            value={settings.agentModel || settings.aiModel}
            onChange={(e) => trackAndUpdate({ agentModel: e.target.value })}
            size="small"
          >
            {SUPPORTED_MODELS.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        {/* Autostart Options */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.autostartAgent}
                onChange={(e) => trackAndUpdate({ autostartAgent: e.target.checked })}
              />
            }
            label="Autostart Voice Agent"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
            Automatically start the voice agent when entering information input mode
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.autostartGeneration}
                onChange={(e) => trackAndUpdate({ autostartGeneration: e.target.checked })}
              />
            }
            label="Autostart Note Generation"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
            Automatically generate the note when information collection is complete
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.showDefaultTemplates}
                onChange={(e) => trackAndUpdate({ showDefaultTemplates: e.target.checked })}
              />
            }
            label="Show Default Templates"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
            Display built-in default templates in the template selector alongside your custom templates
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={settings.advancedFeaturesEnabled}
                onChange={(e) => handleAdvancedFeaturesToggle(e.target.checked)}
              />
            }
            label="Advanced Features"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
            Enable advanced features and testing interfaces (requires password)
          </Typography>
        </Box>

        {settings.advancedFeaturesEnabled && (
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.useUnstructuredMode || false}
                  onChange={(e) => trackAndUpdate({ useUnstructuredMode: e.target.checked })}
                />
              }
              label="Use Unstructured Mode"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              Experimental: Use unstructured LLM calls for note generation. May have different output format compared to structured mode.
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <FormLabel component="legend" sx={{ mb: 1 }}>
              Storage Mode
            </FormLabel>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Where your templates, settings, and test data are persisted
            </Typography>
            <Select
              value={getRaiStore().getMode()}
              onChange={async (e) => {
                const newMode = e.target.value as 'local' | 'cloud';
                try {
                  await switchStorageMode(newMode);
                } catch {
                  // Error handled inside switchStorageMode (toast + insight event)
                }
              }}
              size="small"
            >
              <MenuItem value="local">Local (Browser Storage)</MenuItem>
              <MenuItem value="cloud">Cloud (SurrealDB)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Voice Agent Settings */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Voice Settings
        </Typography>

        {/* VADMonitor */}
        <Box sx={{ my: 2 }}>
          <VADMonitor
            speechProbRef={tivi.speechProbRef}
            audioLevelRef={tivi.audioLevelRef}
            threshold={tiviSettings.positiveSpeechThreshold}
            powerThreshold={tiviSettings.mode === 'responsive' ? tiviSettings.powerThreshold : undefined}
            minSpeechStartMs={tiviSettings.minSpeechStartMs}
            paused={false}
            width={300}
            height={60}
          />
        </Box>

        {/* Calibration */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <CalibrationPanel
            tivi={tivi}
            vadParams={vadParams}
            updateVadParam={updateVadParam}
            onParametersAccepted={handleParametersAccepted}
            disabled={tivi.isSpeaking}
          />
        </Box>

        {/* Voice Selector Toggle */}
        <Box sx={{ mb: 2 }}>
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

        {/* Recognition Mode */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Recognition Mode
          </Typography>
          <Select
            value={tiviSettings.mode}
            onChange={(e) => trackAndUpdateTivi({ mode: e.target.value as 'guarded' | 'responsive' | 'continuous' })}
            size="small"
            fullWidth
            disabled={tivi.isListening}
          >
            <MenuItem value="guarded">Guarded (VAD-triggered)</MenuItem>
            <MenuItem value="responsive">Responsive (power-triggered)</MenuItem>
            <MenuItem value="continuous">Continuous</MenuItem>
          </Select>
        </Box>

        {/* Enable Voice Interruption */}
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={tiviSettings.enableInterruption}
                onChange={(e) => trackAndUpdateTivi({ enableInterruption: e.target.checked })}
                disabled={tivi.isListening}
              />
            }
            label={<Typography variant="caption">Enable Voice Interruption</Typography>}
          />
        </Box>

        {/* Power Threshold - only for responsive mode */}
        {tiviSettings.mode === 'responsive' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Power Threshold: {tiviSettings.powerThreshold.toFixed(3)}
            </Typography>
            <Slider
              value={tiviSettings.powerThreshold}
              min={0.001}
              max={0.1}
              step={0.001}
              onChange={(_, value) => trackAndUpdateTivi({ powerThreshold: value as number })}
              valueLabelDisplay="auto"
              size="small"
              disabled={tivi.isListening}
              sx={{ mt: 1 }}
            />
          </Box>
        )}

        {/* Speech Detection Threshold */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Speech Detection Threshold: {tiviSettings.positiveSpeechThreshold.toFixed(2)}
          </Typography>
          <Slider
            value={tiviSettings.positiveSpeechThreshold}
            min={0}
            max={1}
            step={0.05}
            onChange={(_, value) => trackAndUpdateTivi({ positiveSpeechThreshold: value as number })}
            valueLabelDisplay="auto"
            size="small"
            disabled={tivi.isListening}
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Silence Detection Threshold */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Silence Detection Threshold: {tiviSettings.negativeSpeechThreshold.toFixed(2)}
          </Typography>
          <Slider
            value={tiviSettings.negativeSpeechThreshold}
            min={0}
            max={1}
            step={0.05}
            onChange={(_, value) => trackAndUpdateTivi({ negativeSpeechThreshold: value as number })}
            valueLabelDisplay="auto"
            size="small"
            disabled={tivi.isListening}
            sx={{ mt: 1 }}
          />
        </Box>

        {/* Min Speech Start */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Min Speech Start (ms)
          </Typography>
          <TextField
            type="number"
            value={tiviSettings.minSpeechStartMs}
            onChange={(e) => trackAndUpdateTivi({ minSpeechStartMs: parseInt(e.target.value) || 150 })}
            size="small"
            fullWidth
            disabled={tivi.isListening}
            inputProps={{ min: 32, max: 500, step: 32 }}
          />
        </Box>

        {/* TTS Playback Rate */}
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="caption" color="text.secondary">
            TTS Playback Rate: {tiviSettings.playbackRate.toFixed(1)}x
          </Typography>
          <Slider
            value={tiviSettings.playbackRate}
            min={0.5}
            max={2.5}
            step={0.1}
            onChange={(_, value) => trackAndUpdateTivi({ playbackRate: value as number })}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}x`}
            size="small"
            sx={{ mt: 1 }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Reset Button */}
        <Button variant="outlined" onClick={handleReset} fullWidth>
          Reset to Defaults
        </Button>
      </Paper>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)}>
          <DialogTitle >Enter Advanced Features Password</DialogTitle>

          <DialogContent sx={{ minWidth: 300  }}>

	      <br />

          <TextField
            fullWidth
              type="password"
            label="Password"
              variant="outlined"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setPasswordError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordSubmit();
            }}
            error={!!passwordError}
            helperText={passwordError}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordInput('');
            setPasswordError('');
          }}>
            Cancel
          </Button>
          <Button onClick={handlePasswordSubmit} variant="contained" color="primary">
            Unlock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
