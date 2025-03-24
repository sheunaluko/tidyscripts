'use client';

import React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const backgroundColor = theme.palette.background.default;
  const textColor = theme.palette.text.primary;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        minWidth: '100vw',
        bgcolor: backgroundColor,
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
        px: '10px',
        pt: '25px',
        pb: '25px',
      }}
    >
      {children}
    </Box>
  );
}
