
import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

const Demographics: React.FC = () => {
    const [name, setName] = useState<string>('');
    const [age, setAge] = useState<string>('');
    const [gender, setGender] = useState<string>('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        console.log({ name, age, gender });
    };

    return (
        <Box>
            <Typography variant="h6">Demographics</Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    sx={{ marginBottom: '10px' }}
                />
                <TextField
                    label="Age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    fullWidth
                    sx={{ marginBottom: '10px' }}
                />
                <TextField
                    label="Gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    fullWidth
                    sx={{ marginBottom: '10px' }}
                />
                <Button type="submit" variant="contained" color="primary">Submit</Button>
            </form>
        </Box>
    );
};

export default Demographics;
