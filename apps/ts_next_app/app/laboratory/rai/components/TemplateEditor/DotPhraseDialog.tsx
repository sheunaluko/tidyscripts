// Dot Phrase Dialog Component

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useRaiStore } from '../../store/useRaiStore';
import { normalizeDotPhraseTitle } from '../../lib/templateParser';
import { DotPhrase } from '../../types';

interface DotPhraseDialogProps {
  open: boolean;
  onClose: () => void;
  editingDotPhrase?: DotPhrase | null;
}

export const DotPhraseDialog: React.FC<DotPhraseDialogProps> = ({
  open,
  onClose,
  editingDotPhrase,
}) => {
  const { createDotPhrase, updateDotPhrase } = useRaiStore();
  const [title, setTitle] = useState('');
  const [phrase, setPhrase] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingDotPhrase) {
      setTitle(editingDotPhrase.title);
      setPhrase(editingDotPhrase.phrase);
    } else {
      setTitle('');
      setPhrase('');
    }
  }, [editingDotPhrase, open]);

  const handleSave = () => {
    if (!title.trim() || !phrase.trim()) return;

    if (editingDotPhrase) {
      updateDotPhrase(editingDotPhrase.id, { title, phrase });
    } else {
      createDotPhrase(title, phrase);
    }

    onClose();
  };

  const normalizedPreview = normalizeDotPhraseTitle(title);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingDotPhrase ? 'Edit Dot Phrase' : 'Create Dot Phrase'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., HPI Differential"
            helperText={`Will be saved as: .${normalizedPreview || 'TITLE'} `}
            sx={{ mb: 2 }}
            autoFocus
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="The text that will replace the dot phrase"
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Usage: Type .{normalizedPreview || 'TITLE'} followed by a space in the note editor
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!title.trim() || !phrase.trim()}
        >
          {editingDotPhrase ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
