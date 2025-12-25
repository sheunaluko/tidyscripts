// Template Card Component

import React from 'react';
import { Card, CardContent, CardActionArea, Typography, Chip, Box, IconButton } from '@mui/material';
import { Description, Edit } from '@mui/icons-material';
import { NoteTemplate } from '../../types';

interface TemplateCardProps {
  template: NoteTemplate;
  onSelect: (template: NoteTemplate) => void;
  onEdit: (template: NoteTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onEdit }) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
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
      }}
    >
      {/* Edit Button in Bottom Right */}
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(template);
        }}
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 2,
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          boxShadow: 1,
          padding: '4px',
        }}
        aria-label="Edit template"
      >
        <Edit sx={{ fontSize: 16 }} />
      </IconButton>
      <CardActionArea onClick={() => onSelect(template)} sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
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
