'use client';
import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Button } from '@mui/material';

const Demographics = () => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        const savedName = localStorage.getItem('name');
        const savedAge = localStorage.getItem('age');
        const savedGender = localStorage.getItem('gender');
        const savedAddress = localStorage.getItem('address');

        if (savedName) setName(savedName);
        if (savedAge) setAge(savedAge);
        if (savedGender) setGender(savedGender);
        if (savedAddress) setAddress(savedAddress);
    }, []);

    useEffect(() => {
        localStorage.setItem('name', name);
    }, [name]);

    useEffect(() => {
        localStorage.setItem('age', age);
    }, [age]);

    useEffect(() => {
        localStorage.setItem('gender', gender);
    }, [gender]);

    useEffect(() => {
        localStorage.setItem('address', address);
    }, [address]);

    const handleSubmit = (event) => {
        event.preventDefault();
        // Handle form submission logic here
        console.log({ name, age, gender, address });
    };

    return (
        <Box maxWidth="sm">
            <Typography variant="h4" component="h1" gutterBottom>
                Demographics
            </Typography>
            <form onSubmit={handleSubmit} noValidate autoComplete="off">
                <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="outlined"
                    margin="normal"
                    fullWidth
                />
                <TextField
                    label="Age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    variant="outlined"
                    margin="normal"
                    fullWidth
                />
                <TextField
                    label="Gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    variant="outlined"
                    margin="normal"
                    fullWidth
                />
                <TextField
                    label="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    variant="outlined"
                    margin="normal"
                    fullWidth
                />
                <Button variant="contained" color="primary" type="submit" style={{ marginTop: '20px' }}>
                    Submit
                </Button>
            </form>
        </Box>
    );
};

export default Demographics;
