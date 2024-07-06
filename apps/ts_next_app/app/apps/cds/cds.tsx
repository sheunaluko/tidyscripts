'use client';
import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import BMP from './widgets/BMP';
import Demographics from './widgets/Demographics';
import Medications from './widgets/Medications';
import PromptEngineering from './widgets/prompt_engineering';

const CdsApp = () => {
    const [selectedWidget, setSelectedWidget] = useState('PromptEngineering');

    const renderWidget = () => {
        switch (selectedWidget) {
            case 'PromptEngineering':
                return <PromptEngineering />;
            case 'BMP':
                return <BMP />;
            case 'Demographics':
                return <Demographics />;
            case 'Medications':
                return <Medications />;
            default:
                return <PromptEngineering />;
        }
    };

    return (
        <Box maxWidth="sm">
            <Box display="flex" justifyContent="space-between" marginBottom="100px" spacing={2}>
                <Button variant="outlined" onClick={() => setSelectedWidget('PromptEngineering')}>Prompt Engineering</Button>
                <Button variant="outlined" onClick={() => setSelectedWidget('BMP')}>BMP</Button>
                <Button variant="outlined" onClick={() => setSelectedWidget('Demographics')}>Demographics</Button>
                <Button variant="outlined" onClick={() => setSelectedWidget('Medications')}>Medications</Button>
            </Box>
            {renderWidget()}
        </Box>
    );
};

export default CdsApp;
