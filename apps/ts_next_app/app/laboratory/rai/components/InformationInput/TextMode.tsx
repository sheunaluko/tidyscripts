// Text Mode Component - Manual text input

import React, { useState } from 'react';
import { Box, TextField, Button, Paper } from '@mui/material';
import { Send } from '@mui/icons-material';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { useInsights } from '../../context/InsightsContext';

const log = tsw.common.logger.get_logger({ id: 'rai' });
const debug = tsw.common.util.debug;

export const TextMode: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const { addInformationText, setInformationComplete, setCurrentView } = useRaiStore();
  const { client: insightsClient } = useInsights();

  const addInsightEvent = (type: string, payload: Record<string, any>) => {
    try { insightsClient?.addEvent(type, payload); } catch (_) {}
  };

  const handleAddText = () => {
    if (inputText.trim()) {
      debug.add('text_mode_input_added', { text: inputText });
      addInformationText(inputText.trim());
      addInsightEvent('text_input_added', { charLength: inputText.trim().length });
      setInputText('');
    }
  };

  const handleFinished = () => {
    log('Text mode: User clicked Finished');
    debug.add('text_mode_finished', {});
    addInsightEvent('text_mode_finished', {});
    setInformationComplete(true);
    setCurrentView('note_generator');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddText();
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="Enter patient information here... (Ctrl+Enter to add)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={handleAddText}
          disabled={!inputText.trim()}
        >
          Add Information
        </Button>

        <Button variant="outlined" color="success" onClick={handleFinished}>
          Finished - Generate Note
        </Button>
      </Box>
    </Paper>
  );
};
