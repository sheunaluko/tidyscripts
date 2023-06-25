'use client';

import type { NextPage } from 'next'
import {useEffect, Fragment} from 'react' ;

import Link from 'next/link' ;
import styles from '../../styles/Default.module.css'

import * as tsw from "tidyscripts_web"  ; 

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



const card_style : any  = {
  padding : "10px" ,
  marginBottom : "10px" ,
  cursor : 'pointer' , 
} 

const AllLinks = () => {
  return (
    <Box>


      <Link href="/apps/aidx">
	<Card style={card_style}>
	  <h2>AI Diagnostics [Aidx] &rarr;</h2>
	  <p>
	    Aidx performs clinical decision support using Artifical Intelligence,
	    and is powered by OpenAI and Tidyscripts
	  </p>
	</Card >
      </Link>

      <Link href="/apps/vip">
	<Card style={card_style}>
	  <h2>Voice Interface Panel [VIP] &rarr;</h2>
	  <p>Configure browser Speech Recognition and Text-to-Speech</p>
	</Card >
      </Link>

      <Link href="/apps/log_interface">
	<Card style={card_style}>
	  <h2>Log Input Panel [LIP] &rarr;</h2>
	  <p>Store logs securely on your device</p>
	</Card >
      </Link>



      <Link href="/apps/local_storage_interface">
	<Card style={card_style}>
	  <h2>Local Storage Interface &rarr;</h2>
	  <p>User Interface for editing the LocalStorage object of your device's browser</p>
	</Card >
      </Link>

      
      <Link href="/apps/console_ui">
	<Card style={card_style}>
	  <h2>Console Interface &rarr;</h2>
	  <p>User Interface for interacting with browser console (useful for debugging mobile apps)</p>
	</Card >
      </Link>

      <Link href="/apps/device_orientation">
	<Card style={card_style}>
	  <h2>Orientation Sensor &rarr;</h2>
	  <p>User Interface for visualizing the device orientation</p>
	</Card >
      </Link>

      

    </Box>
  );
};


const Component : NextPage = (props : any) => {

  return (

    <>

      
        <h1 className={styles.title}>
          <a href="https://github.com/sheunaluko/tidyscripts"> Tidyscripts Apps </a>
        </h1>

        <p className={styles.description}>
          Powerful and portable web applications.
        </p>

        <Flex >
	  <AllLinks />
        </Flex>

    </>
  )
}

export default Component
