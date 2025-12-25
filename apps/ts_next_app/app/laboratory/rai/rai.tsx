'use client';

// RAI (REI Note Efficiency) Main Component

import React, { useEffect } from 'react';
import { Container, Box, Typography } from '@mui/material';
import * as tsw from 'tidyscripts_web';
import { MainLayout } from './components/Layout/MainLayout';
import { TemplatePicker } from './components/TemplatePicker/TemplatePicker';
import { InformationInput } from './components/InformationInput/InformationInput';
import { NoteGenerator } from './components/NoteGenerator/NoteGenerator';
import { Settings } from './components/Settings/Settings';
import { useRaiStore } from './store/useRaiStore';

const log = tsw.common.logger.get_logger({ id: 'rai' });

declare var window: any;

const RAI: React.FC = () => {
  const { currentView, loadTemplates, loadSettings } = useRaiStore();
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize the app
    log('RAI app initializing...');

    // Load settings from localStorage
    loadSettings();

    // Load templates
    loadTemplates();

    // Expose utilities to window for debugging
    Object.assign(window, {
      tsw,
    });

    log('RAI app initialized');
  }, [loadSettings, loadTemplates]);

  // Log computed styles of container
  useEffect(() => {
    if (containerRef.current) {
      const computed = window.getComputedStyle(containerRef.current);
      log(`Container computed: width=${computed.width}, maxWidth=${computed.maxWidth}, marginLeft=${computed.marginLeft}, marginRight=${computed.marginRight}`);
    }
  });

  const renderView = () => {
    switch (currentView) {
      case 'template_picker':
        return <TemplatePicker />;

      case 'information_input':
        return <InformationInput />;

      case 'note_generator':
        return <NoteGenerator />;

      case 'settings':
        return <Settings />;

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <Container ref={containerRef} maxWidth="lg" sx={{ minWidth: 0, width: '100%' }}>
        <Box sx={{ py: 4 }}>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              background: 'linear-gradient(90deg, #2196F3, #00BCD4, #9C27B0, #2196F3, #00BCD4, #9C27B0)',
              backgroundSize: '300% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradientShift 100s ease infinite',
              '@keyframes gradientShift': {
                '0%': {
                  backgroundPosition: '0% 50%',
                },
                '50%': {
                  backgroundPosition: '100% 50%',
                },
                '100%': {
                  backgroundPosition: '0% 50%',
                },
              },
            }}
          >
            R.AI
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Professional AI medical note generation for Reproductive Endocrinology and Infertility
          </Typography>

          {renderView()}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default RAI;
