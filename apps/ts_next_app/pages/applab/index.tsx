import type { NextPage } from 'next'
import {useEffect} from 'react' ; 
import Head from 'next/head'
import Image from 'next/image'
import styles from '../../styles/Home.module.css'
import Link from 'next/link' ; 

import * as tsn from "tidyscripts_node" ;
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

import RL from './RotatingLogo' ; 

const msgs = ["App Lab", "ok"]  ;



export async function getStaticProps(context :any) {

  return {
      props: {msg :  tsn.common.fp.first(msgs) },
  }
}

declare var window : any ;


const card_style : any  = {
  padding : "10px" ,
  marginBottom : "10px" ,
  cursor : 'pointer' , 
} 

const AllLinks = () => {
  return (
      <Box>

	  <Card style={card_style}>


	      <Link href="/applab/aidx">
		  <Card style={card_style}>
		      <h2>AI Diagnostics [Aidx] &rarr;</h2>
		      <p>
			  Aidx performs clinical decision support using Artifical Intelligence,
			  and is powered by OpenAI and Tidyscripts
		      </p>
		  </Card >
	      </Link>

	      <Link href="/applab/vip">
		  <Card style={card_style}>
		      <h2>Voice Interface Panel [VIP] &rarr;</h2>
		      <p>Configure browser Speech Recognition and Text-to-Speech</p>
		  </Card >
	      </Link>

	      <Link href="/applab/log_input_panel">
		  <Card style={card_style}>
		      <h2>Log Input Panel [LIP] &rarr;</h2>
		      <p>Store logs securely on your device</p>
		  </Card >
	      </Link>


	      <Link href="/applab/local_storage_ui">
		  <Card style={card_style}>
		      <h2>LocalStorage Editor &rarr;</h2>
		      <p>User Interface for editing the LocalStorage object of your device</p>
		  </Card >
	      </Link>

	      
	      
	  </Card>	  

      </Box>
  );
};


const Home: NextPage = (props : any) => {

  useEffect( ()=>{
        Object.assign(window, {
            tsw , 
        })
    },[])

  return (
    <div className={styles.container}>
      <Head>
        <title>Tidyscripts</title>
        <meta name="description" content="A typescript developer oasis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to the <a href="https://github.com/sheunaluko/tidyscripts"> { props.msg } </a>
        </h1>

        <p className={styles.description}>
          An collection of powerful and portable web applications for Chrome and Safari
        </p>


        <Flex >
	  <AllLinks />
        </Flex>
	
      </main>


	  <footer className={styles.footer}>
              <a
		  href="https://www.tidyscripts.com"	  
              >
		  Tidyscripts {' '}
		  <RL /> 
		  {'   '}     Copyright © 2023 Sheun Aluko, MD. All rights reserved. 
              </a>
	  </footer>


    </div>
  )
}

export default Home
