// Template Picker Component

import React from 'react';
import { Box, Grid, Typography, Card, CardContent, Skeleton } from '@mui/material';
import * as tsw from 'tidyscripts_web';
import { TemplateCard } from './TemplateCard';
import { useTemplates } from '../../hooks/useTemplates';
import { useRaiStore } from '../../store/useRaiStore';
import { NoteTemplate } from '../../types';

const log = tsw.common.logger.get_logger({ id: 'TemplatePicker' });

export const TemplatePicker: React.FC = () => {
  const { templates, setSelectedTemplate } = useTemplates();
  const { setCurrentView, resetInformation, clearTranscript } = useRaiStore();

  log(`Render: templatesCount=${templates.length}, showingSkeletons=${templates.length === 0}`);

  const handleSelectTemplate = (template: NoteTemplate) => {
    // Reset any previous session data
    resetInformation();
    clearTranscript();

    // Set the selected template
    setSelectedTemplate(template);

    // Navigate to information input
    setCurrentView('information_input');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Select a Template
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Choose a note template to begin documenting
      </Typography>

      <Grid container spacing={3} sx={{ minWidth: 0 }}>
        {templates.length === 0 ? (
          // Loading skeletons
          [1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'none',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          // Actual template cards
          templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <TemplateCard template={template} onSelect={handleSelectTemplate} />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};
