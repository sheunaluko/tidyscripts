import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';

import * as tsw from "tidyscripts_web";
import useInit from "../../../../hooks/useInit";

var open_ai_client : any = null ;

const log = tsw.common.logger.get_logger({id:"note_generator"});

const NoteGenerator = () => {
    
    const [note, setNote] = useState('');

    let init = async function() {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') {

	    open_ai_client = tsw.apis.openai.get_openai()
	    
            Object.assign(window, {
                open_ai_client  , 
            });
            log("NoteGenerated initialized");
        }
    };

    let clean_up = () => { log("note generator unmounted") };
    useInit({ init, clean_up });

    const handleNoteChange = (event) => {
        setNote(event.target.value);
    };

    const handleSaveNote = () => {
        console.log('Note saved:', note);
        // Add logic to save the note
    };

    return (
        <Box>
            <TextField
                label="What kind of H&P do you want to generate?"
                multiline
                rows={4}
                value={note}
                onChange={handleNoteChange}
                variant="outlined"
                fullWidth
            />
            <Button onClick={handleSaveNote} variant="contained" color="primary" style={{ marginTop: '10px' }}>
                Save Note
            </Button>
        </Box>
    );
};

export default NoteGenerator;
