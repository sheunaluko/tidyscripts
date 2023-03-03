import type { NextPage } from 'next'
import {useEffect} from 'react' ; 
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
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

import TFooter from '../components/Footer' ; 

const msgs = ["Tidyscripts", "ok"]  ;


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
	      <Link href="/resources/docs/index.html">
		  <Card style={card_style}>
		      <h2>Documentation &rarr;</h2>
		      <p>Explore Tidyscripts features and API.</p>
		  </Card >
	      </Link>

	      <Link href="https://github.com/sheunaluko/tidyscripts">
		  <Card style={card_style}>
		      <h2>Github &rarr;</h2>
		      <p>See the source.</p>
		  </Card >
	      </Link>

	      <Link href="/applab/aidx">
		  <Card style={card_style}>
		      <h2>AI Diagnostics [Aidx] &rarr;</h2>
		      <p>
			  Aidx performs clinical decision support using Artifical Intelligence,
			  and is powered by OpenAI and Tidyscripts
		      </p>
		  </Card >
	      </Link>

	      <Link href="/applab">
		  <Card style={card_style}>
		      <h2>App Lab &rarr;</h2>
		      <p>A collection of powerful and portable web applications for Chrome and Safari

		      </p>
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
		  Welcome to <a href="https://github.com/sheunaluko/tidyscripts"> { props.msg } </a>
              </h1>

              <p className={styles.description}>
		  An elegant tool for serious builders. 
              </p>


              <Flex >
		  <AllLinks />
              </Flex>
	      
	  </main>


      	  <TFooter/> 

	  
      </div>
  )
}

export default Home
