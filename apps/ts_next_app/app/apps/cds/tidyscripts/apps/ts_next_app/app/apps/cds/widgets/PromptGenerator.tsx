
import React, { useState } from 'react';
import { generate_quick_prompt } from '../prompts';

const PromptGenerator = () => {
    const [selectedDashboards, setSelectedDashboards] = useState([]);
    const [hpNote, setHpNote] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');

    const dashboards = ["medication_review", "labs", "imaging", "diagnosis_review"];

    const handleGenerate = () => {
        const prompt = generate_quick_prompt(hpNote, selectedDashboards);
        setGeneratedPrompt(prompt);
    };

    return (
        <div>
            <label>Choose Dashboards:</label>
            <select multiple value={selectedDashboards} onChange={(e) => setSelectedDashboards([...e.target.selectedOptions].map(option => option.value))}>
                {dashboards.map(dashboard => (
                    <option key={dashboard} value={dashboard}>{dashboard}</option>
                ))}
            </select>
            <br />
            <label>History and Physical Note:</label>
            <textarea value={hpNote} onChange={(e) => setHpNote(e.target.value)} />
            <br />
            <button onClick={handleGenerate}>GENERATE</button>
            {generatedPrompt && (
                <div>
                    <h3>Generated Prompt:</h3>
                    <p>{generatedPrompt}</p>
                </div>
            )}
        </div>
    );
};

export default PromptGenerator;
