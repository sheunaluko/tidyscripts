
import React, { useState } from 'react';

import { Button, TextField, Drawer, CircularProgress, Tabs, Tab } from '@mui/material';
import { generate_hp, get_dashboard_info } from './util';

const Autocare = () => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [dashboard, setDashboard] = useState('medication_review');

    const handleGenerate = async () => {
        setLoading(true);
        const generatedNote = await generate_hp(note);
        setNote(generatedNote);
        await handleAnalyze(generatedNote);
    };

    const handleAnalyze = async (text) => {
        setLoading(true);
        const info = await get_dashboard_info(text, dashboard);
        // Handle the info as needed
        setLoading(false);
        setOpen(false);
    };

    return (
        <div>
            <Button onClick={() => setOpen(true)}>Expand</Button>
            <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
                <div>
                    <TextField
                        label="History and Physical Note"
                        multiline
                        rows={10}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        variant="outlined"
                    />
                    <Button onClick={handleGenerate}>Auto Generate</Button>
                    <Button onClick={() => handleAnalyze(note)}>Analyze</Button>
                </div>
            </Drawer>
            {loading ? (
                <CircularProgress />
            ) : (
                <div>
                    <Tabs
                        value={dashboard}
                        onChange={(e, newValue) => setDashboard(newValue)}
                    >
                        <Tab label="Medication Review" value="medication_review" />
                        <Tab label="Lab Review" value="labs" />
                        <Tab label="Imaging Review" value="imaging" />
                        <Tab label="Assessment and Plan Review" value="diagnosis_review" />
                    </Tabs>
                    {/* Display dashboard info here */}
                </div>
            )}
        </div>
    );
};

export default Autocare;
