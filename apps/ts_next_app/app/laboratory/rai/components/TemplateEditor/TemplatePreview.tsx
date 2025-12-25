// Template Preview - Shows template structure and extracted variables

import React from 'react';
import { Box, Typography, Paper, Chip, Alert } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { extractVariables } from '../../lib/templateParser';
import { TemplateValidation } from '../../lib/templateParser';

interface TemplatePreviewProps {
  title: string;
  template: string;
  validation: TemplateValidation;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  title,
  template,
  validation,
}) => {
  const variables = extractVariables(template);

  return (
    <Paper
      sx={{
        p: 3,
        position: 'sticky',
        top: 24,
        maxHeight: 'calc(100vh - 150px)',
        overflowY: 'auto',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Template Preview
      </Typography>

      {/* Validation Status */}
      <Box sx={{ mb: 3 }}>
        {validation.isValid ? (
          <Alert severity="success" icon={<CheckCircle />}>
            Template is valid and ready to save
          </Alert>
        ) : (
          <Alert severity="warning" icon={<Error />}>
            Please fix the errors before saving
          </Alert>
        )}
      </Box>

      {/* Variables Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Variables ({variables.length})
        </Typography>
        {variables.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {variables.map((variable, index) => (
              <Chip
                key={index}
                label={variable}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No variables detected yet. Add variables using {'{{VARIABLE}}'} or{' '}
            {'{{ @variable | fallback }}'} syntax.
          </Typography>
        )}
      </Box>

      {/* Template Preview */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Template Structure
        </Typography>
        <Box
          sx={{
            mt: 1,
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
            '& p': { mb: 1 },
            '& ul, & ol': { pl: 3, mb: 1 },
            '& strong': { fontWeight: 600 },
            '& code': {
              bgcolor: 'action.hover',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.9em',
            },
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {template.trim() ? (
            <ReactMarkdown>{template}</ReactMarkdown>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Template preview will appear here...
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
