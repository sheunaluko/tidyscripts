'use client';

import type { NextPage } from 'next'
import { Fragment} from 'react' ;

import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Footer.module.css'
import Link from 'next/link' ; 

import Drawer from '../components/Drawer' ;

import ResponsiveCopyright from "./ResponsiveCopyright" 
import ThemeToggle from "./ThemeToggle"

import {
    Box ,
    Typography ,
    Button 
} from "../src/mui"

import RL from './RotatingLogo' ;
import AuthWidget from './AuthWidget'

import build_info from "../generated/build_info.json"


// @ts-ignore
const build_time = build_info.buildTime

declare var window : any ; 

const Home = function() {
    return ( 
    <Button   
	size="small"
    style={{
	backgroundColor : 'background.paper' , 
	color : 'primary.main' 
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

    return (
	<Box display="flex"
	     flexDirection="column"
	     alignItems="center"
	>
	<Box
	    display="flex" 
	    flexDirection="row"
	    alignItems="center"
	>

	    <CBox>
		<Typography color='primary.main'> 
		    Tidyscripts
		</Typography>
	    </CBox> 

	    <CBox>
		<RL />
	    </CBox>


	    <CBox>
		<ResponsiveCopyright/>
	    </CBox> 

	    <CBox> 
		<AuthWidget />
	    </CBox>

	    <CBox style={{marginLeft : "8px"}}> 
		<Home/> 
	    </CBox>

	    

	    <CBox>
		<ThemeToggle/> 
	    </CBox> 
	    

	    <CBox style={{marginLeft : "8px"}}>  
		<Drawer /> 
	    </CBox>

	</Box>



	    <CBox style={{marginLeft : "8px", }}> 
		  <Typography variant="caption" fontSize={8}>Build v{build_info.version} on {build_time}</Typography> 
	    </CBox>
	


	</Box>

    )
}


export default Footer  ; 
