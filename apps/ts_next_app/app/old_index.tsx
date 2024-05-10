'use client';

import React from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Link from 'next/link' ; 
import { useAuthState } from 'react-firebase-hooks/auth';


import * as tsw from "tidyscripts_web"  ;
import {toast_toast} from "../components/Toast"
import * as firebase from "../src/firebase" 
import useInit from "../hooks/useInit" 

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Flex , 
  Card,
} from "@chakra-ui/react";

declare var window : any ;


const card_style : any  = {
  padding : "10px" ,
  marginBottom : "10px" ,
  cursor : 'pointer' , 
}


const log = tsw.common.logger.get_logger({id:"app/index"}) ; 

const AllLinks = () => {


  
  return (
    <Box>

      
      <Link href="/resources/docs/index.html">
	<Card style={card_style}>
	  <h2>Documentation &rarr;</h2>
	  <p>Explore Tidyscripts features and API</p>
	</Card >
      </Link>

      <Link href="/apps/aidx">
	<Card style={card_style}>
	  <h2>AI Diagnostics [Aidx] &rarr;</h2>
	  <p>
	    Powered by OpenAI and Tidyscripts, Aidx performs AI-Enhanced Clinical Decision Support	  </p>
	</Card >
      </Link>

      <Link href="/apps">
	<Card style={card_style}>
	  <h2>Apps &rarr;</h2>
	  <p>Our collection of powerful and portable web applications for Chrome and Safari
	  </p>
	</Card >
      </Link>

      <Link href="/login">
	<Card style={card_style}>
	  <h2>Login &rarr;</h2>
	  <p>Login to Tidyscripts for an enhanced user experience
	  </p>
	</Card >
      </Link>

      <Link href="https://github.com/sheunaluko/tidyscripts">
	<Card style={card_style}>
	  <h2>Github &rarr;</h2>
	  <p>See the source code</p>
	</Card >
      </Link>
      
      

    </Box>
  );
};


const Home: NextPage = (props : any) => {

  let init = async function() {
    /*
       Assign tidyscripts library to window 
     */

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

  }

  let clean_up = ()=> { log("index unmounted") }

  useInit({ init , clean_up })  //my wrapper around useEffect 
  

  return (

    <React.Fragment>
              <h1 className={styles.title}>
		  Welcome to <a href="https://github.com/sheunaluko/tidyscripts"> { "Tidyscripts" } </a>
              </h1>

              <p className={styles.description}>
		  Elegant tools for serious builders and users
              </p>

	      
              <Flex >
		  <AllLinks />
              </Flex>
	      
    </React.Fragment>

  )
}

export default Home
