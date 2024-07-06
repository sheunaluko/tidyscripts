
import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { generate_prompt, replacements, general_prompt, general_output_prompt, medication_review_prompt, labs_prompt, diagnosis_review_prompt, examples } from '../prompts';

const PromptEngineering: React.FC = () => {
    const generatedGeneralPrompt = generate_prompt(general_prompt, replacements, examples, 'general');
    const generatedGeneralOutputPrompt = generate_prompt(general_output_prompt, replacements, examples, 'general_output');
    const generatedMedicationReviewPrompt = generate_prompt(medication_review_prompt, replacements, examples, 'medication_review');
    const generatedLabsPrompt = generate_prompt(labs_prompt, replacements, examples, 'labs');
    const generatedDiagnosisReviewPrompt = generate_prompt(diagnosis_review_prompt, replacements, examples, 'diagnosis_review');

    const [selectedExample, setSelectedExample] = React.useState('');

    const handleExampleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedExample(event.target.value as string);
    };

    return (
        <div>
            <h1>Prompt Engineering Widget</h1>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>General Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography>{generatedGeneralPrompt}</Typography>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>General Output Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography>{generatedGeneralOutputPrompt}</Typography>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Medication Review Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography>{generatedMedicationReviewPrompt}</Typography>
                    <FormControl fullWidth>
                        <InputLabel id="medication-review-example-label">Examples</InputLabel>
                        <Select
                            labelId="medication-review-example-label"
                            id="medication-review-example"
                            value={selectedExample}
                            onChange={handleExampleChange}
                        >
                            {examples.medication_review.map((example, index) => (
                                <MenuItem key={index} value={example}>{example}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Labs Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography>{generatedLabsPrompt}</Typography>
                    <FormControl fullWidth>
                        <InputLabel id="labs-example-label">Examples</InputLabel>
                        <Select
                            labelId="labs-example-label"
                            id="labs-example"
                            value={selectedExample}
                            onChange={handleExampleChange}
                        >
                            {examples.labs.map((example, index) => (
                                <MenuItem key={index} value={example}>{example}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Diagnosis Review Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography>{generatedDiagnosisReviewPrompt}</Typography>
                    <FormControl fullWidth>
                        <InputLabel id="diagnosis-review-example-label">Examples</InputLabel>
                        <Select
                            labelId="diagnosis-review-example-label"
                            id="diagnosis-review-example"
                            value={selectedExample}
                            onChange={handleExampleChange}
                        >
                            {examples.diagnosis_review.map((example, index) => (
                                <MenuItem key={index} value={example}>{example}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </AccordionDetails>
            </Accordion>
        </div>
    );
};

export default PromptEngineering;
