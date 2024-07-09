import React, { useState } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import * as tsw from "tidyscripts_web";
import useInit from "../../../../hooks/useInit";

var open_ai_client: any = null;

const log = tsw.common.logger.get_logger({ id: "note_generator" });

const NoteGenerator = () => {

    const [note, setNote] = useState('');
    const [generatedNote, setGeneratedNote] = useState('');
    const [loading, setLoading] = useState(false);

    let init = async function () {
        /* Assign tidyscripts library to window */
        if (typeof window !== 'undefined') {

            open_ai_client = tsw.apis.openai.get_openai();

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

    const generatePrompt = (note: string) => {
        return `
        Your job is to generate an H&P for a patient.

The history and physical must have the following components:
- BEGIN H&P INSTRUCTIONS -
1. chief complaint: the chief complaint of the patient (i.e. chest pain or cough or anemia)

2. One liner for the patient: a single sentence containing the patient's age, gender, significant past medical history, and presenting symptoms / chief complaint

3. HPI (History of present illness)  : This is several sentences/ up to 2-3 paragraphs which explain in more detail the initial presenting symptoms, and circumstances that led to the patient's current presentation to the hospital. It should elaborate to some extent on the nature, quality and duration of pain if present. It should include pertinent positive and negative findings related to the chief complaint.

4. Emergency department course : describes the presenting vital signs, labs, imaging, and other objective data obtained from the emergency department. It also includes any medications that were administered in the emergency department. Sometimes the patient is transferred from another hospital in which cases this section would detail the course at the other hospital instead.

4. Medications: a list of medications, including dosage and frequency (if present)

5. Allergies: a list of allergies to medications or substances or other (if present)

6. Past surgical history: a list or prior surgeries (if present)

7. Social history : smoking status, drug use, living situation, etc.

8. Objective data, which includes a review of current vital signs, current physical exam findings, and current laboratory, imaging, and other test data.

8. Assessment and plan : this section is the meat and potatoes of the note, in which the clinical impressions and plan are detailed for each problem. This section should include a list of diagnoses that start with the most important first. For each diagnosis an assessment is provided which explains the reasoning behind the diagnosis as well as the current status of the condition. Finally, each diagnosis also has a plan, which includes the currently treatment plan for the diagnosis.
- END H&P INSTRUCTIONS -

Generate an H&P for a patient with the following KNOWN clinical information:

${note}

Make sure the generated H&P is in VALID MARKDOWN FORMAT!!!!
Make sure the generated H&P is in VALID MARKDOWN FORMAT!!!!
Make sure the generated H&P is in VALID MARKDOWN FORMAT!!!!

        `;
    };

    const handleSaveNote = async () => {
        setLoading(true);
        const prompt = generatePrompt(note);
        const response = await open_ai_client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ]
        });
        let content = response.choices[0].message.content;
        content = content.replace("- BEGIN H&P INSTRUCTIONS -", "").replace("- END H&P INSTRUCTIONS -", "").trim();
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
                    <h3>Generated H&P Note:</h3>
                    <ReactMarkdown>{generatedNote}</ReactMarkdown>
                </Box>
            )}
        </Box>
    );
};

export default NoteGenerator;
