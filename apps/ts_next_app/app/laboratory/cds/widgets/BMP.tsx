
import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

const BMP: React.FC = () => {
    const [data, setData] = useState([
        { name: 'Sodium', value: '', unit: 'mmol/L' },
        { name: 'Chloride', value: '', unit: 'mmol/L' },
        { name: 'Bicarbonate', value: '', unit: 'mmol/L' }
    ]);
    const [anionGap, setAnionGap] = useState<number | null>(null);

    const handleChange = (index: number, field: string, value: string) => {
        const newData = [...data];
        newData[index][field as keyof typeof newData[0]] = value;
        setData(newData);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const sodium = parseFloat(data.find(item => item.name === 'Sodium')?.value || '0');
        const chloride = parseFloat(data.find(item => item.name === 'Chloride')?.value || '0');
        const bicarbonate = parseFloat(data.find(item => item.name === 'Bicarbonate')?.value || '0');
        const calculatedAnionGap = sodium - (chloride + bicarbonate);
        setAnionGap(calculatedAnionGap);
    };

    return (
        <Box>
            <Typography variant="h6">Basic Metabolic Panel</Typography>
            <form onSubmit={handleSubmit}>
                {data.map((item, index) => (
                    <Box key={index} sx={{ marginBottom: '10px' }}>
                        <TextField
                            label={item.name}
                            value={item.value}
                            onChange={(e) => handleChange(index, 'value', e.target.value)}
                            InputProps={{
                                endAdornment: <Typography>{item.unit}</Typography>
                            }}
                        />
                    </Box>
                ))}
                <Button type="submit" variant="contained" color="primary">Calculate Anion Gap</Button>
            </form>
            {anionGap !== null && (
                <Typography variant="h6">Anion Gap: {anionGap}</Typography>
            )}
        </Box>
    );
};

export default BMP;
