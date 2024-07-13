
'use client';
import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import BMP from './widgets/BMP';
import Demographics from './widgets/Demographics';
import Medications from './widgets/Medications';
import PromptEngineering from './widgets/prompt_engineering';
import NoteGenerator from './widgets/NoteGenerator';
import Chat from './widgets/chat';

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

    const default_widget = 'NoteGenerator';

    let clean_up = ()=> { log("cds unmounted"); };
    useInit({ init , clean_up });  //my wrapper around useEffect 

    const [selectedWidget, setSelectedWidget] = useState(default_widget);

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
        case 'Chat':
            return <Chat />;
        case 'NoteGenerator':
            return <NoteGenerator />;
        default:
            return <Chat />;
        }
    };

    return (
        <Box maxWidth="sm">
            <Box display="flex" justifyContent="left" marginBottom="100px" >
                <Button style={{marginRight:"10px"}} variant="outlined" onClick={() => setSelectedWidget('NoteGenerator')}>H&P Generator</Button>		
                <Button style={{marginRight:"10px"}} variant="outlined" onClick={() => setSelectedWidget('PromptEngineering')}>Prompt Review</Button>
                {
                   /*
                <Button variant="outlined" onClick={() => setSelectedWidget('BMP')}>BMP</Button>
                <Button variant="outlined" onClick={() => setSelectedWidget('Demographics')}>Demographics</Button>
                <Button variant="outlined" onClick={() => setSelectedWidget('Medications')}>Medications</Button>
                    */
                }
                <Button variant="outlined" onClick={() => setSelectedWidget('Chat')}>Chat</Button>
            </Box>
            {renderWidget()}
        </Box>
    );
};

export default CdsApp;
