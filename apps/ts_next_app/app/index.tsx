'use client';

import React from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
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
    Typography 
    
} from "../src/mui" 

const log = tsw.common.logger.get_logger({id:"app/index"}) ; 

const Home: NextPage = (props : any) => {

    let init = async function() {

    /* Assign tidyscripts library to window */
      if (typeof window !== 'undefined') { 
	  Object.assign(window, {
	      tsw ,
	      toast_toast,
	      firebase 
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
  
  return (

      <Box
	  display='flex'
	  flexDirection='column'
	  alignItems='center'
	  style={{width: "100%"}}
      >
	  <Box>
              <Typography variant="h1" color={theme.palette.primary.main}>
		  Tidyscripts
              </Typography>
	  </Box> 

	  <Box> 
              <Typography variant="h4" color={theme.palette.primary.main}>
		  Elegant tools for serious builders and users
              </Typography>
	  </Box> 

	      
    </Box>

  )
}

export default Home
