// Note Generator Component

import React, { useEffect } from 'react';
import { Box, Typography, Button, Alert, Paper, Chip, Skeleton } from '@mui/material';
import { AutoAwesome, Refresh } from '@mui/icons-material';
import { NoteDisplay } from './NoteDisplay';
import { VoiceBox } from './VoiceBox';
import { useNoteGeneration } from '../../hooks/useNoteGeneration';
import { useRaiStore } from '../../store/useRaiStore';

export const NoteGenerator: React.FC = () => {
  const { generate, generatedNote, loading, error } = useNoteGeneration();
  const { settings, selectedTemplate, collectedInformation } = useRaiStore();

  // Always show blank note editor by default
  const noteToDisplay = generatedNote || '';

  useEffect(() => {
    // Autostart generation if enabled and no note generated yet
    if (settings.autostartGeneration && !generatedNote && !loading && collectedInformation.length > 0) {
      generate();
    }
  }, [settings.autostartGeneration, generatedNote, loading, collectedInformation.length, generate]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Note Generator
        </Typography>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">{selectedTemplate ? selectedTemplate.title  : "None"}</Typography>
            <Chip
              label={settings.aiModel}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            />
          </Box>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Using {collectedInformation.length} information entries
          </Typography>
        </Paper>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => generate()}>
          {error}
        </Alert>
      )}

      {/* Generate Button and Voice Box - only show when no note generated */}
      {!generatedNote && !loading && (
        <>
          <Button
            variant="contained"
            size="large"
            startIcon={<AutoAwesome />}
            onClick={generate}
            fullWidth
            sx={{ mb: 3 }}
          >
            Generate Note
          </Button>

          {/* Voice Box Component */}
          <VoiceBox />
        </>
      )}

      {/* Loading State */}
      {loading && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generating note with {settings.aiModel}...
            </Typography>
          </Box>
          <Skeleton variant="text" width="40%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="100%" height={24} />
          <Skeleton variant="text" width="100%" height={24} />
          <Skeleton variant="text" width="90%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="100%" height={24} />
          <Skeleton variant="text" width="100%" height={24} />
          <Skeleton variant="text" width="95%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="100%" height={24} />
          <Skeleton variant="text" width="85%" height={24} />
        </Paper>
      )}

      {/* Note Display - always show when not loading */}
      {!loading && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {generatedNote ? 'Generated Note' : 'Note Editor'}
            </Typography>
            {generatedNote && (
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={generate}
                size="small"
              >
                Regenerate
              </Button>
            )}
          </Box>

          <NoteDisplay note={noteToDisplay} />
        </Box>
      )}
    </Box>
  );
};
