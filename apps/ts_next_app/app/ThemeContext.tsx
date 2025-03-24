'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext({
  toggleColorMode: () => {},
  mode: 'light' as PaletteMode,
});

export const useColorMode = () => useContext(ThemeContext);

export default function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('light');

  const toggleColorMode = () => {
    setMode((prevMode: PaletteMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

    useEffect(() => {
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	setMode(prefersDark ? 'dark' : 'light');
    }, []);

  const theme = useMemo(() => createTheme({
    palette: {
	mode,
	/*
      primary: {
        main: '#90caf9',
      },
      secondary: {
        main: '#f48fb1',
      },
      warning: {
        main: '#ffb74d',
      },
	*/
      background: {
        default: mode === 'dark' ? '#121212' : '#fafafa',
        paper: mode === 'dark' ? '#1e1e1e' : '#fff',
      },
    },
  }), [mode]);

  return (
    <ThemeContext.Provider value={{ toggleColorMode, mode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
