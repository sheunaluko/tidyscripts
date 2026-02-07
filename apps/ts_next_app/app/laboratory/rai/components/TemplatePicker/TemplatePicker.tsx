// Template Picker Component

import React from 'react';
import { Box, Grid, Typography, Card, CardContent, Skeleton, Button } from '@mui/material';
import * as tsw from 'tidyscripts_web';
import { TemplateCard } from './TemplateCard';
import { useTemplates } from '../../hooks/useTemplates';
import { useRaiStore } from '../../store/useRaiStore';
import { NoteTemplate } from '../../types';

const log = tsw.common.logger.get_logger({ id: 'TemplatePicker' });

export const TemplatePicker: React.FC = () => {
  const { templates, setSelectedTemplate } = useTemplates();
  const { setCurrentView, selectTemplateAndBegin, setTemplateEditorMode, setEditingTemplate, settings } = useRaiStore();

  log(`Render: templatesCount=${templates.length}, showingSkeletons=${templates.length === 0}`);

  const handleSelectTemplate = (template: NoteTemplate) => {
    selectTemplateAndBegin(template);
  };

  const handleEditTemplate = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setTemplateEditorMode('edit');
    setCurrentView('template_editor');
  };

  const handleCreateTemplate = () => {
    setTemplateEditorMode('create');
    setCurrentView('template_editor');
  };

  // Filter templates based on settings
  const filteredTemplates = templates.filter((template) => {
    // If showDefaultTemplates is false, exclude default templates
    if (!settings.showDefaultTemplates && template.isDefault) {
      return false;
    }
    return true;
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Select a Template
      </Typography>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="body1" color="text.secondary" component="span">
          Choose a note template to begin documenting, or
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={handleCreateTemplate}
          sx={{ textTransform: 'none', minWidth: 'auto', px: 1 }}
        >
          Create One.
        </Button>
        <Typography variant="body1" color="text.secondary" component="span">
          Toggle default templates in
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={() => setCurrentView('settings')}
          sx={{ textTransform: 'none', minWidth: 'auto', px: 1 }}
        >
          Settings
        </Button>
      </Box>

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
        ) : filteredTemplates.length === 0 ? (
          // Empty state when all templates are filtered out
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              No templates available.
              {!settings.showDefaultTemplates && (
                <> Enable &quot;Show Default Templates&quot; in Settings or create a custom template.</>
              )}
            </Typography>
          </Grid>
        ) : (
          // Actual template cards
          filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <TemplateCard
                template={template}
                onSelect={handleSelectTemplate}
                onEdit={handleEditTemplate}
              />
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};
