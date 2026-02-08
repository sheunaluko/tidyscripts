'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React, { useEffect, useState } from 'react' ;

import Head from 'next/head' ;

import { getAuth } from '@/src/firebase';
import * as tsw from "tidyscripts_web" ; 

import CssBaseline from '@mui/material/CssBaseline';

//import {theme} from "./theme"  ;

import Box from '@mui/material/Box';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import Footer from '../components/Footer' ; //the footer component contains the drawer as well
import Toast from '../components/Toast'
import LoginModal from '../components/LoginModal'
import IndexSidebar from '../components/IndexSidebar'

import { Analytics } from '@vercel/analytics/react';

import styles from "../styles/Layout.module.css" ; 
import {ChakraProvider} from "@chakra-ui/react" 

import ThemeContextProvider from "./ThemeContext"
import ThemeWrapper from "./ThemeWrapper"


declare var window : any ;

export default function RootLayout({children}: {children: React.ReactNode;}) {

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set([]));

    // Expose getAuth to window for InsightsClient
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).getAuth = getAuth;
            (window as any).tsw = tsw;
        }
    }, []);

    const toggleExpandedItem = (itemId: string) => {
        setExpandedMenuItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    let footer_v_padding="20px";
    let footer_h_padding="10px";

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
			    <IndexSidebar
				open={sidebarOpen}
				onToggle={() => setSidebarOpen(!sidebarOpen)}
				expandedItems={expandedMenuItems}
				onToggleExpanded={toggleExpandedItem}
			    />
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
				    <LoginModal/>
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
