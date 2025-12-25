// Template Editor - Main container component

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';
import { TemplateList } from './TemplateList';
import { TemplateForm } from './TemplateForm';

export const TemplateEditor: React.FC = () => {
  const { templateEditorMode, setTemplateEditorMode, setEditingTemplate } = useRaiStore();

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateEditorMode('create');
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setTemplateEditorMode('list');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Template Editor
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {templateEditorMode === 'list' && 'Create and manage custom note templates'}
            {templateEditorMode === 'create' && 'Create a new template'}
            {templateEditorMode === 'edit' && 'Edit template'}
          </Typography>
        </Box>

        {templateEditorMode === 'list' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateNew}
            size="large"
          >
            Create New Template
          </Button>
        )}
      </Box>

      {/* Content based on mode */}
      {templateEditorMode === 'list' && <TemplateList />}
      {(templateEditorMode === 'create' || templateEditorMode === 'edit') && (
        <TemplateForm onCancel={handleCancel} />
      )}
    </Box>
  );
};
