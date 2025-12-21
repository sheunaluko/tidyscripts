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

//import {theme} from "./theme"

declare var window : any ;

import {
    Box,
    Grid,
    Typography ,
    Card ,
    Button,
    AppShortcutIcon,
    ScienceIcon ,
    PageviewIcon,
    ArticleIcon,
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
    let R = "17px"

    
    const MLink = ({ style, ...props }: any) => {
	return <Link {...props} style={{ textDecoration: 'none', display: 'block', ...style }} />;
    };


    const card_style : any  = {
	padding : "16px" ,
	cursor : 'pointer' ,
	height: "100%",
	width: "100%"
    }

    const links = [
    
	{ href: "/apps", title: "App Library", description: "Mature Applications", icon: <AppShortcutIcon color='primary' /> },
	{ href: "/laboratory", title: "Laboratory", description: "Prototypes and Experiments", icon: <ScienceIcon color='primary' /> },
	{ href: "/docs/index.html", title: "Documentation", description: "Explore the Docs", icon: <PageviewIcon color='primary' /> },
	{ href: "/blog", title: "Blog", description: "The Tidyscripts Blog", icon: <ArticleIcon color='primary' /> },
	{ href: "https://github.com/sheunaluko/tidyscripts", title: "Github", description: "See the Source Code", icon: <GitHubIcon color='primary' /> },
	{ href: "/about", title: "About", description: "The Origin", icon: <InfoIcon color='primary' /> },
    ]; 



    
    
    return (
	<Box
	    display='flex'
	    flexDirection='column'
	    alignItems='center'
	    style={{width: "100%", height: "100%", padding : "2%"}}
	>
	    <br/>
	    <Box className={styles.title}>
		<Typography variant="h2" color='primary.main'>
		    Tidyscripts
		</Typography>
	    </Box>

	    <Box className={styles.description}>
		<Typography variant="h4" >
		    Powerful tools for serious builders and users
		</Typography>
	    </Box>

	    <Grid container spacing={6} sx={{
	    maxWidth: 1200,
	    mt: 2 ,
	    paddingLeft : "30px",
	    paddingRight : "30px"  }}>
		{links.map((link) => (
		    <Grid item xs={12} sm={6} lg={6} key={link.href} sx={{ display: 'flex', justifyContent: 'center' }}>
			<MLink href={link.href} style={{ width: '100%' }}>
			    <Card style={card_style}>
				<Typography variant="h5" color="primary">{link.title}</Typography>
				<Box display='flex' flexDirection='row' justifyContent='space-between' alignItems='center' mt={1}>
				    <p style={{ margin: 0 }}>{link.description}</p>
				    {link.icon}
				</Box>
			    </Card>
			</MLink>
		    </Grid>
		))}
	    </Grid>
	</Box>
    )
}

export default Home
