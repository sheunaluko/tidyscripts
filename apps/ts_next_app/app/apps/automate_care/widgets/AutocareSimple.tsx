import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ObjectInspector } from 'react-inspector';
import { generate_hp, get_all_dashboard_info } from './util';
import { z } from "zod" ;
import { zodResponseFormat } from 'openai/helpers/zod' ; 


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
import * as hop from "./handoff_prompt" ;
import * as shop from "./structured_handoff_prompt" ;

const log = tsw.common.logger.get_logger({ id: "autocare" });
const debug = tsw.common.util.debug;


/*
 * Create the wrapped AI api clients (which enable caching by default) 
 */ 

const hp_client = fb.create_wrapped_client({
    app_id : "autocare" ,
    origin_id : "autocare_hp"  ,
    log 
})

const analyze_client = fb.create_wrapped_client({
    app_id : "autocare" ,
    origin_id : "autocare_analyze"  ,
    log 
})

const handoff_client = fb.create_wrapped_client({
    app_id : "autocare" ,
    origin_id : "autocare_handoff"  ,
    log 
})


/*
 * Define the response structure for the handoff 
 */

const one_liner = z.string()  ;
const diagnosis_group = z.object({
    diagnoses : z.array(z.string()),
    narrative_summary : z.string() ,
    plan_items : z.array(z.string())  
})
const handoff_response_structure = z.object({
    one_liner,
    diagnosis_groups : z.array(diagnosis_group)
}) ;

const Handoff_Response_Format = zodResponseFormat(handoff_response_structure, 'handoff')




