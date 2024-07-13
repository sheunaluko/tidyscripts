
import React, { useState } from 'react';
import { generate_quick_prompt } from '../prompts';
import ReactMarkdown from 'react-markdown';
import { FormControl, InputLabel, Select, MenuItem, TextField, Button, Card, CardContent, Typography, Checkbox } from '@mui/material';

const PromptGenerator = () => {
    const [selectedDashboards, setSelectedDashboards] = useState([]);
    const [hpNote, setHpNote] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');

    const dashboards = ["medication_review", "labs", "imaging", "diagnosis_review"];

    const handleGenerate = () => {
        const prompt = generate_quick_prompt(hpNote, selectedDashboards);
        setGeneratedPrompt(prompt);
    };

    return (
        <div>
            <FormControl variant="standard" fullWidth margin="normal">

                <InputLabel>Select Dashboards</InputLabel>
                <Select
                    multiple
                    value={selectedDashboards}
                    onChange={(e) => setSelectedDashboards([...e.target.value])}
                    renderValue={(selected) => selected.join(', ')}
                >
                    {dashboards.map((dashboard) => (
                        <MenuItem key={dashboard} value={dashboard}>
			<Checkbox checked={selectedDashboards.indexOf(dashboard) > -1} />
                            {dashboard}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
                <TextField
                    label="History and Physical Note"
                    multiline
                    rows={4}
                    value={hpNote}
                    onChange={(e) => setHpNote(e.target.value)}
                />
            </FormControl>
            <Button variant="contained" color="primary" onClick={handleGenerate}>
                GENERATE
            </Button>
            {generatedPrompt && (
                <Card variant="outlined" style={{ marginTop: '20px', padding : "20px" }}>
                    <CardContent>
                        <Typography variant="h6">Generated Prompt:</Typography>

                        <ReactMarkdown>{generatedPrompt}</ReactMarkdown>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default PromptGenerator;
