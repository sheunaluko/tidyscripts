
import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

const Medications: React.FC = () => {
    const [medications, setMedications] = useState([
        { name: '', dose: '' }
    ]);

    const handleChange = (index: number, field: string, value: string) => {
        const newMedications = [...medications];
        newMedications[index][field as keyof typeof newMedications[0]] = value;
        setMedications(newMedications);
    };

    const handleRemove = (index: number) => {
        const newMedications = medications.filter((_, i) => i !== index);
        setMedications(newMedications);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        console.log(medications);
    };

    return (
        <Box>
            <Typography variant="h6">Medications</Typography>
            <form onSubmit={handleSubmit}>
                {medications.map((medication, index) => (
                    <Box key={index} sx={{ marginBottom: '10px' }}>
                        <TextField
                            label="Name"
                            value={medication.name}
                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                            fullWidth
                            sx={{ marginBottom: '10px' }}
                        />
                        <TextField
                            label="Dose"
                            value={medication.dose}
                            onChange={(e) => handleChange(index, 'dose', e.target.value)}
                            fullWidth
                            sx={{ marginBottom: '10px' }}
                        />
                        <Button variant="contained" color="secondary" onClick={() => handleRemove(index)}>
                            Remove
                        </Button>
                    </Box>
                ))}
                <Button variant="contained" color="primary" onClick={() => setMedications([...medications, { name: '', dose: '' }])}>
                    Add Medication
                </Button>
                <Button type="submit" variant="contained" color="primary" sx={{ marginTop: '10px' }}>
                    Submit
                </Button>
            </form>
        </Box>
    );
};

export default Medications;
