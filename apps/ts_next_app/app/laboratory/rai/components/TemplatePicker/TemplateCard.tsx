// Template Card Component

import React from 'react';
import { Card, CardContent, CardActionArea, Typography, Chip, Box } from '@mui/material';
import { Description } from '@mui/icons-material';
import { NoteTemplate } from '../../types';

interface TemplateCardProps {
  template: NoteTemplate;
  onSelect: (template: NoteTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        animation: 'fadeIn 0.5s ease-in',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={() => onSelect(template)} sx={{ height: '100%' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Description color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {template.title}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, mb: 2 }}>
            {template.description}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label={`${template.variables.length} fields`} size="small" color="primary" variant="outlined" />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
