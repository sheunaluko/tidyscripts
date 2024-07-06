'use client';
import React, { useState } from 'react';
import { Box, TextField, Typography, Button, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

const Medications = () => {
    const [medications, setMedications] = useState([{ name: '', dose: '' }]);

    const handleChange = (index, field, value) => {
        const newMedications = [...medications];
        newMedications[index][field] = value;
        setMedications(newMedications);
    };

    const handleAdd = () => {
        setMedications([...medications, { name: '', dose: '' }]);
    };

    const handleRemove = (index) => {
        const newMedications = medications.filter((_, i) => i !== index);
        setMedications(newMedications);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        // Handle form submission logic here
        console.log(medications);
    };

    return (
        <Box maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                Medications
            </Typography>
            <form onSubmit={handleSubmit} noValidate autoComplete="off">
                {medications.map((medication, index) => (
                    <Box key={index} display="flex" flexDirection="row" alignItems="space-around" marginBottom="10px">
			
                        <TextField
                            label="Medication Name"
                            value={medication.name}
                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                            variant="outlined"
                            margin="normal"
			    style={{marginRight : "10px" }}

                        />
                        <TextField
                            label="Dose"
                            value={medication.dose}
                            onChange={(e) => handleChange(index, 'dose', e.target.value)}
                            variant="outlined"
                            margin="normal"

                        />
                        <IconButton  onClick={() => handleRemove(index)}>
                            <Remove />
                        </IconButton>
                    </Box>
                ))}

		<Box style={{display:"flex", 
			     flexDirection:"row" ,
			     alignItems:"space-between" , 
			     width : "100%" 
		}}> 
                <Button variant="contained" color="primary" onClick={handleAdd} style={{ marginRight : "10px" }}>
                    Add Medication
                </Button>
		<Box style={{flexGrow : 1}}>

		</Box>
                <Button variant="contained" color="primary" type="submit">
                    Submit
                </Button>
		</Box>
            </form>
        </Box>
    );
};

export default Medications;
