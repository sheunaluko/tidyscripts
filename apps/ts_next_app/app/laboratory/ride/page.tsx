'use client';

import React, { useState } from 'react';

import * as tsw from "tidyscripts_web";
import useInit from "../../../hooks/useInit";

import {theme} from "../../theme";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Button, Typography, MenuItem, InputLabel } from "@mui/material";
import TextField from "@mui/material/TextField"
import Select, { SelectChangeEvent } from '@mui/material/Select';


import {get_user_collection} from "../../../src/firebase_utils"
import * as fbu from  "../../../src/firebase_utils"
import * as rpu from "../../../src/ride_prompt_utils"

const log    = tsw.common.logger.get_logger({id:"ride"});
const debug  = tsw.common.util.debug
const fp     = tsw.common.fp


const profile_dict : any  = {
    'ap_to_handoff' : rpu.profiles.ap_to_handoff , 
} 

const Page = () => {

    let init = async function() {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') { 
            Object.assign(window, {
                tsw,
		fp,
		fbu , 
		rpu, 		
		debug
            });
            log("Ride init");
        }
    };


    let clean_up = ()=> { log("ride unmounted"); };
    
    useInit({ init , clean_up });  //my wrapper around useEffect




    let default_profile = 'ap_to_handoff' ; 

    const [inputContent, setInputContent] = useState<string>("");
    const [outputContent, setOutputContent] = useState<string>("");    
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = React.useState(default_profile);

    const handleProfileChange = (event: SelectChangeEvent) => {
	let p = event.target.value as string
	setProfile(p);
	log(p)
    };
    

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	setInputContent(event.target.value);
    };
    
    const handleOutputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	setOutputContent(event.target.value);
    };

    
    const handleSubmit = async () => {
	try {
	    // Clear previous errors
	    setError(null);
	    
	    let profile_object = profile_dict[profile]
	    if (! profile_object ) { throw new Error("Profile not found!") }

	    //now to create the ride args we merge the profile object with the new input
	    let RIDE_ARGS = {
		...profile_object,
		...{ input  : inputContent } 
	    }

	    //now we ride
	    let {result, response , ride_check } = await rpu.go_for_ride(RIDE_ARGS)

	    //and set the output content
	    setOutputContent(result) 
	    
	    setError("Done");
	    setTimeout( ()=> setError(null) , 4000)

	    
	} catch (err: any) {
	    setError(err.message || "An unknown error occurred.");
	}
    }
    

    return (
	<Box display="flex" flexDirection="column" height="100%" width="100%">
            <Box flexGrow={1} width={`100%`} margin="0 auto" display="flex" flexDirection="column" padding='40px'>

		<Typography variant="h5" gutterBottom>
		    RIDE 
		</Typography>

		<Box width="30%">
		    <InputLabel id="select-label">Profile</InputLabel>
		    <Select
			labelId="select-label"
			id="simple-select"
			value={profile}
			label="Profile"
			onChange={handleProfileChange}
		    >
			<MenuItem value={"ap_to_handoff"}>ap_to_handoff</MenuItem>
			<MenuItem value={"progress_to_dc"}>progress_to_dc</MenuItem>	    
		    </Select>


		</Box>



		<Box display='flex' flexDirection='row'  width="100%">

		    <Box width="40%">
			<Typography variant="subtitle1" gutterBottom>
			    Input
			</Typography>

			<TextField
			    id="filled-multiline-flexible"
			    label="Input"
			    multiline
			    fullWidth
			    minRows={4}
			    variant="filled"
			    value={inputContent}
			    onChange={handleInputChange}
			/>

			
		    </Box>



		    <Box width="40%" marginLeft="35px">
			<Typography variant="subtitle1" gutterBottom>
			    Output
			</Typography>

			<TextField
			    id="filled-multiline-flexible"
			    label="Output"
			    multiline
			    minRows={4}
		       	    fullWidth
			    variant="filled"
			    value={outputContent}
			    onChange={handleOutputChange}
			/>
			
		    </Box>

		</Box>

		
		{error && (
		    <Typography color="error" sx={{ marginTop: 2 }}>
			{error}
		    </Typography>
		)}

		<Box width="20%">
		    <Button
			variant="contained"
			color="primary"
			onClick={handleSubmit}
			sx={{ marginTop: 3 }}
		    >
			Submit
		    </Button>
		</Box>




		

		

	    </Box>
	</Box> 


    )


    
}


export default Page ; 
