import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ObjectInspector } from 'react-inspector';
import { generate_hp, get_all_dashboard_info, get_individual_dashboard_info } from './util';

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
    VolunteerActivismIcon, 
    ExpandMoreIcon,
    AddIcon,
    RemoveIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid
} from '../../../../src/mui';

import { theme } from "../../../theme";
import { alpha } from '@mui/system';
import * as tsw from "tidyscripts_web";
import * as fb  from "../../../../src/firebase";
import * as hop from "./handoff_prompt";

const log = tsw.common.logger.get_logger({ id: "autocare" });
const debug = tsw.common.util.debug;

const DASHBOARD_TYPES = ["medication_review", "labs", "imaging", "diagnosis_review"];

const hp_client = fb.create_wrapped_client({
    app_id: "autocare",
    origin_id: "autocare_hp",
    log 
});

const analyze_client = fb.create_wrapped_client({
    app_id: "autocare",
    origin_id: "autocare_analyze",
    log 
});

const handoff_client = fb.create_wrapped_client({
    app_id: "autocare",
    origin_id: "autocare_handoff",
    log 
});

const getCardColor = (action: string) => {
    if (!action) return theme.palette.warning.main;
    const actionLower = action.toLowerCase();
    if (actionLower.includes("medication")) return theme.palette.primary.main;
    if (actionLower.includes("lab")) return theme.palette.secondary.main;
    if (actionLower.includes("imaging")) return theme.palette.info.main;
    if (actionLower.includes("agree") || actionLower.includes("reconsider")) return theme.palette.success.main;
    return theme.palette.warning.main;
};

function DashboardCard({ info }: any) {
    const card_style: any = {
        padding: "10px",
        marginBottom: "10px",
        cursor: 'pointer',
        backgroundColor: alpha(getCardColor(info.action), 0.5),
        borderWidth: "1px",
        borderRadius: "10px",
    };

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

    let tmp = info.action || '';
    info.action = tmp[0] ? tmp[0].toUpperCase() + tmp.slice(1) : '';

    return (
        <Card style={card_style}>
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
                <br />
                <ReactMarkdown>**Reasoning**</ReactMarkdown>
                <Typography>{info.reasoning}</Typography>
                <br />
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
    );
}

