'use client';

import type { NextPage } from 'next'
import { Fragment} from 'react' ;

import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Footer.module.css'
import Link from 'next/link' ; 

import Drawer from '../components/Drawer' ; 

import {
    Button,
} from "@chakra-ui/react"

import {
    Box ,
    Typography 
} from "../src/mui"

import RL from './RotatingLogo' ;
import AuthWidget from './AuthWidget'

import {theme,
	secondary,
	primary,
	grey} from "../app/theme" 



declare var window : any ; 

const Home = function() {
    return ( 
    <Button   
    size="sm"
    style={{
	backgroundColor : grey[50]  , 
	color : primary 
    }}

    onClick={function(){
	window.location.href="/" }
    }> 
    Home
    </Button>
    )
    } 


function Footer() {

    let CBox = Box
    /*
    function({children} : any) {
	return (
	    <Box margin="4px">
		{children} 
	    </Box>
	) 
    }
    */ 

    return (
	<Box
	    display="flex" 
		     flexDirection="row"
		     alignItems="center"
	>

	    <CBox>
		<Typography color={theme.palette.primary.main}> 
		    Tidyscripts
		</Typography>
	    </CBox> 

	    <CBox>
		<RL />
	    </CBox>

	    <CBox>
		<Typography color={theme.palette.primary.main}> 		    
		    Copyright © 2024 Sheun Aluko, MD		
		</Typography>

	    </CBox>

	    <CBox> 
		<AuthWidget />
	    </CBox>

	    <CBox> 
		<Home/> 
	    </CBox>
	    
	    <CBox> 
		<Drawer /> 
	    </CBox>

	</Box> 

    )
}


export default Footer  ; 
