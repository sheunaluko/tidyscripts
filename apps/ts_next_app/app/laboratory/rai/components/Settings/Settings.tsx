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
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel component="legend" sx={{ mb: 1 }}>
            AI Model for Note Generation
          </FormLabel>
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
          Voice Agent Audio Controls
        </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
              Note: Changes require restarting the voice agent to take effect
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{ mb: 1 }}>
                Sensitivity: {settings.vadThreshold.toFixed(2)}
              </FormLabel>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Lower values reduce false detections from background noise
              </Typography>
	      
              <Slider
                  value={settings.vadThreshold}
		  sx={{margin: "5px"}}
                onChange={(_, value) => updateSettings({ vadThreshold: value as number })}
                min={0.0}
                max={0.5}
                step={0.05}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 0.2, label: '0.2' },		  		  
                  { value: 0.3, label: '0.3' },
                  { value: 0.4, label: '0.4' },		  		  
                  { value: 0.5, label: '0.5' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{ mb: 1 }}>
                Silence Duration: {settings.vadSilenceDurationMs}ms
              </FormLabel>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                How long to wait for silence before processing speech. Increase to allow for longer pauses while speaking.
              </Typography>

	      
              <Slider
                value={settings.vadSilenceDurationMs}
                onChange={(_, value) => updateSettings({ vadSilenceDurationMs: value as number })}
                  min={200}
		  sx={{margin:"5px"}}
                max={2000}
                step={50}
                marks={[
                  { value: 200, label: '200ms' },
                  { value: 500, label: '500ms' },
                  { value: 750, label: '750ms (Default)' },
                  { value: 1000, label: '1s' },
                  { value: 2000, label: '2s' },
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
