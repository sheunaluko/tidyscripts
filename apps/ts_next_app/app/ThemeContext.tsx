'use client';

import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext({
  toggleColorMode: () => {},
  mode: 'light' as PaletteMode,
});

export const useColorMode = () => useContext(ThemeContext);

const THEME_STORAGE_KEY = 'theme-preference';

export default function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>('light');

  const toggleColorMode = () => {
    setMode((prevMode: PaletteMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // Save to localStorage
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
      return newMode;
    });
  };

  // Load theme preference on mount
  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as PaletteMode | null;

    if (savedTheme === 'light' || savedTheme === 'dark') {
      // User has a saved preference - use it
      setMode(savedTheme);
    } else {
      // No saved preference - detect from system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
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
