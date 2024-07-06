'use client';
import React from 'react';
import Container from '@mui/material/Container'
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button } from '@mui/material';

const testData = [
    { name: 'Sodium', value: '140', unit: 'mmol/L' },
    { name: 'Potassium', value: '4.2', unit: 'mmol/L' },
    { name: 'Chloride', value: '102', unit: 'mmol/L' },
    { name: 'Bicarbonate', value: '24', unit: 'mmol/L' },
    { name: 'Blood Urea Nitrogen (BUN)', value: '15', unit: 'mg/dL' },
    { name: 'Creatinine', value: '1.0', unit: 'mg/dL' },
    { name: 'Glucose', value: '90', unit: 'mg/dL' },
    { name: 'Calcium', value: '9.5', unit: 'mg/dL' },
];

const BMP = () => {
    const [data, setData] = React.useState(testData);
    const [anionGap, setAnionGap] = React.useState(null);

    const handleChange = (index, field, value) => {
        const newData = [...data];
        newData[index][field] = value;
        setData(newData);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const sodium = parseFloat(data.find(item => item.name === 'Sodium').value);
        const chloride = parseFloat(data.find(item => item.name === 'Chloride').value);
        const bicarbonate = parseFloat(data.find(item => item.name === 'Bicarbonate').value);
        const calculatedAnionGap = sodium - (chloride + bicarbonate);
        setAnionGap(calculatedAnionGap);
    };

    return (
        <Box maxWidth="sm">
            <Typography align="left" variant="h4" component="h1" gutterBottom>
                Basic Metabolic Panel
            </Typography>
            <form onSubmit={handleSubmit} noValidate autoComplete="off">
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Test</TableCell>
                                <TableCell align="right">Value</TableCell>
                                <TableCell align="right">Unit</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row, index) => (
                                <TableRow key={row.name}>
                                    <TableCell component="th" scope="row">
                                        {row.name}
                                    </TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            value={row.value}
                                            onChange={(e) => handleChange(index, 'value', e.target.value)}
                                            variant="outlined"
                                            margin="normal"

                                        />
                                    </TableCell>
                                    <TableCell align="right">{row.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button variant="contained" color="primary" type="submit" style={{ marginTop: '20px' }}>
                    Calculate Anion Gap
                </Button>
            </form>
            {anionGap !== null && (
                <Typography variant="h6" component="h2" style={{ marginTop: '20px' }}>
                    Anion Gap: {anionGap}
                </Typography>
            )}
        </Box>
    );
};

export default BMP;
