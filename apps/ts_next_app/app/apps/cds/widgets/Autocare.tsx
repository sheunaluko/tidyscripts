
import React, { useState, useEffect } from 'react';
import { Button, TextField, CircularProgress, Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { ObjectInspector } from 'react-inspector';
import { generate_hp, get_all_dashboard_info } from './util';

const Autocare = () => {
    const [open, setOpen] = useState(true);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [dashboardInfo, setDashboardInfo] = useState(null);

    useEffect(() => {
        const storedNote = localStorage.getItem('HP');
        if (storedNote) {
            setNote(storedNote);
        }
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        const generatedNote = await generate_hp(note);
        setNote(generatedNote);
        await handleAnalyze(generatedNote);
        setLoading(false);
    };

    const handleAnalyze = async (text: string) => {
        setLoading(true);
        let info = await get_all_dashboard_info(text);

        // Clean the JSON string
        const startIndex = info.indexOf('[');
        const endIndex = info.lastIndexOf(']') + 1;
        if (startIndex !== -1 && endIndex !== -1) {
            info = info.substring(startIndex, endIndex);
        }

        const jsonInfo = JSON.parse(info);
        setDashboardInfo(jsonInfo);
        setLoading(false);
    };

    return (
        <div>
            <Button
                variant="outlined"
                startIcon={open ? <RemoveIcon /> : <AddIcon />}
                onClick={() => setOpen(!open)}
            >
                {open ? 'HIDE' : 'SHOW'} H&P
            </Button>
            {open && (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    width="50%"
                    padding="10%"
                >
                    <Button
                        variant="outlined"
                        onClick={handleGenerate}
                        style={{ marginBottom: '20px' }}
                    >
                        Auto Generate
                    </Button>
                    {loading && (
                        <Box display="flex" flexDirection="column" alignItems="center" marginBottom="20px">
                            <CircularProgress />
                            <Typography>Generating content</Typography>
                        </Box>
                    )}
                    <TextField
                        label="History and Physical Note"
                        multiline
                        rows={10}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        variant="outlined"
                        style={{ marginBottom: '20px', width: '100%' }}
                    />
                    <Button
                        variant="outlined"
                        onClick={() => handleAnalyze(note)}
                    >
                        Analyze
                    </Button>
                </Box>
            )}
            {dashboardInfo && (
                <Box>
                    <Typography variant="h6">Dashboard Information</Typography>
                    <ObjectInspector data={dashboardInfo} />
                </Box>
            )}
        </div>
    );
};

export default Autocare;
