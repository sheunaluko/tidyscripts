import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
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
    CardContent
} from '../../../../src/mui'

import {theme} from "../../../theme"

import * as tsw from "tidyscripts_web"
const log   = tsw.common.logger.get_logger({id:"autocare"})
const debug = tsw.common.util.debug

function DashboardCard(info : any) {

    const card_style : any  = {
	padding : "10px" ,
	marginBottom : "10px" ,
	cursor : 'pointer' ,
	backgroundColor :  'primary.main',
	borderWidth : "1px" , 
	borderRadius : "10px" 	
    } 

    let tmp = info.action
    info.action = tmp[0].toUpperCase() + tmp.slice(1)
    
    return (
	<Card style={card_style} >
	    <CardContent>
                <Typography variant="h6">{info.action}</Typography>
                <ObjectInspector data={info.data}/>
                <ReactMarkdown>**Reasoning**</ReactMarkdown>		
                <Typography >{info.reasoning}</Typography>
		<ReactMarkdown>**Caveat**</ReactMarkdown>		
                <Typography >{info.caveat}</Typography>
	    </CardContent>
        </Card>

    )
} 

const Autocare = () => {
    
    const [open, setOpen] = useState(true);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [dashboardInfo, setDashboardInfo] = useState(null);

    useEffect(() => {
        const storedNote = localStorage.getItem('HP');
        let info = localStorage.getItem('info');	

        if (storedNote) {
            setNote(storedNote);
        }

	if (info) { 
	    setDashboardInfo(JSON.parse(info))
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

	debug.add('info', info)
	// the above should return a JSON object
	
	var jsonInfo = (info || [{error : "There was an error parsing the JSON" }])
	
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
                        onClick={handleGenerate}
                        style={{ marginBottom: '20px' }}
                    >
                        Generate H&P
                    </Button>
		    
                    <Button
                        variant="outlined"
                        onClick={() => handleAnalyze(note)}
                    >
                        Analyze
                    </Button>
		    {loading && (
                        <Box display="flex" flexDirection="column" alignItems="center" marginBottom="20px" marginTop="15px">
                            <CircularProgress />

                        </Box>
                    )}

                </Box>
            )}
            {dashboardInfo && (
                <Box>
                    <Typography variant="h6">Recommendations:</Typography>
		    <Box>
			{
			    dashboardInfo.map( DashboardCard )
			}
		    </Box>
		    
                </Box>
            )}
        </div>
    );
};

export default Autocare;


/*
   TODO 
   
   Group the dashboard output by these categories: 

   Medications / Labs / Imaging / Reasoning  --- Complications 

   In the top right of the recommendations dashboard there are 4 check boxes for toggling 
   including the above things (a filter bank) 

   The things are automatically grouped based on the action title 
   - action.contains("lab")
   - action.contains("medication")
   - action.contains("imaging")
   - action.contains("agree" OR "recondsider")

   If there is not match for a filter then it will show up under "miscellaneous" 


   obtain lab
   obtain imaging

   hold medication 
   adjust medication
   suggest medication 

   agree
   reconsider

   Color code these outputs 


   Capitaize the card 

 */
