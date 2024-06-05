'use client';
import { Roboto } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});


const theme = createTheme({
  shadows: [
    'none', // shadows[0]
    '0px 1px 3px rgba(0, 0, 0, 0.2), 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px -1px rgba(0, 0, 0, 0.12)', // shadows[1]
    // Add more shadows as needed
  ],
  // other theme configurations...
});


const otherTheme = createTheme({

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
    
    
