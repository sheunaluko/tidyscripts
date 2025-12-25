// Template List - Shows all templates with edit/delete actions

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit, Delete, Visibility, Description, EditNote } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';
import { NoteTemplate } from '../../types';

export const TemplateList: React.FC = () => {
  const { templates, deleteCustomTemplate, setTemplateEditorMode, setEditingTemplate } = useRaiStore();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    template: NoteTemplate | null;
  }>({ open: false, template: null });

  const defaultTemplates = templates.filter(t => t.isDefault);
  const customTemplates = templates.filter(t => !t.isDefault);

  const handleEdit = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setTemplateEditorMode('edit');
  };

  const handleView = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setTemplateEditorMode('edit');
  };

  const handleDeleteClick = (template: NoteTemplate) => {
    setDeleteDialog({ open: true, template });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.template) {
      deleteCustomTemplate(deleteDialog.template.id);
      setDeleteDialog({ open: false, template: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, template: null });
  };

  const renderTemplateCard = (template: NoteTemplate) => {
    const isDefault = template.isDefault;

    return (
      <Grid item xs={12} sm={6} md={4} key={template.id}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid transparent',
            borderRadius: 1,
            background: (theme) => `
              linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}) padding-box,
              linear-gradient(to right, #2196F3, #00BCD4, #9C27B0, #EA4335) border-box
            `,
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {isDefault ? (
                <Description color="primary" sx={{ mr: 1 }} />
              ) : (
                <EditNote color="secondary" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6" component="div">
                {template.title}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
              {template.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${template.variables.length} variables`}
                size="small"
                color="primary"
                variant="outlined"
              />
              {isDefault && (
                <Chip label="Default" size="small" color="info" variant="outlined" />
              )}
              {!isDefault && template.updatedAt && (
                <Chip
                  label={`Updated ${new Date(template.updatedAt).toLocaleDateString()}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>

          <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
            {isDefault ? (
              <Button
                size="small"
                startIcon={<Visibility />}
                onClick={() => handleView(template)}
              >
                View
              </Button>
            ) : (
              <>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => handleEdit(template)}
                  color="primary"
                >
                  Edit
                </Button>
                <Tooltip title="Delete template">
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(template)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      {/* Default Templates Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Default Templates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Built-in templates (read-only)
        </Typography>
        <Grid container spacing={3}>
          {defaultTemplates.map(template => renderTemplateCard(template))}
        </Grid>
      </Box>

      {/* Custom Templates Section */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Custom Templates
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your custom templates
        </Typography>
        {customTemplates.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              px: 2,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.default',
            }}
          >
            <EditNote sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No custom templates yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click &quot;Create New Template&quot; to get started
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {customTemplates.map(template => renderTemplateCard(template))}
          </Grid>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{deleteDialog.template?.title}&quot;? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
