
'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Slider } from '@mui/material';

/*
  Widget imports 
 */ 
import BMP from './widgets/BMP';
import Demographics from './widgets/Demographics';
import Medications from './widgets/Medications';
import PromptEngineering from './widgets/prompt_engineering';
import NoteGenerator from './widgets/NoteGenerator';
import Chat from './widgets/chat';
import Autocare from './widgets/Autocare';
import PromptGenerator from './widgets/PromptGenerator';

import * as tsw from "tidyscripts_web";
import useInit from "../../../hooks/useInit";

import {theme} from "../../theme";
import { ThemeProvider, createTheme } from '@mui/material/styles';

import * as util from "./widgets/util"
import * as prompts from "./prompts"

const log = tsw.common.logger.get_logger({id:"cds"});

const CdsApp = () => {

    let init = async function() {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') { 
            Object.assign(window, {
                tsw,
                util,
                prompts
            });
            log("cds init");
        }
    };

    const default_widget = 'Autocare';

    let clean_up = ()=> { log("cds unmounted"); };
    useInit({ init , clean_up });  //my wrapper around useEffect 

    const [selectedWidget, setSelectedWidget] = useState(default_widget);
    const [widgetWidth, setWidgetWidth] = useState(50); // Default width percentage

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
            case 'Autocare':
                return <Autocare />;
            case 'NoteGenerator':
                return <NoteGenerator />;
            case 'PromptGenerator':
                return <PromptGenerator />;
            case 'Chat':
                return <Chat />;
            default:
                return <Chat />;
        }
    };

    const handleSliderChange = (event, newValue) => {
        setWidgetWidth(newValue);
    };

    return (
        <Box width="100%">
            <Box display="flex" justifyContent="left" marginBottom="20px" width="100%">
                <Button style={{marginRight:"10px"}} variant={selectedWidget == "Autocare"          ? "contained" : "outlined" } onClick={() => setSelectedWidget('Autocare')}>Autocare</Button>
                <Button style={{marginRight:"10px"}} variant={selectedWidget == "NoteGenerator"     ? "contained" : "outlined" } onClick={() => setSelectedWidget('NoteGenerator')}>H&P Generator</Button>
                <Button style={{marginRight:"10px"}} variant={selectedWidget == "PromptEngineering" ? "contained" : "outlined" } onClick={() => setSelectedWidget('PromptEngineering')}>Prompt Review</Button>
                <Button style={{marginRight:"10px"}} variant={selectedWidget == "PromptGenerator"   ? "contained" : "outlined" } onClick={() => setSelectedWidget('PromptGenerator')}>Prompt Engineering</Button>
                <Button style={{marginRight:"10px"}} variant={selectedWidget == "Chat"              ? "contained" : "outlined" } onClick={() => setSelectedWidget('Chat')}>Chat</Button>
            </Box>
            <Box display="flex" justifyContent="center" marginBottom="20px" width="100%">
                <Slider
                    value={widgetWidth}
                    onChange={handleSliderChange}
                    aria-labelledby="widget-width-slider"
                    valueLabelDisplay="auto"
                    min={10}
                    max={100}
                    style={{ width: '50%' }}
                />
            </Box>
            <Box width={`${widgetWidth}%`} margin="0 auto">
                {renderWidget()}
            </Box>
        </Box>
    );
};

export default CdsApp;
