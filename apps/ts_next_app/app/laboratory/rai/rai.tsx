'use client';

// RAI (REI Note Efficiency) Main Component

import React, { useEffect } from 'react';
import { Container, Box, Typography } from '@mui/material';
import * as tsw from 'tidyscripts_web';
import { MainLayout } from './components/Layout/MainLayout';
import { TemplatePicker } from './components/TemplatePicker/TemplatePicker';
import { InformationInput } from './components/InformationInput/InformationInput';
import { NoteGenerator } from './components/NoteGenerator/NoteGenerator';
import { TemplateEditor } from './components/TemplateEditor/TemplateEditor';
import { Settings } from './components/Settings/Settings';
import { TestInterface } from './components/TestInterface';
import { useRaiStore } from './store/useRaiStore';
import { useHashRouter } from './hooks/useHashRouter';
import { InsightsProvider, useInsights } from './context/InsightsContext';
import { Manual } from './components/Manual/Manual';
import { test_app_data_store, clear_app_data_store_test } from './lib/test_app_data_store';

const log = tsw.common.logger.get_logger({ id: 'rai' });

declare var window: any;

const RAIContent: React.FC = () => {
  const { currentView, loadTemplates, loadSettings, loadTestHistory, loadDotPhrases } = useRaiStore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { client: insightsClient } = useInsights();

  // Initialize hash router
  useHashRouter();

  // Initialize app once insights client is ready
  useEffect(() => {
    if (!insightsClient) return;

    (async () => {
      log('RAI app initializing...');

      // Suppress verbose logs
      tsw.common.logger.suppress('MainLayout', 'Too verbose for RAI app');
      tsw.common.logger.suppress('Sidebar', 'Too verbose for RAI app');
      tsw.common.logger.suppress('router', 'Too verbose for RAI app');

      // Bind InsightsClient to the store for auto-instrumentation
      useRaiStore.setInsights(insightsClient);

      // Load settings first — resolves storage backend (local vs cloud)
      await loadSettings();

      // Load data in parallel — individual catches prevent one failure from blocking the rest
      await Promise.all([
        loadTemplates().catch(err => log('Failed to load templates: ' + err)),
        loadTestHistory().catch(err => log('Failed to load test history: ' + err)),
        loadDotPhrases().catch(err => log('Failed to load dot phrases: ' + err)),
      ]);

      // Expose utilities to window for debugging
      // Note: window.__rai__ (dispatch, getState) is auto-exposed by createInsightStore
      Object.assign(window, {
        tsw,
        test_app_data_store,
        clear_app_data_store_test,
      });

      log('RAI app initialized');
    })();
  }, [insightsClient, loadSettings, loadTemplates, loadTestHistory, loadDotPhrases]);

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

      case 'template_editor':
        return <TemplateEditor />;

      case 'test_interface':
        return <TestInterface />;

      case 'settings':
        return <Settings />;

      case 'manual':
        return <Manual />;

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

// Main RAI component wrapped with InsightsProvider
const RAI: React.FC = () => {
  return (
    <InsightsProvider appName="rai" appVersion="2.0.0">
      <RAIContent />
    </InsightsProvider>
  );
};

export default RAI;
