'use client';
import React from 'react'
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

import {theme} from "./theme"

declare var window : any ;

import {
    Box,
    Typography ,
    Card ,
    Button,
    AppShortcutIcon,
    ScienceIcon ,
    PageviewIcon,
    GitHubIcon,
    InfoIcon
    
} from "../src/mui" 

const log = tsw.common.logger.get_logger({id:"app/index"}) ; 

const Home: NextPage = (props : any) => {

    let init = async function() {
	/* Assign tidyscripts library to window */
	if (typeof window !== 'undefined') { 
	    Object.assign(window, {
		tsw ,
		toast_toast,
		firebase ,
		lab , 
		theme ,
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
	document.body.style.backgroundColor = theme.palette.background.default
    }

    let clean_up = ()=> { log("index unmounted") }
    useInit({ init , clean_up })  //my wrapper around useEffect 
    let R = "17px"

    
    const MLink = ({ ...props }) => {
	// @ts-ignore
	return <Link {...props} style={{textDecoration: 'none' }} />;
    };


    const card_style : any  = {
	padding : "10px" ,
	marginBottom : "30px" ,
	cursor : 'pointer' ,
	width : "100%" 
    } 



    
    
    return (
	<Box
	    display='flex'
	    flexDirection='column'
	    alignItems='center'
	    style={{width: "100%", height: "100%"}}
	>
	    <Box className={styles.title}>
		<Typography variant="h2" color={theme.palette.primary.main as any}>
		    Tidyscripts
		</Typography>
	    </Box> 

	    <Box className={styles.description}> 
		<Typography variant="h4" color={theme.palette.secondary as any}>
		    Powerful tools for serious builders and users
		</Typography>
	    </Box>


	    <Box  >

		<MLink href="/apps">
		    <Card style={card_style}>
			<Typography variant="h5" color="primary">App Library</Typography>
			<Box display='flex' flexDirection='row' justifyContent='space-between'>
			<p>
			    Mature Applications 
			</p>
			<AppShortcutIcon color='primary'  />
			</Box> 
			
		    </Card >
		</MLink>
		

		<MLink href="/laboratory">
		    <Card style={card_style}>
			<Typography variant="h5" color="primary">Laboratory</Typography>
			<Box display='flex' flexDirection='row' justifyContent='space-between'>

			<p>
			    Prototypes and Experiments
			</p>
			<ScienceIcon color='primary' style={{marginLeft : "12px" }}  />
			</Box>
		    </Card >
		</MLink>

		<MLink href="/docs/index.html">
		    <Card style={card_style}>
			<Typography variant="h5" color="primary">Documentation</Typography>
			<Box display='flex' flexDirection='row' justifyContent='space-between'>
			    
			<p>
			    Explore the Docs
			</p>
			<PageviewIcon color='primary' />
			</Box>			
		    </Card >
		</MLink>

		<MLink href="https://github.com/sheunaluko/tidyscripts">
		    <Card style={card_style}>
			<Typography variant="h5" color="primary">Github</Typography>
			<Box display='flex' flexDirection='row' justifyContent='space-between'>
			
			<p>
			    See the Source Code
			</p>
			<GitHubIcon color='primary'/>			
			</Box>
		    </Card >
		</MLink>

		
		<MLink href="/about">
		    <Card style={card_style}>
			<Typography variant="h5" color="primary">About</Typography>
			<Box display='flex' flexDirection='row' justifyContent='space-between'>

			<p>
			    The Origin
			</p>
			<InfoIcon color='primary' />						
			</Box>
		    </Card >
		</MLink>
		
		


		
	    </Box>
	</Box>
    )
}

export default Home
