import React, { useState } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import * as tsw from "tidyscripts_web";
import useInit from "../../../../hooks/useInit";
import {generate_hp} from "./util" 
import {wrapped_client} from "./util"

var open_ai_client: any = null;

const log = tsw.common.logger.get_logger({ id: "note_generator" });

const NoteGenerator = () => {

    const [note, setNote] = useState('');
    const [generatedNote, setGeneratedNote] = useState('');
    const [loading, setLoading] = useState(false);

    let init = async function () {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') {

            open_ai_client = wrapped_client // tsw.apis.openai.get_openai();

            Object.assign(window, {
                open_ai_client,
            });
            log("NoteGenerator initialized");
        }
    };

    let clean_up = () => { log("note generator unmounted"); };
    useInit({ init, clean_up });

    const handleNoteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNote(event.target.value);
    };


    const handleSaveNote = async () => {
        setLoading(true);
	let content = await generate_hp(note)
        setGeneratedNote(content);
        setLoading(false);
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
                Generate &nbsp; &nbsp;
                {loading && <CircularProgress color="secondary" size={20} />}
            </Button>

            {generatedNote && (
                <Box mt={2}>
                    <h3>Generated H&P:</h3>
		    
                    <ReactMarkdown>{generatedNote}</ReactMarkdown>
                </Box>
            )}
        </Box>
    );
};

export default NoteGenerator;
