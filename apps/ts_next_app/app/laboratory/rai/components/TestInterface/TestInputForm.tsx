// Test Input Form - Template selection, input text, and model selection

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Checkbox,
  Button,
  Autocomplete,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { PlayArrow } from '@mui/icons-material';
import * as tsw from 'tidyscripts_web';
import { useRaiStore } from '../../store/useRaiStore';
import { SUPPORTED_MODELS } from '../../constants';

const log = tsw.common.logger.get_logger({ id: 'TestInputForm' });
const debug = tsw.common.util.debug;

export const TestInputForm: React.FC = () => {
  const {
    templates,
    selectedTemplateForTest,
    testInputText,
    selectedModels,
    isRunningTest,
    setSelectedTemplateForTest,
    setTestInputText,
    setSelectedModels,
    startTest,
  } = useRaiStore();

  const [selectAll, setSelectAll] = React.useState(true);

  log({
    msg: 'Render',
    hasTemplate: !!selectedTemplateForTest,
    inputLength: testInputText.length,
    selectedModelsCount: selectedModels.length,
  });

  const handleSelectAllChange = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedModels([...SUPPORTED_MODELS]);
      debug.add('models_select_all', { count: SUPPORTED_MODELS.length });
    } else {
      setSelectedModels([]);
      log('Models deselect all');
    }
  };

  const handleModelToggle = (model: string) => {
    const newSelected = selectedModels.includes(model)
      ? selectedModels.filter(m => m !== model)
      : [...selectedModels, model];

    setSelectedModels(newSelected);
    setSelectAll(newSelected.length === SUPPORTED_MODELS.length);
    debug.add('model_toggled', { model, selected: !selectedModels.includes(model) });
  };

  const handleStartTest = async () => {
    debug.add('test_start_clicked', {
      templateId: selectedTemplateForTest?.id,
      inputLength: testInputText.length,
      models: selectedModels.length,
    });
    log({
      msg: 'Starting test',
      template: selectedTemplateForTest?.title,
      models: selectedModels,
    });
    await startTest();
  };

  const canStartTest = selectedTemplateForTest && testInputText.trim() && selectedModels.length > 0 && !isRunningTest;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Test Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure your test by selecting a template, providing input text, and choosing models to compare
      </Typography>

      {/* Template Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <FormLabel sx={{ mb: 1 }}>Select Template</FormLabel>
        <Autocomplete
          value={selectedTemplateForTest}
          onChange={(_, newValue) => {
            setSelectedTemplateForTest(newValue);
            debug.add('test_template_changed', { templateId: newValue?.id });
          }}
          options={templates}
          getOptionLabel={(option) => option.title}
          groupBy={(option) => option.isDefault ? 'Default Templates' : 'Custom Templates'}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Choose a template..."
              variant="outlined"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <li key={key} {...otherProps}>
                <Box>
                  <Typography variant="body2">{option.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              </li>
            );
          }}
          disabled={isRunningTest}
        />
      </FormControl>

      {/* Input Text */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <FormLabel sx={{ mb: 1 }}>Input Text</FormLabel>
        <TextField
          multiline
          minRows={6}
          maxRows={12}
          value={testInputText}
          onChange={(e) => {
            setTestInputText(e.target.value);
          }}
          placeholder="Enter patient information, clinical findings, or other relevant text that will be used to generate the note..."
          variant="outlined"
          disabled={isRunningTest}
          helperText={`${testInputText.length} characters`}
        />
      </FormControl>

      {/* Model Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <FormLabel>Select Models to Test</FormLabel>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectAll}
                onChange={(e) => handleSelectAllChange(e.target.checked)}
                disabled={isRunningTest}
              />
            }
            label="Select All"
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <Chip
            label={`${selectedModels.length} of ${SUPPORTED_MODELS.length} models selected`}
            color={selectedModels.length > 0 ? 'primary' : 'default'}
            size="small"
          />
        </Box>

        <Grid container spacing={1}>
          {SUPPORTED_MODELS.map((model) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={model}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedModels.includes(model)}
                    onChange={() => handleModelToggle(model)}
                    disabled={isRunningTest}
                  />
                }
                label={
                  <Typography variant="body2" fontFamily="monospace">
                    {model}
                  </Typography>
                }
              />
            </Grid>
          ))}
        </Grid>
      </FormControl>

      {/* Validation Messages */}
      {!selectedTemplateForTest && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please select a template to begin
        </Alert>
      )}
      {selectedTemplateForTest && !testInputText.trim() && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Please enter input text
        </Alert>
      )}
      {selectedTemplateForTest && testInputText.trim() && selectedModels.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please select at least one model to test
        </Alert>
      )}

      {/* Run Test Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={<PlayArrow />}
        onClick={handleStartTest}
        disabled={!canStartTest}
      >
        {isRunningTest ? 'Running Test...' : 'Run Test'}
      </Button>
    </Paper>
  );
};
