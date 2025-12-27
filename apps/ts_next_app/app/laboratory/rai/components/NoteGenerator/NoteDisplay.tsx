// Note Display Component - Editable note with validation

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Paper, IconButton, Tooltip, Snackbar, TextField, Typography } from '@mui/material';
import { ContentCopy, ArrowBack, ArrowForward, Check } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';
import { DotPhrase, NoteCheckpoint } from '../../types';
import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'rai-note-display' });

interface NoteDisplayProps {
  note: string;
}

export const NoteDisplay: React.FC<NoteDisplayProps> = ({ note }) => {
  const {
    dotPhrases,
    uiCheckpoints,
    currentCheckpointIndex,
    isBrowsingCheckpoints,
    addAnalyticsCheckpoint,
    navigateCheckpoint,
    acceptCheckpoint,
  } = useRaiStore();
  const [copySuccess, setCopySuccess] = useState(false);

  // Initialize editedNote from last checkpoint if available, otherwise use note prop
  const [editedNote, setEditedNote] = useState(() => {
    log(`[Mount] uiCheckpoints: ${uiCheckpoints.length}, index: ${currentCheckpointIndex}, note: ${note.length} chars`);
    if (uiCheckpoints.length > 0 && currentCheckpointIndex === -1) {
      // In live mode with checkpoints - restore from last checkpoint
      const lastCheckpoint = uiCheckpoints[uiCheckpoints.length - 1];
      log(`[Mount] Restoring from last checkpoint: ${lastCheckpoint.content.length} chars`);
      return lastCheckpoint.content;
    }
    log('[Mount] Using note prop for initialization');
    return note;
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cursorStateRef = useRef<{ start: number; end: number } | null>(null);

  // Helper to add checkpoint to both arrays
  const addCheckpoint = useCallback((content: string, type: 'user_edit' | 'transformation') => {
    // Always add to analytics
    addAnalyticsCheckpoint(content, type);

    // Add to UI checkpoints only if in live editing mode
    if (currentCheckpointIndex === -1) {
      // Normal case: append to UI checkpoints
      const checkpoint: NoteCheckpoint = {
        id: crypto.randomUUID(),
        content,
        timestamp: new Date(),
        type,
      };

      const newUiCheckpoints = [...uiCheckpoints, checkpoint];
      useRaiStore.setState({ uiCheckpoints: newUiCheckpoints });
    }
  }, [addAnalyticsCheckpoint, currentCheckpointIndex, uiCheckpoints]);

  // Determine what content to display
  const displayContent = useMemo(() => {
    if (currentCheckpointIndex === -1) {
      // Live editing mode - show editedNote
      return editedNote;
    } else {
      // Navigating - show checkpoint content
      return uiCheckpoints[currentCheckpointIndex]?.content || editedNote;
    }
  }, [currentCheckpointIndex, editedNote, uiCheckpoints]);

  // Sync editedNote when note prop changes (only for NEW generated notes)
  const prevNoteRef = useRef(note);
  useEffect(() => {
    // Only reset if:
    // 1. Note is non-empty (actual new generation, not just navigation)
    // 2. OR we have no checkpoints (fresh start)
    if (note.length > 0 || uiCheckpoints.length === 0) {
      if (prevNoteRef.current !== note) {
        log(`[Note prop changed] Setting editedNote to note prop: ${note.length} chars`);
        setEditedNote(note);
        prevNoteRef.current = note;
      }
    } else {
      log(`[Note prop changed] Ignoring empty note - keeping existing edits (${uiCheckpoints.length} checkpoints)`);
    }
  }, [note, uiCheckpoints.length]);

  // Sync editedNote when navigating to a checkpoint
  useEffect(() => {
    if (currentCheckpointIndex !== -1) {
      setEditedNote(uiCheckpoints[currentCheckpointIndex]?.content || '');
    }
  }, [currentCheckpointIndex, uiCheckpoints]);

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
      // Save checkpoint BEFORE transformation
      addCheckpoint(newValue, 'user_edit');

      const transformed = validateAndTransform(newValue, dotPhrases);
      if (transformed !== newValue) {
        // Calculate adjusted cursor position
        const diff = transformed.length - newValue.length;
        const newCursorPos = Math.max(0, Math.min(cursorPos + diff, transformed.length));

        // Save for restoration
        cursorStateRef.current = { start: newCursorPos, end: newCursorPos };

        setEditedNote(transformed);

        // Save checkpoint AFTER transformation
        addCheckpoint(transformed, 'transformation');
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

  // Copy displayed content (edited or checkpoint)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
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

        {/* Navigation Controls */}
        {uiCheckpoints.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <Tooltip title="Browse backwards">
              <span>
                <IconButton
                  onClick={() => navigateCheckpoint('back')}
                  disabled={currentCheckpointIndex === 0}
                  size="small"
                  color="primary"
                >
                  <ArrowBack />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Browse forwards">
              <span>
                <IconButton
                  onClick={() => navigateCheckpoint('forward')}
                  disabled={currentCheckpointIndex === -1 || currentCheckpointIndex >= uiCheckpoints.length - 1}
                  size="small"
                  color="primary"
                >
                  <ArrowForward />
                </IconButton>
              </span>
            </Tooltip>

            {/* Accept/Checkmark button - only show when browsing */}
            {isBrowsingCheckpoints && (
              <Tooltip title="Accept this checkpoint">
                <IconButton
                  onClick={acceptCheckpoint}
                  size="small"
                  color="success"
                >
                  <Check />
                </IconButton>
              </Tooltip>
            )}

            <Typography variant="caption" color="text.secondary">
              {isBrowsingCheckpoints
                ? `Browsing: ${currentCheckpointIndex + 1} of ${uiCheckpoints.length}`
                : ``
              }
            </Typography>
          </Box>
        )}

        {/* Editable textarea */}
        <TextField
          fullWidth
          multiline
          rows={20}
          value={displayContent}
          onChange={handleNoteChange}
          disabled={isBrowsingCheckpoints}
          variant="outlined"
          inputRef={inputRef}
          InputProps={{
            sx: {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              bgcolor: isBrowsingCheckpoints ? 'action.hover' : 'background.paper',
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
