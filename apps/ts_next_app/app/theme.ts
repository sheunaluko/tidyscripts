'use client';
import { Roboto } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const theme = createTheme({

    palette: {
	mode: 'light',

	primary: {
	    main: '#58834c',
	},
	secondary: {
	    main: '#f50057',
	},
	warning: {
	    main: '#ff9400',
	},

    }

})

let secondary = theme.palette.secondary.main
let primary = theme.palette.primary.main
let grey = theme.palette.grey 


export {
    theme,
    secondary,
    primary,
    grey
} 
    
    
