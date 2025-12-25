// Note Display Component - Renders generated markdown note

import React from 'react';
import { Box, Paper, IconButton, Tooltip, Snackbar } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

interface NoteDisplayProps {
  note: string;
}

export const NoteDisplay: React.FC<NoteDisplayProps> = ({ note }) => {
  const [copySuccess, setCopySuccess] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note);
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
      <Paper sx={{
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-100%',
          left: '-100%',
          right: '-100%',
          bottom: '-100%',
          background: 'conic-gradient(from 0deg, #2196F3, #00BCD4, #9C27B0, #2196F3, #00BCD4, #9C27B0, #2196F3)',
          animation: 'gradientRotate 100s linear infinite',
          zIndex: 0,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '1px',
          left: '1px',
          right: '1px',
          bottom: '1px',
          bgcolor: 'background.paper',
          borderRadius: 'inherit',
          zIndex: 0,
        },
        '@keyframes gradientRotate': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
      }}>
        <Tooltip title="Copy to clipboard">
          <IconButton
            onClick={handleCopy}
            sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
            color="primary"
          >
            <ContentCopy />
          </IconButton>
        </Tooltip>

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            '& h1': { fontSize: '1.75rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h2': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h3': { fontSize: '1.25rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
            '& p': { mb: 1 },
            '& ul, & ol': { pl: 3, mb: 1 },
            '& strong': { fontWeight: 600 },
            '& hr': { my: 2 },
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
        >
          <ReactMarkdown>{note}</ReactMarkdown>
        </Box>
      </Paper>

      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess(false)}
        message="Copied to clipboard!"
      />
    </Box>
  );
};
