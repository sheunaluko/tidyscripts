'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import { alpha, useTheme } from '@mui/material/styles';
import { VoiceInterface } from '../components/voice_interface';

interface ComponentDemo {
  name: string;
  category: string;
  description: string;
  component: React.ReactNode;
  code: string;
  props?: { name: string; type: string; description: string }[];
}

export const ComponentViewerClient = () => {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedDemo, setExpandedDemo] = useState<string | false>('voice-interface-basic');

  // Component demos registry
  const demos: ComponentDemo[] = [
    {
      name: 'Interruptible Voice Interface',
      category: 'voice',
      description: 'VAD-based voice interface with automatic TTS interruption (uses ephemeral tokens)',
      component: (
        <VoiceInterface
          onTranscription={(text) => console.log('Transcription:', text)}
          onInterrupt={() => console.log('Interrupted!')}
        />
      ),
      code: `<VoiceInterface
  onTranscription={(text) => console.log('Transcription:', text)}
  onInterrupt={() => console.log('Interrupted!')}
/>`,
      props: [
        {
          name: 'vadType',
          type: "'semantic_vad' | 'server_vad'",
          description: 'Type of Voice Activity Detection (default: semantic_vad)',
        },
        {
          name: 'onTranscription',
          type: '(text: string) => void',
          description: 'Callback fired when speech is transcribed',
        },
        {
          name: 'onInterrupt',
          type: '() => void',
          description: 'Callback fired when TTS is interrupted by user speech',
        },
      ],
    },
  ];

  const categories = ['all', ...Array.from(new Set(demos.map((d) => d.category)))];

  const filteredDemos = selectedCategory === 'all'
    ? demos
    : demos.filter((d) => d.category === selectedCategory);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Component Viewer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse, test, and explore Tidyscripts components in isolation
        </Typography>
      </Box>

      {/* Category Tabs */}
      <Paper elevation={0} sx={{ mb: 3, background: 'transparent' }}>
        <Tabs
          value={selectedCategory}
          onChange={(_, value) => setSelectedCategory(value)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {categories.map((category) => (
            <Tab
              key={category}
              label={category.toUpperCase()}
              value={category}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Component Demos */}
      <Box display="flex" flexDirection="column" gap={2}>
        {filteredDemos.map((demo, index) => (
          <Accordion
            key={index}
            expanded={expandedDemo === `${demo.category}-${index}`}
            onChange={(_, isExpanded) =>
              setExpandedDemo(isExpanded ? `${demo.category}-${index}` : false)
            }
            sx={{
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              '&:before': {
                display: 'none',
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '&:hover': {
                  background: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Chip
                  label={demo.category}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Box>
                  <Typography variant="h6">{demo.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {demo.description}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={3}>
                {/* Live Demo */}
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="primary"
                    gutterBottom
                    sx={{ mb: 2 }}
                  >
                    Live Demo
                  </Typography>
                  <Box
                    sx={{
                      p: 3,
                      background: alpha(theme.palette.background.default, 0.5),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    {demo.component}
                  </Box>
                </Box>

                <Divider />

                {/* Code Example */}
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CodeIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      Code Example
                    </Typography>
                  </Box>
                  <Paper
                    sx={{
                      p: 2,
                      background: alpha(theme.palette.grey[900], 0.9),
                      color: theme.palette.grey[100],
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      maxHeight: 300,
                    }}
                  >
                    <pre>{demo.code}</pre>
                  </Paper>
                </Box>

                {/* Props Documentation */}
                {demo.props && (
                  <>
                    <Divider />
                    <Box>
                      <Typography
                        variant="subtitle2"
                        color="primary"
                        gutterBottom
                        sx={{ mb: 2 }}
                      >
                        Props
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {demo.props.map((prop, i) => (
                          <Paper
                            key={i}
                            variant="outlined"
                            sx={{
                              p: 2,
                              background: alpha(theme.palette.background.default, 0.3),
                            }}
                          >
                            <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                              >
                                {prop.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  color: theme.palette.info.main,
                                }}
                              >
                                {prop.type}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {prop.description}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Footer */}
      <Box mt={6} textAlign="center">
        <Typography variant="caption" color="text.secondary">
          Component Viewer • Tidyscripts Laboratory
        </Typography>
      </Box>
    </Container>
  );
};
