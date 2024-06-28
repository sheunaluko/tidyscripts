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
import useInit from "../hooks/useInit" 

import {theme} from "./theme"

declare var window : any ;

import {
    Box,
    Typography ,
    Card ,
    Button
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
		theme 
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
    const card_style : any  = {
	padding : "10px" ,
	marginBottom : "10px" ,
	cursor : 'pointer' , 
    }

    let R = "17px"
    
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


	    <Box
		display='flex'
		flexDirection='column'
		alignItems='center'
		justifyContent='top'
		flexGrow={1}
		style={{width: "100%"}}
	    >
		<Box
		    style={{
			borderStyle : "solid",
			borderWidth : 2,
			borderRadius : R,
			borderColor : "gray", 
			padding : "4px"  ,
			marginBottom : "15px" 
		    }} >
		    <Link href="/apps">
			<p style={{padding: "5px"}}>
			    App Library
			</p>
		    </Link>		  
		</Box>

		<Box
		    style={{
			borderStyle : "solid",
			borderWidth : 2,
			borderRadius : R,
			borderColor : "gray", 			
			padding : "4px" 
		    }} >
		    <Link href="/resources/docs/index.html">
			<p style={{padding: "5px"}}>
			    Docs 
			</p>
		    </Link>		  
		</Box>



		
	    </Box>
	</Box>
    )
}

export default Home
