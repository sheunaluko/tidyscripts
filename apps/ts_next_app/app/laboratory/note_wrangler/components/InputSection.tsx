import React from 'react';
import {
  Button,
  Typography,
  Paper,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { VERBOSITY_LABELS, AVAILABLE_MODELS } from '../constants';

interface InputSectionProps {
  progressNote: string;
  verbosity: number;
  model: string;
  loading: boolean;
  onProgressNoteChange: (value: string) => void;
  onVerbosityChange: (value: number) => void;
  onModelChange: (value: string) => void;
  onConvert: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  progressNote,
  verbosity,
  model,
  loading,
  onProgressNoteChange,
  onVerbosityChange,
  onModelChange,
  onConvert
}) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant='h6' gutterBottom>
        Input Progress Note
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={12}
        variant="outlined"
        placeholder="Paste progress note here..."
        value={progressNote}
        onChange={(e) => onProgressNoteChange(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Typography variant='subtitle1' gutterBottom>
        Verbosity Level: {verbosity} - {VERBOSITY_LABELS[verbosity as keyof typeof VERBOSITY_LABELS]}
      </Typography>
      <Slider
        value={verbosity}
        onChange={(_, value) => onVerbosityChange(value as number)}
        min={1}
        max={5}
        step={1}
        marks
        valueLabelDisplay="auto"
        sx={{ mb: 3 }}
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="model-select-label">Model</InputLabel>
        <Select
          labelId="model-select-label"
          id="model-select"
          value={model}
          label="Model"
          onChange={(e) => onModelChange(e.target.value)}
        >
          {AVAILABLE_MODELS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant='contained'
        color='primary'
        size='large'
        onClick={onConvert}
        disabled={loading || !progressNote.trim()}
        sx={{ minWidth: 150 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : 'Convert'}
      </Button>
    </Paper>
  );
};