const Autocare = () => {
    const [open, setOpen] = useState(true);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [generated_handoff, setGeneratedHandoff] = useState(null as any);
    const [loadingAnalyze, setLoadingAnalyze] = useState(false);
    const [loadingHandoff, setLoadingHandoff] = useState(false);
    const [dashboardInfo, setDashboardInfo] = useState(null as any);
    const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
    const [showMedications, setShowMedications] = useState(true);
    const [showLabs, setShowLabs] = useState(true);
    const [showImaging, setShowImaging] = useState(true);
    const [showReasoning, setShowReasoning] = useState(true);
    const [showMiscellaneous, setShowMiscellaneous] = useState(true);

    const handleGenerate = async () => {
        setLoading(true);
        let clinical_information = note;
        const generatedNote = await generate_hp({clinical_information, client: hp_client});
        setNote(generatedNote);
        setLoading(false);
    };

    const handleQuickAnalyze = async () => {
        setLoadingAnalyze(true);
        let hp = note;
        let info = await get_all_dashboard_info({hp, client: analyze_client});
        debug.add('dashboardInfo', info);
        var jsonInfo = (info || [{ error: "There was an error parsing the JSON" }]);
        setDashboardInfo(jsonInfo);
        setLoadingAnalyze(false);
    };

    const handleDeepAnalyze = async () => {
        const initialLoadingStates = DASHBOARD_TYPES.reduce((acc, type) => ({
            ...acc,
            [type]: true
        }), {});
        setLoadingStates(initialLoadingStates);

        try {
            const results = await Promise.all(
                DASHBOARD_TYPES.map(async (dashboardName) => {
                    const result = await get_individual_dashboard_info({
                        hp: note,
                        client: analyze_client,
                        dashboard_name: dashboardName
                    });
                    
                    setLoadingStates(prev => ({
                        ...prev,
                        [dashboardName]: false
                    }));

                    return result;
                })
            );

            const combinedResults = results.flat().filter(Boolean);
            debug.add("combinedResults", combinedResults);
            setDashboardInfo(combinedResults);

        } catch (error) {
            console.error('Error in deep analysis:', error);
            setDashboardInfo([{ error: "There was an error during deep analysis" }]);
        }

        setLoadingStates({});
    };

    const handleHandoff = async () => {
        setLoadingHandoff(true);
        let patient_information = note;
        let prompt = hop.template.replace("{patient_information}", patient_information).replace("{parameters}", hop.default_parameters);
        
        const response = await handoff_client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        let content = response.choices[0].message.content;
        setGeneratedHandoff(content);
        setLoadingHandoff(false);
    };

    const getActionType = (action: string) => {
        if (!action) return 'Miscellaneous';
        const actionLower = action.toLowerCase();
        if (actionLower.includes("medication")) return 'Medication';
        if (actionLower.includes("lab")) return 'Lab';
        if (actionLower.includes("imaging")) return 'Imaging';
        if (actionLower.includes("agree") || actionLower.includes("reconsider")) return 'Reasoning';
        return 'Miscellaneous';
    };

    return (
        <div>
            <Grid container spacing={2} justifyContent="flex-end" marginBottom="20px">
                <Grid item xs={12} sm="auto">
                    <FormControlLabel
                        control={<Checkbox checked={showMedications} onChange={() => setShowMedications(!showMedications)} />}
                        label="Medications"
                    />
                </Grid>
                <Grid item xs={12} sm="auto">
                    <FormControlLabel
                        control={<Checkbox checked={showLabs} onChange={() => setShowLabs(!showLabs)} />}
                        label="Labs"
                    />
                </Grid>
                <Grid item xs={12} sm="auto">
                    <FormControlLabel
                        control={<Checkbox checked={showImaging} onChange={() => setShowImaging(!showImaging)} />}
                        label="Imaging"
                    />
                </Grid>
                <Grid item xs={12} sm="auto">
                    <FormControlLabel
                        control={<Checkbox checked={showReasoning} onChange={() => setShowReasoning(!showReasoning)} />}
                        label="Reasoning"
                    />
                </Grid>
                <Grid item xs={12} sm="auto">
                    <FormControlLabel
                        control={<Checkbox checked={showMiscellaneous} onChange={() => setShowMiscellaneous(!showMiscellaneous)} />}
                        label="Miscellaneous"
                    />
                </Grid>
            </Grid>

            <TextField
                fullWidth
                multiline
                rows={10}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                variant="outlined"
                margin="normal"
            />

            {/* Loading Spinners */}
            <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
                {Object.entries(loadingStates).map(([type, isLoading]) => (
                    isLoading && (
                        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={20} />
                            <Typography variant="body2">
                                {type.split('_').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                            </Typography>
                        </Box>
                    )
                ))}
            </Box>

            <Button
                variant="contained"
                color="primary"
                onClick={handleGenerate}
                disabled={loading}
                sx={{ marginTop: "6px", marginRight: "10px" }}
                size="small"
                startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            >
                Generate
            </Button>

            <Button
                variant="contained"
                color="primary"
                onClick={handleQuickAnalyze}
                disabled={loadingAnalyze}
                size="small"
                sx={{ marginTop: "6px", marginRight: "10px" }}
                startIcon={loadingAnalyze ? <CircularProgress size={20} /> : <TroubleshootIcon />}
            >
                Quick Analyze
            </Button>

            <Button
                variant="contained"
                color="primary"
                onClick={handleDeepAnalyze}
                disabled={Object.values(loadingStates).some(Boolean)}
                size="small"
                sx={{ marginTop: "6px", marginRight: "10px" }}
                startIcon={Object.values(loadingStates).some(Boolean) ? <CircularProgress size={20} /> : <TroubleshootIcon />}
            >
                Deep Analyze
            </Button>

            <Button
                variant="contained"
                color="primary"
                onClick={handleHandoff}
                disabled={loadingHandoff}
                size="small"
                sx={{ marginTop: "6px", marginRight: "10px" }}
                startIcon={loadingHandoff ? <CircularProgress size={20} /> : <VolunteerActivismIcon/>}
            >
                Get Handoff
            </Button>

            {generated_handoff && (
                <Accordion style={{marginTop: "8px"}}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Handoff</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box style={{padding: "10px"}}>
                            <ReactMarkdown>{generated_handoff}</ReactMarkdown>
                        </Box>
                    </AccordionDetails>
                </Accordion>
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

export default Autocare;
