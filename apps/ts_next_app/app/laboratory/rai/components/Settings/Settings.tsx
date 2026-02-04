// Settings Component

import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
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
} from '@mui/material';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { SUPPORTED_MODELS, DEFAULT_SETTINGS, ADVANCED_FEATURES_PASSWORD_HASH } from '../../constants';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useRaiStore();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleAdvancedFeaturesToggle = (checked: boolean) => {
    if (checked && !settings.advancedFeaturesEnabled) {
      // Enabling - require password
      setPasswordDialogOpen(true);
      setPasswordInput('');
      setPasswordError('');
    } else {
      // Disabling - no password needed
      updateSettings({ advancedFeaturesEnabled: false });
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      const hashedPassword = await tsw.common.apis.cryptography.sha256(passwordInput);

      if (hashedPassword === ADVANCED_FEATURES_PASSWORD_HASH) {
        // Password correct - enable advanced features
        updateSettings({ advancedFeaturesEnabled: true });
        setPasswordDialogOpen(false);
        setPasswordInput('');
        setPasswordError('');
      } else {
        // Password incorrect
        setPasswordError('Incorrect password');
      }
    } catch (error) {
      setPasswordError('Error verifying password');
    }
  };

  const handleReset = () => {
    updateSettings(DEFAULT_SETTINGS);
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
          <RadioGroup
            value={settings.inputMode}
            onChange={(e) => updateSettings({ inputMode: e.target.value as 'voice' | 'text' })}
          >
            <FormControlLabel value="voice" control={<Radio />} label="Voice (AI Agent)" />
            <FormControlLabel value="text" control={<Radio />} label="Text Input" />
          </RadioGroup>
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
            onChange={(e) => updateSettings({ aiModel: e.target.value })}
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
            onChange={(e) => updateSettings({ agentModel: e.target.value })}
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
                onChange={(e) => updateSettings({ autostartAgent: e.target.checked })}
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
                onChange={(e) => updateSettings({ autostartGeneration: e.target.checked })}
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
                onChange={(e) => updateSettings({ showDefaultTemplates: e.target.checked })}
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
                  onChange={(e) => updateSettings({ useUnstructuredMode: e.target.checked })}
                />
              }
              label="Use Unstructured Mode"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              Experimental: Use unstructured LLM calls for note generation. May have different output format compared to structured mode.
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Voice Agent Audio Controls */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Voice Agent Settings
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
          Note: Changes require restarting the voice agent to take effect
        </Typography>

        {/* Voice Recognition Mode */}
        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend">Voice Recognition Mode</FormLabel>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Controls how the voice agent detects and processes speech
          </Typography>
          <RadioGroup
            value={settings.tiviMode || 'guarded'}
            onChange={(e) => updateSettings({ tiviMode: e.target.value as 'guarded' | 'responsive' | 'continuous' })}
          >
            <FormControlLabel
              value="guarded"
              control={<Radio />}
              label="Guarded (VAD-triggered, filters noise well)"
            />
            <FormControlLabel
              value="responsive"
              control={<Radio />}
              label="Responsive (Power-triggered, fast response)"
            />
            <FormControlLabel
              value="continuous"
              control={<Radio />}
              label="Continuous (Always listening)"
            />
          </RadioGroup>
        </FormControl>

        <Box sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            VAD Sensitivity: {settings.vadThreshold.toFixed(2)}
          </FormLabel>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Higher values require clearer speech. Lower values are more sensitive to quiet speech but may pick up noise.
          </Typography>

          <Slider
            value={settings.vadThreshold}
            sx={{margin: "5px"}}
            onChange={(_, value) => updateSettings({ vadThreshold: value as number })}
            min={0.5}
            max={1.0}
            step={0.05}
            marks={[
              { value: 0.5, label: '0.5 (Sensitive)' },
              { value: 0.7, label: '0.7' },
              { value: 0.8, label: '0.8 (Default)' },
              { value: 0.9, label: '0.9' },
              { value: 1.0, label: '1.0 (Strict)' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            TTS Playback Rate: {(settings.playbackRate || 1.5).toFixed(1)}x
          </FormLabel>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Speed of voice agent responses. Higher values speak faster.
          </Typography>

          <Slider
            value={settings.playbackRate || 1.5}
            sx={{margin: "5px"}}
            onChange={(_, value) => updateSettings({ playbackRate: value as number })}
            min={0.5}
            max={2.5}
            step={0.1}
            marks={[
              { value: 0.5, label: '0.5x' },
              { value: 1.0, label: '1.0x' },
              { value: 1.5, label: '1.5x (Default)' },
              { value: 2.0, label: '2.0x' },
              { value: 2.5, label: '2.5x' },
            ]}
            valueLabelDisplay="auto"
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
