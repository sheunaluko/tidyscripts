'use client';

import React, { useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Alert,
  Snackbar,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import * as tsw from "tidyscripts_web";
import { useNoteConversion } from './hooks/useNoteConversion';
import { InputSection } from './components/InputSection';
import { VerificationReport } from './components/VerificationReport';

declare var window: any;

/*
   
   A cool workflow would be the ability to see the edits in real time 
   -- so there is a chat in the ?top left and the text underneath 
   -- you chat to suggest changes (or press a button from a sliding window beneath the chat [think "make past tense", or "more consise" -- think option to customize /create and then chain together some of these to create edit_flows ) 
   -- the ai model outputs diffs with line nums and char nums; then the editor shows the diffs which can then be accepted or rejected 

 */




const NoteWrangler = () => {
  const {
    progressNote,
    verbosity,
    model,
    versions,
    currentVersionIndex,
    verificationReport,
    verificationState,
    loading,
    verifying,
    error,
    copySuccess,
    activeTab,
    setProgressNote,
    setVerbosity,
    setModel,
    setCurrentVersionIndex,
    setError,
    setCopySuccess,
    setActiveTab,
    generateSummary,
    regenerateSummary,
    handleCopyToClipboard,
    toggleInferredItem,
    toggleMissingItem
  } = useNoteConversion();

  useEffect(() => {
    Object.assign(window, {
      tsw,
    });
  }, []);

  const currentVersion = versions[currentVersionIndex];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant='h4' gutterBottom>
          Note Wrangler
        </Typography>
        <Typography variant='body1' gutterBottom color="text.secondary" sx={{ mb: 4 }}>
          Convert progress notes to discharge summaries using AI
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <InputSection
          progressNote={progressNote}
          verbosity={verbosity}
          model={model}
          loading={loading}
          onProgressNoteChange={setProgressNote}
          onVerbosityChange={setVerbosity}
          onModelChange={setModel}
          onConvert={generateSummary}
        />

        {versions.length > 0 && currentVersion && (
          <Paper elevation={2} sx={{ p: 3 }}>
            {/* Version Selector */}
            {versions.length > 1 && (
              <Box sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="version-select-label">Version</InputLabel>
                  <Select
                    labelId="version-select-label"
                    value={currentVersionIndex}
                    label="Version"
                    onChange={(e) => setCurrentVersionIndex(Number(e.target.value))}
                  >
                    {versions.map((version, idx) => (
                      <MenuItem key={version.id} value={idx}>
                        Version {version.versionNumber} - {version.timestamp.toLocaleTimeString()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Discharge Summary" />
                <Tab
                  label="Verification Report"
                  disabled={!verificationReport && !verifying}
                />
              </Tabs>
            </Box>

            {/* Discharge Summary Tab */}
            {activeTab === 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant='h6'>
                    Discharge Summary
                  </Typography>
                  <Button
                    variant='outlined'
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyToClipboard}
                    size='small'
                  >
                    Copy to Clipboard
                  </Button>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={16}
                  variant="outlined"
                  value={currentVersion.text}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }
                  }}
                />
              </>
            )}

            {/* Verification Report Tab */}
            {activeTab === 1 && (
              <VerificationReport
                report={verificationReport}
                verifying={verifying}
                verificationState={verificationState}
                loading={loading}
                onToggleInferred={toggleInferredItem}
                onToggleMissing={toggleMissingItem}
                onRegenerate={regenerateSummary}
              />
            )}
          </Paper>
        )}

        <Snackbar
          open={copySuccess}
          autoHideDuration={3000}
          onClose={() => setCopySuccess(false)}
          message="Copied to clipboard!"
        />
      </Box>
    </Container>
  );
};

export default NoteWrangler;
