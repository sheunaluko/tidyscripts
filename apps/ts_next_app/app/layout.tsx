import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React from 'react' ;
import { Metadata } from 'next';

import Head from 'next/head' ;

import CssBaseline from '@mui/material/CssBaseline';

//import {theme} from "./theme"  ;

import Box from '@mui/material/Box';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import Footer from '../components/Footer' ; //the footer component contains the drawer as well
import Toast from '../components/Toast'

import { Analytics } from '@vercel/analytics/react';

import styles from "../styles/Layout.module.css" ; 
import {ChakraProvider} from "@chakra-ui/react" 

import ThemeContextProvider from "./ThemeContext" 
import ThemeWrapper from "./ThemeWrapper" 

export const metadata: Metadata = {
    title: 'Tidyscripts',
    description : 'Robust Typescript Software' 
};

declare var window : any ;

export default function RootLayout({children}: {children: React.ReactNode;}) {

    let footer_v_padding="20px";
    let footer_h_padding="10px"; 
    //let main_v_padding="25px";
    //let main_h_padding="10px"; 

    return (
	<html lang="en">
	    <Head>
		<meta name="viewport" content="initial-scale=1, width=device-width" />
	    </Head> 
	    <body
		style={{
		    minHeight : "100vh",
		    overflowX : "hidden" ,
		    position : "relative"
		}}
	    >
		<ThemeContextProvider> 
		    <ThemeWrapper> 
			    <div
				style={{
				    display: 'flex',
				    flexGrow: 1,
				    width: '100%'
				}}
			    >
				<main
				    style={{ width: '100%' }}
				    className={styles.main} 
				>
				    {children}
				</main>
			    </div>

			    <div
				style={{
				    display: 'flex',
				    justifyContent: 'center',
				    paddingTop: footer_v_padding,
				    paddingBottom: footer_v_padding,
				    paddingLeft: footer_h_padding,
				    paddingRight: footer_h_padding
				}}
			    >
				<ChakraProvider>
				    <Footer/>
				</ChakraProvider>
				<Toast/> 
			    </div>
		    </ThemeWrapper>
			

		    <Analytics />
		</ThemeContextProvider>
	    </body>
	</html>
    );
}
