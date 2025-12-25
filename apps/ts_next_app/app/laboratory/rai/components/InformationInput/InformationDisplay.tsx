// Information Display Component - Shows collected free text entries

import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import { useRaiStore } from '../../store/useRaiStore';

export const InformationDisplay: React.FC = () => {
  const collectedInformation = useRaiStore((state) => state.collectedInformation);

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
    <Paper sx={{
      p: 2,
      border: '1px solid transparent',
      borderRadius: 1,
      background: (theme) => `
        linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}) padding-box,
        linear-gradient(to right, #2196F3, #00BCD4, #9C27B0, #EA4335) border-box
      `,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
        <Typography variant="h6">Collected Information</Typography>
        <Chip label={`${collectedInformation.length} entries`} size="small" sx={{ ml: 2 }} color="primary" />
      </Box>

      <List sx={{ position: 'relative', zIndex: 1 }}>
        {collectedInformation.map((entry, index) => (
          <ListItem
            key={index}
            sx={{
              bgcolor: 'background.default',
              mb: 1,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          >
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
  );
};
