import type { NextPage } from 'next'
import {useEffect, useState} from 'react' ; 
import Head from 'next/head'
import Image from 'next/image'
import styles from '../../styles/Home.module.css'
import { Button, ButtonGroup,Textarea, Spinner } from '@chakra-ui/react'


import * as tsn from "tidyscripts_node" ;
import * as tsw from "tidyscripts_web"  ; 


const msgs = ["aidx", "is" , "the" , "best"]  ;

export async function getStaticProps(context :any) {
  return {
    props: {msg :  msgs.join(" ") },
  }
  
}

declare var window : any ;

const Home: NextPage = (props : any) => {

    useEffect( ()=>{
        Object.assign(window, {
          ts : tsw , 
        })
    },[])

  var [getting_query , set_getting_query]  = useState( false ) ;
  var [getting_cds   , set_getting_cds]    = useState( false ) ;   

  
  return (
    <div className={styles.container}>
      <Head>
        <title>Tidyscripts</title>
        <meta name="description" content="AIDX (Ai Diagnostics)" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://github.com/sheunaluko/tidyscripts">AI Diagnostics</a>
        </h1>

        <p className={styles.description}>
          An elegant tool Clinical Decision Support. 
        </p>

        <div className={styles.grid}>
	  
          <a href="#" className={styles.card}>
            <h2>One Liner</h2>
            <Textarea id="one_liner" />
          </a>

          <a
            href="#"
            className={styles.card}
          >
            <h2>H&P</h2>
            <Textarea id="hp" />
          </a>

	  
        </div>

	<Button style={{marginTop : "30px"}}>
	  Generate Query
	</Button>

	<Spinner style={{marginTop : "30px", visibility: (getting_query ? 'visible' : 'hidden') }}
		 thickness='4px'
		 speed='0.65s'
		 emptyColor='gray.200'
		 color='blue.500'
		 size='xl'
	/>


	<Button style={{marginTop : "30px" }}>
	  Generate Differential and Workup
	</Button>

	<Spinner style={{marginTop : "30px", visibility: (getting_cds ? 'visible' : 'hidden') }}
		 thickness='4px'
		 speed='0.65s'
		 emptyColor='gray.200'
		 color='blue.500'
		 size='xl'
	
	/>	

	
      </main>

      <footer className={styles.footer}>
        <a
          href="https://sheunaluko.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tidyscripts {' '}
          <span className={styles.logo}>
	    {(()=> {
	      let y = 20 ;
	      let x = Math.floor(1*y) ; 
	      return (
		<Image src="/tidyscripts_logo.png" alt="Tidyscripts Logo" width={x} height={y} />)})()}
          </span>
	  {'   '}     Copyright © 2023 Sheun Aluko, MD. All rights reserved. 
        </a>
      </footer>
    </div>
  )
}

export default Home


/*
   TODO: 
   - implement button click handlers:: 

   -- [ ] handle_getting_query
   tsw.common.apis.openai.aidx.generate_patient_data( {one_liner, hp })
   Extract one_liner from  document.getElementById("one_liner").value
   Extract hp from  document.getElementById("hp").value
   

   -- [ ] handle getting_cds 
   tsw.common.apis.openai.aidx.ai_cds( patient_data ) ; 
   get patient_data from result of query above. 

   -- so first step is implementing and testing the first handler 

 */
