'use client';

import React, { useState } from 'react';

/*
   Widget imports 
 */ 


import Chat from './widgets/chat';
import Autocare from './widgets/AutocareSimple';
import Autocare_Dev from './widgets/AutocareV3'; 

import * as tsw from "tidyscripts_web";
import useInit from "../../../hooks/useInit";

import {theme} from "../../theme";
import { ThemeProvider, createTheme } from '@mui/material/styles';

import * as util from "./widgets/util"
import * as prompts from "./prompts"

const log    = tsw.common.logger.get_logger({id:"cds"});
const debug  = tsw.common.util.debug
//const fp     = tsw.common.fp

import * as fb from "../../../src/firebase" ;
const { fu } = fb ; 


import {
    Button,
    TextField,
    CircularProgress,
    Box,
    Typography,
    Card,
    CardContent,
    FormControlLabel,
    Checkbox,
    IconButton,
    ThumbUpIcon,
    ThumbDownIcon,
    ThumbDownOffAltIcon,
    ThumbUpOffAltIcon,
    TroubleshootIcon,
    ExpandMoreIcon,
    AddIcon,
    RemoveIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Slider
} from '../../../src/mui';

const Main = () => {

    let init = async function() {
	/* Assign tidyscripts library to window */
	if (typeof window !== 'undefined') { 
	    Object.assign(window, {
		tsw,
		util,
		debug,
		fu ,
		fb 
	    });
	    log("Main init");
	}
    };

    const default_widget = 'Autocare_Dev';


    let clean_up = ()=> { log("main unmounted"); };
    useInit({ init , clean_up });  //my wrapper around useEffect 

    const [selectedWidget, setSelectedWidget] = useState(default_widget);
    const [widgetWidth, setWidgetWidth] = useState(90); // Default width percentage

    const renderWidget = () => {
	switch (selectedWidget) {
	    case 'Autocare':
		return <Autocare />;
	    case 'Autocare_Dev':
		return <Autocare_Dev />;
	    case 'Chat':
		return <Chat />;
	    default:
		return <Autocare />;
	}
    };

    const handleSliderChange = (event :any, newValue : any) => {
	setWidgetWidth(newValue);
    };

    const WidgetSelector = () => {
		    <Box display="flex" justifyContent="center" marginBottom="20px" width="100%">
		<Grid container spacing={2} justifyContent="center">

		    
		    <Grid item xs={12} sm="auto">
			<Button className="widget-button" style={{marginRight:"10px"}} variant={selectedWidget == "Autocare"          ? "contained" : "outlined" } onClick={() => setSelectedWidget('Autocare')}>Autocare</Button>
		    </Grid>
		    

		    <Grid item xs={12} sm="auto">
			<Button className="widget-button" style={{marginRight:"10px"}} variant={selectedWidget == "Autocare_Dev"      ? "contained" : "outlined" } onClick={() => setSelectedWidget('Autocare_Dev')}>Autocare_Dev</Button>
		    </Grid>

		    <Grid item xs={12} sm="auto">
			<Button className="widget-button" style={{marginRight:"10px"}} variant={selectedWidget == "Chat"              ? "contained" : "outlined" } onClick={() => setSelectedWidget('Chat')}>Chat</Button>
		    </Grid>
		    
		    
		</Grid>
		
	    </Box>

    }

    return (
	<Box display="flex" flexDirection="column" paddingTop="5%" height="100%" width="100%">

	<Box display="flex" justifyContent="center" alignItems="center" marginBottom="3%" width="100%">
	    <Typography variant="h2" color="primary" >Automate.Care</Typography>
	</Box>

	
	<Box flexGrow={1} width={`${widgetWidth}%`} margin="0 auto" display="flex" flexDirection="column">
	    {renderWidget()}
	</Box>
	
	<Box display="flex" justifyContent="center" alignItems="center" marginTop="20px" width="100%">
	    <Typography variant="body1" style={{ marginRight: '10px' }}>Size</Typography>
	    <Slider
		value={widgetWidth}
		      onChange={handleSliderChange}
		      aria-labelledby="widget-width-slider"
		      valueLabelDisplay="auto"
		      min={10}
		      max={100}
		      style={{ width: '30%' }}
	    />
	</Box>
	</Box>
    );
};

export default Main;

