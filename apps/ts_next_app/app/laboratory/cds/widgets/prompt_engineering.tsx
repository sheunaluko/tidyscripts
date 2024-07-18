
import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import { generate_prompt, replacements, general_prompt, general_output_prompt, medication_review_prompt, labs_prompt, diagnosis_review_prompt, examples } from '../prompts';

import * as tsw from "tidyscripts_web"  ;
import useInit from "../../../../hooks/useInit"

const PromptEngineering: React.FC = () => {



    const theme = useTheme();
    const primaryColor = theme.palette.primary.main;

    const generatedGeneralPrompt = generate_prompt(general_prompt, replacements, examples, 'general');
    const generatedGeneralOutputPrompt = generate_prompt(general_output_prompt, replacements, examples, 'general_output');
    const generatedMedicationReviewPrompt = generate_prompt(medication_review_prompt, replacements, examples, 'medication_review');
    const generatedLabsPrompt = generate_prompt(labs_prompt, replacements, examples, 'labs');
    const generatedDiagnosisReviewPrompt = generate_prompt(diagnosis_review_prompt, replacements, examples, 'diagnosis_review');

    let pd = "20px" 
    return (
        <div>

            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>General Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                   <Box style={{padding : pd}}> <ReactMarkdown>{generatedGeneralPrompt}</ReactMarkdown></Box> 
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <ReactMarkdown>General Output Prompt</ReactMarkdown>
                </AccordionSummary>
                <AccordionDetails>
		                       <Box style={{padding : pd}}> <ReactMarkdown>{generatedGeneralOutputPrompt}</ReactMarkdown></Box> 
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <ReactMarkdown>Medication Review Prompt</ReactMarkdown>
                </AccordionSummary>
                <AccordionDetails>
		    		                       <Box style={{padding : pd}}> <ReactMarkdown>{generatedMedicationReviewPrompt}</ReactMarkdown></Box> 
                    
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <ReactMarkdown>Examples</ReactMarkdown>
                        </AccordionSummary>
                        <AccordionDetails>
                            {examples.medication_review.map((example, index) => (
                                <Box key={index} sx={{ marginBottom: '10px', border: 1, borderColor: 'primary.main', padding: '10px' }}>
                                    <ReactMarkdown>{JSON.stringify(example, null, 2)}</ReactMarkdown>
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <ReactMarkdown>Labs Prompt</ReactMarkdown>
                </AccordionSummary>
                <AccordionDetails>
		    		                       <Box style={{padding : pd}}> <ReactMarkdown>{generatedLabsPrompt}</ReactMarkdown></Box> 

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
			    
                            <ReactMarkdown>Examples</ReactMarkdown>
                        </AccordionSummary>
                        <AccordionDetails>
                            {examples.labs.map((example, index) => (
                                <Box key={index} sx={{ marginBottom: '10px', border: 1, borderColor: 'primary.main', padding: '10px' }}>
                                    <Typography>{JSON.stringify(example, null, 2)}</Typography>
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Diagnosis Review Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
		    		                       <Box style={{padding : pd}}> <ReactMarkdown>{generatedDiagnosisReviewPrompt}</ReactMarkdown></Box> 

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>Examples</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {examples.diagnosis_review.map((example, index) => (
                                <Box key={index} sx={{ marginBottom: '10px', border: 1, borderColor: 'primary.main', padding: '10px' }}>
                                    <Typography>{JSON.stringify(example, null, 2)}</Typography>
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                </AccordionDetails>
            </Accordion>
        </div>
    );
};

export default PromptEngineering;
