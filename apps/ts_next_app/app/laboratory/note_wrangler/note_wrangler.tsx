'use client';

import React, { useState, useEffect } from 'react';

import { z } from "zod" ;
import { zodResponseFormat } from 'openai/helpers/zod' ; 

import {
  Button,
  Typography,
  Container,
  Box,
  TextField,
  Slider,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import * as tsw from "tidyscripts_web";
import * as fb  from "../../../src/firebase";
import { CONVERSION_INSTRUCTIONS } from './instructions';

const log = tsw.common.logger.get_logger({ id: "wrangler" });
const debug = tsw.common.util.debug;
declare var window : any  ;

const ai_client = fb.create_wrapped_client({
    app_id : "note_wrangler" ,
    origin_id : "general"  ,
    log
});

const ai_structured_client = fb.create_wrapped_structured_client({
    app_id : "note_wrangler" ,
    origin_id : "structured"  ,
    log 
});


/*

Structured client usage: 

       let response_format = zodResponseFormat( z.oject({ ... }) , 'response_name' ) 

       //can use z.string(), z.array() etc.. to build the response format 

	let args = {
	    model : ai_model , 
	    messages : [ {role : 'system' , content : 'you are an expert medical assistant'} , { role : 'user' , content : prompt } ] ,
	    response_format
	}

	// -- query the AI with the prompt
	const _response = await ai_structured_client.beta.chat.completions.parse(args)

	log("Received response!")
	debug.add("structured_response" , _response) ;
	
	const response = JSON.parse(_response.choices[0].message.content) ;
	
	//response should actually be the structured json content now 	
	debug.add("parsed_response" , response) ;	
   
        //use parsed response 


*/

const default_model = "o4-mini";

const verbosityLabels = {
  1: 'Very Brief',
  2: 'Brief',
  3: 'Standard',
  4: 'Detailed',
  5: 'Very Detailed'
};

const NoteWrangler = () => {

  const [progressNote, setProgressNote] = useState('');
  const [verbosity, setVerbosity] = useState(3);
  const [model, setModel] = useState(default_model);
  const [output, setOutput] = useState('');
  const [verificationReport, setVerificationReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const buildPrompt = (note: string, verbosityLevel: number): string => {
    const verbosityGuidance = {
      1: 'Be extremely concise. Use minimal words. Focus only on critical information.',
      2: 'Be concise. Include essential details but keep it brief.',
      3: 'Provide a balanced level of detail. Include important clinical information.',
      4: 'Be detailed. Include comprehensive clinical information and context.',
      5: 'Be very detailed. Include all relevant clinical information, reasoning, and context.'
    };

    return `${CONVERSION_INSTRUCTIONS}

VERBOSITY LEVEL: ${verbosityLevel}/5 (${verbosityLabels[verbosityLevel as keyof typeof verbosityLabels]})
${verbosityGuidance[verbosityLevel as keyof typeof verbosityGuidance]}

Please convert the following progress note into a discharge summary following all the transformation principles outlined above.

PROGRESS NOTE:
${note}

Please provide the discharge summary now:`;
  };


    useEffect( ()=> {
	Object.assign(window, {
	    tsw ,
	})

    },[] ) 

    
  const handleConvert = async () => {
    if (!progressNote.trim()) {
      setError('Please enter a progress note to convert');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');
    setVerificationReport('');
    setActiveTab(0);

    try {
      const prompt = buildPrompt(progressNote, verbosity);

      const response = await ai_client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert medical documentation assistant specializing in converting progress notes to discharge summaries.' },
          { role: 'user', content: prompt }
        ]
      });

      const content = response.choices[0].message.content;
      debug.add("discharge_summary_output", content);

      setOutput(content || 'No output generated');

      // Run verification
      if (content) {
        runVerification(progressNote, content);
      }
    } catch (err: any) {
      log('Error converting note:') ; log(err);
      setError(err?.message || 'An error occurred during conversion');
    } finally {
      setLoading(false);
    }
  };

  const runVerification = async (originalNote: string, dischargeSummary: string) => {
    setVerifying(true);
    setVerificationReport('');

    try {
      const verificationPrompt = `You are a medical documentation verification assistant. Your task is to compare an original progress note with a generated discharge summary and produce a detailed verification report.

ORIGINAL PROGRESS NOTE:
${originalNote}

GENERATED DISCHARGE SUMMARY:
${dischargeSummary}

Please analyze both documents and create a verification report with the following categories:

1. [ORIGINAL] - Clinical facts that appear in both documents, either unchanged or with minimal transformation (e.g., formatting, minor wording)
2. [TRANSFORMED] - Clinical facts from the original that were significantly rephrased, had tense changes, or were restructured but preserve the same clinical meaning
3. [INFERRED] - Information in the discharge summary that was NOT explicitly stated in the original progress note (assumptions, placeholders like ***, or added context)
4. [MISSING] - Important clinical information from the original progress note that did NOT make it into the discharge summary

Format your response as a clear report with each category as a section. List specific clinical facts, diagnoses, procedures, medications, plans, etc. under each category. Be thorough and specific.

VERIFICATION REPORT:`;

      const verificationResponse = await ai_client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: 'You are a medical documentation verification assistant. Be thorough, specific, and focus on clinical accuracy.' },
          { role: 'user', content: verificationPrompt }
        ]
      });

      const verificationContent = verificationResponse.choices[0].message.content;
      debug.add("verification_report", verificationContent);

      setVerificationReport(verificationContent || 'No verification report generated');
    } catch (err: any) {
      log('Error generating verification report:'); log(err);
      setVerificationReport('Failed to generate verification report: ' + (err?.message || 'Unknown error'));
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
    } catch (err) {
      log('Failed to copy to clipboard:'); log(err);
      setError('Failed to copy to clipboard');
    }
  };

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

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant='h6' gutterBottom>
            Input Progress Note
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={12}
            variant="outlined"
            placeholder="Paste progress note here..."
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant='subtitle1' gutterBottom>
            Verbosity Level: {verbosity} - {verbosityLabels[verbosity as keyof typeof verbosityLabels]}
          </Typography>
          <Slider
            value={verbosity}
            onChange={(_, value) => setVerbosity(value as number)}
            min={1}
            max={5}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 3 }}
          />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="model-select-label">Model</InputLabel>
            <Select
              labelId="model-select-label"
              id="model-select"
              value={model}
              label="Model"
              onChange={(e) => setModel(e.target.value)}
            >
              <MenuItem value="o4-mini">o4-mini (reasoning)</MenuItem>
              <MenuItem value="gpt-4.1-mini">gpt-4.1-mini</MenuItem>
              <MenuItem value="chatgpt-4o-latest">chatgpt-4o-latest (used in chat.openai.com)</MenuItem>
              <MenuItem value="gpt-4o">gpt-4o</MenuItem>
              <MenuItem value="gpt-4.1">gpt-4.1</MenuItem>
              <MenuItem value="o1">o1 (reasoning)</MenuItem>
              <MenuItem value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant='contained'
            color='primary'
            size='large'
            onClick={handleConvert}
            disabled={loading || !progressNote.trim()}
            sx={{ minWidth: 150 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Convert'}
          </Button>
        </Paper>

        {output && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Discharge Summary" />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Verification Report
                      {verifying && <CircularProgress size={16} />}
                    </Box>
                  }
                  disabled={!verificationReport && !verifying}
                />
              </Tabs>
            </Box>

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
                  value={output}
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

            {activeTab === 1 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant='h6'>
                    Verification Report
                  </Typography>
                  {verifying && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant='caption' color='text.secondary'>
                        Generating verification report...
                      </Typography>
                    </Box>
                  )}
                </Box>
                {verificationReport && (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      maxHeight: '600px',
                      overflowY: 'auto',
                      '& pre': {
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        margin: 0,
                        lineHeight: 1.6
                      }
                    }}
                  >
                    <pre style={{
                      color: '#333'
                    }}>
                      {verificationReport.split('\n').map((line, i) => {
                        let color = '#333';
                        let fontWeight = 'normal';

                        if (line.includes('[ORIGINAL]')) {
                          color = '#2e7d32'; // green
                        } else if (line.includes('[TRANSFORMED]')) {
                          color = '#1976d2'; // blue
                        } else if (line.includes('[INFERRED]')) {
                          color = '#ed6c02'; // orange
                        } else if (line.includes('[MISSING]')) {
                          color = '#d32f2f'; // red
                        } else if (line.trim().match(/^[0-9]+\./)) {
                          fontWeight = 'bold';
                        }

                        return (
                          <div key={i} style={{ color, fontWeight }}>
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </Box>
                )}
              </>
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
