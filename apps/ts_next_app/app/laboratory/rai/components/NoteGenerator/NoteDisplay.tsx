// Note Display Component - Editable note with validation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Paper, IconButton, Tooltip, Snackbar, TextField } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';
import { DotPhrase } from '../../types';

interface NoteDisplayProps {
  note: string;
}

export const NoteDisplay: React.FC<NoteDisplayProps> = ({ note }) => {
  const { dotPhrases } = useRaiStore();
  const [copySuccess, setCopySuccess] = useState(false);
  const [editedNote, setEditedNote] = useState(note);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cursorStateRef = useRef<{ start: number; end: number } | null>(null);

  // Sync editedNote when note prop changes (e.g., regeneration)
  useEffect(() => {
    setEditedNote(note);
  }, [note]);

  // Validation/transformation logic
  const validateAndTransform = useCallback((text: string, dotPhrases: DotPhrase[]): string => {
    let result = text;

    // Sort by length descending to avoid partial matches
    // (e.g., .HPI-DIFFERENTIAL before .HPI)
    const sortedPhrases = [...dotPhrases].sort(
      (a, b) => b.titleNormalized.length - a.titleNormalized.length
    );

    // Apply dot phrase replacements
    sortedPhrases.forEach(phrase => {
      // Match: period + normalized title + space (case-sensitive)
      const pattern = new RegExp(`\\.${phrase.titleNormalized} `, 'g');
      result = result.replace(pattern, phrase.phrase + ' ');
    });

    // Legacy test transformation (can be removed later)
    result = result.replace(/\.test /g, ' MAGIC ');

    return result;
  }, []);

  // Debounced version (500ms delay)
  const debouncedValidateRef = useRef<NodeJS.Timeout | null>(null);

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // Update immediately for responsive UI
    setEditedNote(newValue);

    // Clear previous timeout
    if (debouncedValidateRef.current) {
      clearTimeout(debouncedValidateRef.current);
    }

    // Run validation after 500ms of no typing
    debouncedValidateRef.current = setTimeout(() => {
      const transformed = validateAndTransform(newValue, dotPhrases);
      if (transformed !== newValue) {
        // Calculate adjusted cursor position based on text length change
        const diff = transformed.length - newValue.length;
        const newCursorPos = Math.max(0, Math.min(cursorPos + diff, transformed.length));

        // Save for restoration
        cursorStateRef.current = { start: newCursorPos, end: newCursorPos };

        setEditedNote(transformed);
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedValidateRef.current) {
        clearTimeout(debouncedValidateRef.current);
      }
    };
  }, []);

  // Restore cursor position after transformation
  useEffect(() => {
    if (cursorStateRef.current && inputRef.current) {
      const { start, end } = cursorStateRef.current;
      inputRef.current.setSelectionRange(start, end);
      inputRef.current.focus();
      cursorStateRef.current = null;
    }
  }, [editedNote]);

  // Copy edited content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedNote);
      setCopySuccess(true);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Box
      sx={{
        animation: 'fadeIn 0.6s ease-in',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Paper
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
          position: 'relative',
        }}
      >
        {/* Copy button - keep in top-right */}
        <Tooltip title="Copy to clipboard">
          <IconButton
            onClick={handleCopy}
            sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
            color="primary"
          >
            <ContentCopy />
          </IconButton>
        </Tooltip>

        {/* Editable textarea */}
        <TextField
          fullWidth
          multiline
          rows={20}
          value={editedNote}
          onChange={handleNoteChange}
          variant="outlined"
          inputRef={inputRef}
          InputProps={{
            sx: {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
            },
          }}
          sx={{ mt: 1 }}
        />
      </Paper>

      {/* Success notification */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Copied to clipboard!"
      />
    </Box>
  );
};
