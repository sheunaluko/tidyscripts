// Settings Component

import React from 'react';
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
} from '@mui/material';
import { useRaiStore } from '../../store/useRaiStore';
import { SUPPORTED_MODELS, DEFAULT_SETTINGS } from '../../constants';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useRaiStore();

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

      <Paper sx={{ p: 3, maxWidth: 600 }}>
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

        <Box sx={{ mb: 3 }}>
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

        <Divider sx={{ my: 3 }} />

        {/* Reset Button */}
        <Button variant="outlined" onClick={handleReset} fullWidth>
          Reset to Defaults
        </Button>
      </Paper>
    </Box>
  );
};
