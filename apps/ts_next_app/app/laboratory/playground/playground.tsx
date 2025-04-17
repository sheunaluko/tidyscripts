import React from 'react';
import { Button, Typography, Container, Box } from '@mui/material';

const Playground = () => {
  return (
    <Container>
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='100%'>
        <div>
          <Typography variant='h4' gutterBottom>
            Welcome to the Playground
          </Typography>
          <Button variant='contained' color='primary'>
            Click Me
          </Button>
        </div>
      </Box>
    </Container>
  );
};

export default Playground;
