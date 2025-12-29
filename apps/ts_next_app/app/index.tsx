'use client';
import React, { useState, useEffect } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link' ;
import styles from '../styles/Home.module.css'
import { useAuthState } from 'react-firebase-hooks/auth';
import * as firebase from "../src/firebase"
import {toast_toast} from "../components/Toast"

import * as tsw from "tidyscripts_web"  ;
import * as lab from "./laboratory/src/index"
import * as bashr from "../src/bashr/index"  ;

import useInit from "../hooks/useInit"
import IndexSidebar from "../components/IndexSidebar"
import IndexLoadingLogo from "../components/IndexLoadingLogo"
import BackgroundAnimation from "../components/BackgroundAnimation"

//import {theme} from "./theme"

declare var window : any ;

import {
    Box,
    Typography,
} from "../src/mui" 

const log = tsw.common.logger.get_logger({id:"app/index"}) ;

const SIDEBAR_CONFIG = {
  widthCollapsed: 60,
  widthExpanded: 280,
};

const Home: NextPage = (props : any) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(
        new Set([])
    );
    const [showLoadingLogo, setShowLoadingLogo] = useState(true);

    let init = async function() {
	/* Assign tidyscripts library to window */
	if (typeof window !== 'undefined') {
	    Object.assign(window, {
		tsw ,
		toast_toast,
		firebase ,
		lab ,
		//theme ,
		bashr
	    })
	    window.setTimeout( function(){
		toast_toast({
		    title : "Thank you for using Tidyscripts",
		    description : "",
		    duration : 2000,
		    status : "success" ,
		    isClosable : true ,
		})
	    }, 500)
	    log("Index page init")
	}
	//configure the theming
	//document.body.style.backgroundColor = theme.palette.background.default
    }

    let clean_up = ()=> { log("index unmounted") }
    useInit({ init , clean_up })  //my wrapper around useEffect

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



    
    
    return (
        <Box sx={{ width: '100%', minHeight: 'calc(100vh - 200px)', position: 'relative' }}>
            <BackgroundAnimation />
            <IndexSidebar
                open={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                expandedItems={expandedMenuItems}
                onToggleExpanded={toggleExpandedItem}
            />

            <Box
                component="main"
                sx={{
                    width: '100%',
                    position: 'relative',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    pt: 6,
                }}
            >
                {showLoadingLogo && (
                    <IndexLoadingLogo
                        show
                        onLoadComplete={() => setShowLoadingLogo(false)}
                    />
                )}

                <Box className={styles.title}>
                    <Typography variant="h2" color='primary.main'>
                        Tidyscripts
                    </Typography>
                </Box>

                <Box className={styles.description}>
                    <Typography variant="h4">
                        Powerful tools for serious builders and users
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}

export default Home
