// Information Input Container Component

import React from 'react';
import { Box, Typography, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import { TextMode } from './TextMode';
import { VoiceMode } from './VoiceMode';
import { InformationDisplay } from './InformationDisplay';
import { useRaiStore } from '../../store/useRaiStore';

export const InformationInput: React.FC = () => {
  const { selectedTemplate, settings, resetInformation, collectedInformation } = useRaiStore();
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [templateVisible, setTemplateVisible] = React.useState(false);

  const handleReset = () => {
    resetInformation();
    setResetDialogOpen(false);
  };

  if (!selectedTemplate) {
    return (
      <Box>
        <Typography variant="h5" color="text.secondary">
          No template selected. Please select a template first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4">Information Input</Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => setResetDialogOpen(true)}
            disabled={collectedInformation.length === 0}
            size="small"
          >
            Reset
          </Button>
        </Box>

        <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">{selectedTemplate.title}</Typography>
              <Chip
                label={settings.inputMode === 'voice' ? 'Voice Mode' : 'Text Mode'}
                size="small"
                sx={{ bgcolor: 'background.paper' }}
              />
            </Box>
            <Button
              size="small"
              startIcon={templateVisible ? <VisibilityOff /> : <Visibility />}
              onClick={() => setTemplateVisible(!templateVisible)}
              sx={{ color: 'white' }}
            >
              {templateVisible ? 'Hide Template' : 'View Template'}
            </Button>
          </Box>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            {selectedTemplate.description}
          </Typography>

          {/* Template text display */}
          {templateVisible && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {selectedTemplate.template}
            </Box>
          )}
        </Paper>
      </Box>

      {/* Collected Information Display */}
      <InformationDisplay />

      {/* Input Mode */}
      <Box sx={{ mb: 3 }}>
        {settings.inputMode === 'text' ? (
          <TextMode />
        ) : (
          <VoiceMode />
        )}
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Information?</DialogTitle>
        <DialogContent>
          <Typography>
            This will clear all collected information. Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReset} color="error" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
