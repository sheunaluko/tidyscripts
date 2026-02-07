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
import { useInsights } from '../../context/InsightsContext';

export const InformationDisplay: React.FC = () => {
  const { collectedInformation, updateInformationText, deleteInformationEntry } = useRaiStore();
  const { client: insightsClient } = useInsights();
  const addInsightEvent = (type: string, payload: Record<string, any>) => {
    try { insightsClient?.addEvent(type, payload); } catch (_) {}
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEditClick = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  };

  const handleEditSave = () => {
    if (editingId && editingText.trim()) {
      // Find the index before update
      const index = collectedInformation.findIndex((e) => e.id === editingId);
      const itemNumber = index + 1;
      const originalText = collectedInformation[index]?.text || '';
      const newText = editingText.trim();

      // Update in store
      updateInformationText(editingId, newText);
      addInsightEvent('information_entry_edited', { entryIndex: itemNumber, newText, originalText });

      // Generate renumbered list (after update)
      const renumberedList = collectedInformation
        .map((e, idx) => {
          const text = e.id === editingId ? newText : e.text;
          return `${idx + 1}. "${text}"`;
        })
        .join('\n');

      // Inject user message via session
      const session = (window as any).voiceAgentDebug?.session;
      if (session) {
        try {
          session.sendMessage(`I intentionally updated item ${itemNumber} to "${newText}". The RENUMBERED current list is NOW:\n${renumberedList}\n\n This was intentional so simply acknowledge and do nothing else`);
        } catch (error) {
          console.error('Failed to send update message to agent:', error);
        }
      }

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
      // Find the index before deletion
      const index = collectedInformation.findIndex((e) => e.id === deletingId);
      const itemNumber = index + 1;

      // Delete from store
      const deletedText = collectedInformation[index]?.text || '';
      deleteInformationEntry(deletingId);
      const remainingCount = collectedInformation.length - 1;
      addInsightEvent('information_entry_deleted', { entryIndex: itemNumber, deletedText, remainingCount });

      // Generate renumbered list (after deletion)
      const renumberedList = collectedInformation
        .filter((e) => e.id !== deletingId)
        .map((e, idx) => `${idx + 1}. "${e.text}"`)
        .join('\n');

      // Inject user message via session
      const session = (window as any).voiceAgentDebug?.session;
      if (session) {
        try {
          session.sendMessage(`I intentionally deleted item ${itemNumber}. The RENUMBERED current list is NOW:\n${renumberedList}\n\n This was intentional so simply acknowledge and do nothing else`);
        } catch (error) {
          console.error('Failed to send delete message to agent:', error);
        }
      }

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
          maxHeight: 500,
          overflowY: 'auto',
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
