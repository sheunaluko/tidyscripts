'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React, { useEffect } from 'react' ;

import Head from 'next/head' ;

import { getAuth } from '@/src/firebase';
import * as tsw from "tidyscripts_web" ; 

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


declare var window : any ;

export default function RootLayout({children}: {children: React.ReactNode;}) {

    // Expose getAuth to window for InsightsClient
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).getAuth = getAuth;
            (window as any).tsw = tsw;	    
        }
    }, []);

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
				    paddingRight: footer_h_padding,
				    position: 'relative',
				    zIndex: 10
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
