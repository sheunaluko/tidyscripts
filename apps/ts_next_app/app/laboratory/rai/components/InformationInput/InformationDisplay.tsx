// Information Display Component - Shows collected free text entries

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';

export const InformationDisplay: React.FC = () => {
  const { collectedInformation, updateInformationText, deleteInformationEntry } = useRaiStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEditClick = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  };

  const handleEditSave = () => {
    if (editingId && editingText.trim()) {
      updateInformationText(editingId, editingText.trim());
      setEditingId(null);
      setEditingText('');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteInformationEntry(deletingId);
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
  };

  const getItemNumber = (id: string) => {
    return collectedInformation.findIndex((entry) => entry.id === id) + 1;
  };

  if (collectedInformation.length === 0) {
    return (
      <Paper sx={{ p: 3, bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          No information collected yet
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        sx={{
          p: 2,
          border: '1px solid transparent',
          borderRadius: 1,
          background: (theme) => `
            linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}) padding-box,
            linear-gradient(to right, #2196F3, #00BCD4, #9C27B0, #EA4335) border-box
          `,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
          <Typography variant="h6">Collected Information</Typography>
          <Chip label={`${collectedInformation.length} entries`} size="small" sx={{ ml: 2 }} color="primary" />
        </Box>

        <List sx={{ position: 'relative', zIndex: 1 }}>
          {collectedInformation.map((entry, index) => (
            <ListItem
              key={entry.id}
              sx={{
                bgcolor: 'background.default',
                mb: 1,
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
              secondaryAction={
                <Box>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleEditClick(entry.id, entry.text)}
                    sx={{ mr: 1 }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton edge="end" size="small" onClick={() => handleDeleteClick(entry.id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <Chip
                label={index + 1}
                size="small"
                color="primary"
                sx={{ mr: 2, minWidth: 32, fontWeight: 'bold' }}
              />
              <ListItemText
                primary={entry.text}
                secondary={new Date(entry.timestamp).toLocaleTimeString()}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editingId !== null} onClose={handleEditCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Information Entry #{editingId ? getItemNumber(editingId) : ''}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            placeholder="Enter updated information..."
            sx={{ mt: 2 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary" disabled={!editingText.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingId !== null} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Information Entry?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete entry #{deletingId ? getItemNumber(deletingId) : ''}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            {deletingId && collectedInformation.find((e) => e.id === deletingId)?.text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