function DashboardCard({ info }: any) {
    const getCardColor = (action: string) => {
        if (action.includes("medication")) return theme.palette.primary.main;
        if (action.includes("lab")) return theme.palette.secondary.main;
        if (action.includes("imaging")) return theme.palette.info.main;
        if (action.includes("agree") || action.includes("reconsider")) return theme.palette.success.main;
        return theme.palette.warning.main; // Miscellaneous
    };

    const card_style: any = {
        padding: "10px",
        marginBottom: "10px",
        cursor: 'pointer',
        backgroundColor: alpha(getCardColor(info.action.toLowerCase()), 0.5),
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

    let tmp = info.action;
    info.action = tmp[0].toUpperCase() + tmp.slice(1);

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

    let default_handoff = null //JSON.parse(localStorage['handoff_response']) ; 
    
    const [open, setOpen] = useState(true);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [generated_handoff, setGeneratedHandoff] = useState(default_handoff as  any) ; 
    const [loadingAnalyze, setLoadingAnalyze] = useState(false);
    const [loadingHandoff, setLoadingHandoff] = useState(false);    
    const [dashboardInfo, setDashboardInfo] = useState(null as any);
    const [showMedications, setShowMedications] = useState(true);
    const [showLabs, setShowLabs] = useState(true);
    const [showImaging, setShowImaging] = useState(true);
    const [showReasoning, setShowReasoning] = useState(true);
    const [showMiscellaneous, setShowMiscellaneous] = useState(true);

    useEffect(() => {
        const storedNote = localStorage.getItem('HP');
        let info = localStorage.getItem('info');

        let testing = false;

        if (testing) {
            if (storedNote) {
                setNote(storedNote);
            }

            if (info) {
                let t = JSON.parse(info);
                setDashboardInfo(t);
                debug.add("dashboardInfo", t);
            }
        }
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
	let clinical_information = note 
        const generatedNote = await generate_hp({clinical_information, client : hp_client}) 
        setNote(generatedNote);
        setLoading(false);
    };

    const handleAnalyze = async () => {
        setLoadingAnalyze(true);
	let hp =  note ;
        let info = await get_all_dashboard_info({hp , client : analyze_client})
        debug.add('dashboardInfo', info);
        var jsonInfo = (info || [{ error: "There was an error parsing the JSON" }]);
        setDashboardInfo(jsonInfo);
        setLoadingAnalyze(false);
    };


    const handleHandoff = async () => {
        setLoadingHandoff(true);
	let patient_information = note 	
	let prompt = shop.template.replace("{patient_information}",patient_information).replace("{parameters}",shop.default_parameters)	

	debug.add("handoff_prompt", prompt) ;

	let zrf = Handoff_Response_Format ; //defines the response structuture (see top of file) 

	// -- query the AI with the prompt
	const response = await tsw.common.apis.oai.generic_completion_json_structured({prompt,zrf})

	//response should actually be the structured json content now 

	log("Received handoff response!")
	debug.add("handoff_response" , response) ;

	setGeneratedHandoff(response) ; 
        setLoadingHandoff(false);
    };
    

    return (
        <div>
            <Grid display="none" container spacing={2} justifyContent="flex-end" marginBottom="20px">
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
	    <div style={{display : 'none'}}>
		<Button
                    variant="outlined"
                    startIcon={open ? <RemoveIcon /> : <AddIcon />}
                    onClick={() => setOpen(!open)}
		>

                    {open ? 'Hide' : 'Show'} 
		</Button>
	    </div>	    
            {open && (
                <React.Fragment>

		    <p style={{marginTop: "6px" }}>
			1. Input an H&P below, or instead input some patient information and press generate to create an H&P using AI
		    </p>

		    <p style={{marginTop: "6px" }}>
	    		2. Analyze the H&P for insights or generate a handoff for cross-covering physicians
		    </p>


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
                        sx={{ marginTop : "6px" , marginRight: "10px" }}
                        size="small"
                        startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                    >
                        Generate
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAnalyze}
                        disabled={loadingAnalyze}
                        size="small"
                        sx={{ marginTop: "6px" , marginRight: "10px" }}
                        startIcon={loadingAnalyze ? <CircularProgress size={20} /> : <TroubleshootIcon />}
                    >
                        Analyze
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleHandoff}
                        disabled={loadingHandoff}
                        size="small"
                        sx={{ marginTop: "6px" , marginRight: "10px" }}
                        startIcon={loadingHandoff ? <CircularProgress size={20} /> : <VolunteerActivismIcon/>}
                    >
                        Get Handoff
                    </Button>
		    
                </React.Fragment>
            )}

	    <React.Fragment> {
		(function(){


		    let render_diagnosis_group = (dg :any) =>  {
			let headers = dg.diagnoses.map( (d : any) => `**#${d}**` ).join("") 
			let plan = dg.plan_items.map( (p : any) => `\-&nbsp;*${p}*&nbsp;\n\n` ).join("") 
			return `${headers}&nbsp;\n\n${dg.narrative_summary}&nbsp;\n\n${plan}`
		    }

		    
		    if (generated_handoff) {
			let handoff_markdown = `**ID**:&nbsp;${generated_handoff.one_liner}&nbsp;\n\n&nbsp;\n\n` + 
					       generated_handoff.diagnosis_groups.map( render_diagnosis_group ).join("\n\n&nbsp;\n\n") 

			return ( 
			    <Accordion style={{marginTop : "8px" }}>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				    <Typography>Handoff</Typography>
				</AccordionSummary>
				<AccordionDetails>
				    <Box style={{padding : "10px"}}>
					<ReactMarkdown>{handoff_markdown}</ReactMarkdown>
				    </Box> 
				</AccordionDetails>
			    </Accordion>
			) } else {
			    return null 
			} 
		}) ()
	    }
	    </React.Fragment> 

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
    if (action.includes("Agree") || action.includes("Reconsider")) return 'Reasoning';
    return 'Miscellaneous';
};

export default Autocare;



var test_case = `45M admitted to ICU with septic shock secondary to pneumonia, complicated by pulmonary embolism worsening hypoxic respiratory failure, also with acute renal failure on CRRT` 
