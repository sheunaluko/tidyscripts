// Template Form - Create/Edit template form with validation

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { Save, Cancel, ExpandMore, HelpOutline, CheckCircle, Error } from '@mui/icons-material';
import { useRaiStore } from '../../store/useRaiStore';
import { validateTemplate, extractVariables } from '../../lib/templateParser';
import { TEMPLATE_SYNTAX } from '../../constants';

interface TemplateFormProps {
  onCancel: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ onCancel }) => {
  const {
    templates,
    editingTemplate,
    templateEditorMode,
    createCustomTemplate,
    updateCustomTemplate,
  } = useRaiStore();

  const isEditMode = templateEditorMode === 'edit';
  const isReadOnly = isEditMode && editingTemplate?.isDefault;

  const [formData, setFormData] = useState({
    title: editingTemplate?.title || '',
    description: editingTemplate?.description || '',
    template: editingTemplate?.template || '',
  });

  const [validation, setValidation] = useState(
    validateTemplate(formData, templates, editingTemplate?.id)
  );

  // Validate on form data change
  useEffect(() => {
    const result = validateTemplate(formData, templates, editingTemplate?.id);
    setValidation(result);
  }, [formData, templates, editingTemplate]);

  // Extract variables from template
  const variables = extractVariables(formData.template);

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = () => {
    if (!validation.isValid) return;

    if (isEditMode && editingTemplate) {
      updateCustomTemplate(editingTemplate.id, formData);
    } else {
      createCustomTemplate(formData);
    }
    onCancel(); // Return to list view
  };

  return (
    <Box>
      <Paper sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {isReadOnly && (
          <Alert severity="info" sx={{ mb: 3 }}>
            This is a default template and cannot be edited. You can view the structure below.
          </Alert>
        )}

        {/* Title Field */}
        <TextField
          label="Template Title"
          fullWidth
          required
          value={formData.title}
          onChange={handleChange('title')}
          error={!!validation.errors.title}
          helperText={validation.errors.title || 'Give your template a clear, descriptive name'}
          disabled={isReadOnly}
          sx={{
            mb: 3,
            '& .MuiFormLabel-root.Mui-error': { color: 'warning.main' },
            '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main' },
            '& .MuiFormHelperText-root.Mui-error': { color: 'warning.main' },
          }}
          inputProps={{ maxLength: 100 }}
        />

        {/* Description Field */}
        <TextField
          label="Description"
          fullWidth
          required
          value={formData.description}
          onChange={handleChange('description')}
          error={!!validation.errors.description}
          helperText={
            validation.errors.description ||
            'Briefly describe when to use this template'
          }
          disabled={isReadOnly}
          sx={{
            mb: 3,
            '& .MuiFormLabel-root.Mui-error': { color: 'warning.main' },
            '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main' },
            '& .MuiFormHelperText-root.Mui-error': { color: 'warning.main' },
          }}
          inputProps={{ maxLength: 500 }}
        />

        {/* Validation Status Alert */}
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
              No variables detected yet. <br/> Add variables using {'{{VARIABLE}}'} for simple replacement,{' '}
              {'{{ @variable | fallback }}'} for presence/absence, or{' '}
              {'{{ @variable? | true | false | undefined }}'} for boolean conditionals.
	      <br/> Optionally, end the template with @END_TEMPLATE, after which you can include direct text based instructions to the Voice Agent.
	      <br/> Expand syntax guide below for details.
            </Typography>
          )}
        </Box>

        {/* Template Syntax Help (Expandable) */}
        <Accordion sx={{ mb: 3, bgcolor: 'background.default' }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpOutline color="primary" fontSize="small" />
              <Typography variant="subtitle2">Template Syntax Guide</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {TEMPLATE_SYNTAX.description}
            </Typography>

            {TEMPLATE_SYNTAX.patterns.map((pattern, idx) => (
              <Box key={idx} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {pattern.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    bgcolor: 'action.hover',
                    p: 1,
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  {pattern.syntax}
                </Typography>
                <List dense>
                  {pattern.rules.map((rule, ruleIdx) => (
                    <ListItem key={ruleIdx} sx={{ py: 0 }}>
                      <ListItemText
                        primary={rule}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Examples:
                </Typography>
                {pattern.examples.map((example, exIdx) => (
                  <Typography
                    key={exIdx}
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      ml: 2,
                    }}
                  >
                    {example}
                  </Typography>
                ))}
                {idx < TEMPLATE_SYNTAX.patterns.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              {TEMPLATE_SYNTAX.traditional.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'action.hover',
                p: 1,
                borderRadius: 1,
                mb: 1,
              }}
            >
              {TEMPLATE_SYNTAX.traditional.syntax}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {TEMPLATE_SYNTAX.traditional.examples.join(' • ')}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              {TEMPLATE_SYNTAX.specialMarkers.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'action.hover',
                p: 1,
                borderRadius: 1,
                mb: 1,
              }}
            >
              {TEMPLATE_SYNTAX.specialMarkers.marker}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {TEMPLATE_SYNTAX.specialMarkers.description}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
              {TEMPLATE_SYNTAX.specialMarkers.usage}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Example:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontFamily: 'monospace',
                color: 'text.secondary',
                bgcolor: 'action.hover',
                p: 1,
                borderRadius: 1,
                whiteSpace: 'pre-wrap',
                mt: 1,
              }}
            >
              {TEMPLATE_SYNTAX.specialMarkers.example}
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Template Text Field */}
        <TextField
          label="Template Text"
          fullWidth
          required
          multiline
          minRows={15}
          maxRows={40}
          value={formData.template}
          onChange={handleChange('template')}
          error={!!validation.errors.template}
          helperText={
            validation.errors.template ||
            'See Template Syntax Guide above for variable formatting. Drag to resize.'
          }
          disabled={isReadOnly}
          sx={{
            mb: 2,
            '& .MuiFormLabel-root.Mui-error': { color: 'warning.main' },
            '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: 'warning.main' },
            '& .MuiFormHelperText-root.Mui-error': { color: 'warning.main' },
            '& textarea': {
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
            },
          }}
        />

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {validation.warnings.map((warning, index) => (
              <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                {warning}
              </Alert>
            ))}
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" startIcon={<Cancel />} onClick={onCancel}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={!validation.isValid}
            >
              {isEditMode ? 'Save Changes' : 'Create Template'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
