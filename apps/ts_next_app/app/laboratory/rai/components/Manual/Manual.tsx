import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sections, DocSection } from '../../docs';

export const Manual: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>(sections[0]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', gap: 3, flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Table of Contents */}
      <Paper
        sx={{
          width: isMobile ? '100%' : 220,
          flexShrink: 0,
          position: isMobile ? 'static' : 'sticky',
          top: 24,
          alignSelf: 'flex-start',
          overflow: 'hidden',
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, color: 'text.secondary' }}>
          Contents
        </Typography>
        <List dense disablePadding>
          {sections.map(section => (
            <ListItem key={section.id} disablePadding>
              <ListItemButton
                selected={activeSection.id === section.id}
                onClick={() => setActiveSection(section)}
                sx={{ py: 1, px: 2 }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Content */}
      <Paper sx={{ flex: 1, p: 4, minWidth: 0 }}>
        <Box
          sx={{
            '& h2': { mt: 0, mb: 2, fontSize: '1.5rem', fontWeight: 600 },
            '& h3': { mt: 3, mb: 1.5, fontSize: '1.15rem', fontWeight: 600 },
            '& p': { mb: 1.5, lineHeight: 1.7 },
            '& ul, & ol': { mb: 1.5, pl: 3 },
            '& li': { mb: 0.5 },
            '& code': {
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontSize: '0.85em',
              backgroundColor: theme.palette.action.hover,
              fontFamily: 'monospace',
            },
            '& pre': {
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
              '& code': { px: 0, py: 0, backgroundColor: 'transparent' },
            },
            '& table': {
              width: '100%',
              borderCollapse: 'collapse',
              mb: 2,
              '& th, & td': {
                border: `1px solid ${theme.palette.divider}`,
                px: 1.5,
                py: 1,
                textAlign: 'left',
              },
              '& th': {
                backgroundColor: theme.palette.action.hover,
                fontWeight: 600,
              },
            },
            '& blockquote': {
              borderLeft: `4px solid ${theme.palette.warning.main}`,
              pl: 2,
              py: 0.5,
              my: 2,
              mx: 0,
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(237, 108, 2, 0.08)'
                : 'rgba(237, 108, 2, 0.05)',
              borderRadius: '0 4px 4px 0',
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {activeSection.content}
          </ReactMarkdown>
        </Box>
      </Paper>
    </Box>
  );
};
