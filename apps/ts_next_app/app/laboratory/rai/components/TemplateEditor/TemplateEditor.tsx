// Template Editor - Main container component

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';
import { TemplateList } from './TemplateList';
import { TemplateForm } from './TemplateForm';
import { DotPhraseDialog } from './DotPhraseDialog';
import { DotPhrase } from '../../types';

export const TemplateEditor: React.FC = () => {
  const {
    templateEditorMode,
    setTemplateEditorMode,
    setEditingTemplate,
    dotPhrases,
    deleteDotPhrase,
  } = useRaiStore();

  const [dotPhraseDialogOpen, setDotPhraseDialogOpen] = useState(false);
  const [editingDotPhrase, setEditingDotPhrase] = useState<DotPhrase | null>(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '' });

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateEditorMode('create');
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setTemplateEditorMode('list');
  };

  const handleCreateDotPhrase = () => {
    setEditingDotPhrase(null);
    setDotPhraseDialogOpen(true);
  };

  const handleEditDotPhrase = (dotPhrase: DotPhrase) => {
    setEditingDotPhrase(dotPhrase);
    setDotPhraseDialogOpen(true);
  };

  const handleDeleteDotPhrase = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const handleDeleteConfirm = () => {
    deleteDotPhrase(deleteDialog.id);
    setDeleteDialog({ open: false, id: '' });
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
      {templateEditorMode === 'list' && (
        <>
          <TemplateList />

          {/* Dot Phrases Section */}
          <Divider sx={{ my: 4 }} />

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Dot Phrases</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateDotPhrase}
              >
                Create Dot Phrase
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create shortcuts that expand into full text when typing notes.
              Use format: .TITLE followed by a space.
            </Typography>

            {dotPhrases.length === 0 ? (
              <Alert severity="info">
                No dot phrases created yet. Click "Create Dot Phrase" to add your first shortcut.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {dotPhrases.map((dp) => (
                  <Grid item xs={12} sm={6} md={4} key={dp.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                            .{dp.titleNormalized}
                          </Typography>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleEditDotPhrase(dp)}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteDotPhrase(dp.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {dp.phrase.length > 100
                            ? dp.phrase.substring(0, 100) + '...'
                            : dp.phrase}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </>
      )}

      {(templateEditorMode === 'create' || templateEditorMode === 'edit') && (
        <TemplateForm onCancel={handleCancel} />
      )}

      {/* Dot Phrase Dialog */}
      <DotPhraseDialog
        open={dotPhraseDialogOpen}
        onClose={() => setDotPhraseDialogOpen(false)}
        editingDotPhrase={editingDotPhrase}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '' })}>
        <DialogTitle>Delete Dot Phrase?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this dot phrase? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: '' })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
