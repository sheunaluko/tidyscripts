import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ObjectInspector } from 'react-inspector';
import { generate_hp, get_all_dashboard_info } from './util';

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
    ExpandMoreIcon,
    AddIcon,
    RemoveIcon, 
    Accordion,
    AccordionSummary,
    AccordionDetails 
} from '../../../../src/mui'

import {theme} from "../../../theme"

import * as tsw from "tidyscripts_web"
const log   = tsw.common.logger.get_logger({id:"autocare"})
const debug = tsw.common.util.debug

function DashboardCard({info}) {

    const getCardColor = (action: string) => {
        if (action.includes("medication")) return theme.palette.primary.main;
        if (action.includes("lab")) return theme.palette.secondary.main;
        if (action.includes("imaging")) return theme.palette.info.main;
        if (action.includes("agree") || action.includes("reconsider")) return theme.palette.success.main;
        return theme.palette.warning.main; // Miscellaneous
    };

    const card_style : any  = {
        padding : "10px" ,
        marginBottom : "10px" ,
        cursor : 'pointer' ,
        backgroundColor :  getCardColor(info.action.toLowerCase()),
        borderWidth : "1px" , 
        borderRadius : "10px",
        opacity: 0.6
    } 

    const [thumbsUp, setThumbsUp] = useState(false);
    const [thumbsDown, setThumbsDown] = useState(false);

    const handleThumbsUp = () => {
        setThumbsUp(!thumbsUp);
        if (thumbsDown) setThumbsDown(false);
    };

    const handleThumbsDown = () => {
        setThumbsDown(!thumbsDown);
        if (thumbsUp) setThumbsUp(false);
    };

    let tmp = info.action
    info.action = tmp[0].toUpperCase() + tmp.slice(1)
    
    return (
        <Card style={card_style} >
            <CardContent>
                <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6">{info.action}</Typography>
                    <Box>
                        <IconButton onClick={handleThumbsUp} color={thumbsUp ? "primary" : "default"}>
                            <ThumbUpIcon />
                        </IconButton>
                        <IconButton onClick={handleThumbsDown} color={thumbsDown ? "primary" : "default"}>
                            <ThumbDownIcon />
                        </IconButton>
                    </Box>
                </Box>
                <Typography>{JSON.stringify(info.data)}</Typography>
                <ReactMarkdown>**Reasoning**</ReactMarkdown>        
                <Typography >{info.reasoning}</Typography>
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Caveat</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography>{info.caveat}</Typography>
                    </AccordionDetails>
                </Accordion>
            </CardContent>
        </Card>
    )
} 


 const Autocare = () => {
    
    const [open, setOpen] = useState(true);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [dashboardInfo, setDashboardInfo] = useState(null);
    const [showMedications, setShowMedications] = useState(true);
    const [showLabs, setShowLabs] = useState(true);
    const [showImaging, setShowImaging] = useState(true);
    const [showReasoning, setShowReasoning] = useState(true);
    const [showMiscellaneous, setShowMiscellaneous] = useState(true);

    useEffect(() => {
        const storedNote = localStorage.getItem('HP');
        let info = localStorage.getItem('info');    

        if (storedNote) {
            setNote(storedNote);
        }

        if (info) {
	    let t = JSON.parse(info)
            setDashboardInfo(t)
	    debug.add("dashboardInfo", t ) 
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
        let info = await get_all_dashboard_info(text)
        // the above should return a JSON object

        debug.add('dashboardInfo', info)
        var jsonInfo = (info || [{error : "There was an error parsing the JSON" }])
        setDashboardInfo(jsonInfo);
        setLoading(false);
    };

    return (
        <div>
            <Box display="flex" justifyContent="flex-end" marginBottom="20px">
                <FormControlLabel
                    control={<Checkbox checked={showMedications} onChange={() => setShowMedications(!showMedications)} />}
                    label="Medications"
                />
                <FormControlLabel
                    control={<Checkbox checked={showLabs} onChange={() => setShowLabs(!showLabs)} />}
                    label="Labs"
                />
                <FormControlLabel
                    control={<Checkbox checked={showImaging} onChange={() => setShowImaging(!showImaging)} />}
                    label="Imaging"
                />
                <FormControlLabel
                    control={<Checkbox checked={showReasoning} onChange={() => setShowReasoning(!showReasoning)} />}
                    label="Reasoning"
                />
                <FormControlLabel
                    control={<Checkbox checked={showMiscellaneous} onChange={() => setShowMiscellaneous(!showMiscellaneous)} />}
                    label="Miscellaneous"
                />
            </Box>
            <Button
                variant="outlined"
                startIcon={open ? <RemoveIcon /> : <AddIcon />}
                onClick={() => setOpen(!open)}
            >
                {open ? 'Hide' : 'Show'} Note
            </Button>
            {open && (
		<React.Fragment> 
                <TextField
                    fullWidth
                    multiline
                    rows={10}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    variant="outlined"
                    margin="normal"
                />

            <Button
                variant="contained"
                color="primary"
                onClick={handleGenerate}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            >
                Generate
            </Button>
	    
            <Button
                variant="contained"
                color="primary"
                onClick={handleAnalyze}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            >
                Analyze
            </Button>
		</React.Fragment> 
		
            )}

	    
            <Box marginTop="20px">

		
                {dashboardInfo && dashboardInfo.map((info: any, index: number) => {
                    const actionType = getActionType(info.action);
                    if (
                        (actionType === 'Medication' && showMedications) ||
                        (actionType === 'Lab' && showLabs) ||
                        (actionType === 'Imaging' && showImaging) ||
                        (actionType === 'Reasoning' && showReasoning) ||
                        (actionType === 'Miscellaneous' && showMiscellaneous)
                    ) {
                        return <DashboardCard key={index} info={info} />;
                    }
                    return null;
                })}
            </Box>
        </div>
    );
};

const getActionType = (action: string) => {
    if (action.includes("medication")) return 'Medication';
    if (action.includes("lab")) return 'Lab';
    if (action.includes("imaging")) return 'Imaging';
    if (action.includes("agree") || action.includes("reconsider")) return 'Reasoning';
    return 'Miscellaneous';
};


export default Autocare; 
