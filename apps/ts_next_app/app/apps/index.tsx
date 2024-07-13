'use client';

import type { NextPage } from 'next'
import {useEffect, Fragment} from 'react' ;

import Link from 'next/link' ;
import styles from '../../styles/Default.module.css'

import * as tsw from "tidyscripts_web"  ; 

import {
    Box,
    Card,
    CardContent,
    Typography
} from "../../src/mui"  ; //  "@chakra-ui/react";

const MLink = ({ ...props }) => {
    // @ts-ignore
    return <Link {...props} style={{textDecoration: 'none' }} />;
};


const card_style : any  = {
  padding : "10px" ,
  marginBottom : "10px" ,
  cursor : 'pointer' , 
} 

const AllLinks = () => {
  return (
      <Box>
	  
	  <MLink href="/apps/cds">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">CDS Tool </Typography>
		  <p>
		      Clinical Decision Support Tool 
		  </p>
	      </Card >
	  </MLink>

	  <MLink href="/apps/cortex">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Cortex </Typography>
		  <p>
		      A next generation AI assistant 
		  </p>
	      </Card >
	  </MLink>

	  
	  <MLink href="/apps/aidx">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">AI Diagnostics [Aidx] </Typography>
		  <p>
		      Aidx performs clinical decision support using Artifical Intelligence,
		      and is powered by OpenAI and Tidyscripts
		  </p>
	      </Card >
	  </MLink>

	  <MLink href="/apps/medications">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Medications </Typography>
		  <p>
		      Helpful Clinical utilities for working with Medications  
		  </p>
	      </Card >
	  </MLink>	  

	  <MLink href="/apps/microbiology">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Microbiology </Typography>
		  <p>Antiobiogram on Steroids (in progress)</p>
	      </Card >
	  </MLink>	  

	  <MLink href="/apps/bokeh">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Bokeh Interface </Typography>
		  <p>
		      Interface to the Bokeh graphing library
		  </p>
	      </Card >
	  </MLink>	  
	  
	  <MLink href="/apps/vip">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Voice Interface Panel [VIP] </Typography>
		  <p>Configure browser Speech Recognition and Text-to-Speech</p>
	      </Card >
	  </MLink> 


	  
	  <MLink href="/apps/log_interface">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Log Input Panel [LIP] </Typography>
		  <p>Store logs securely on your device</p>
	      </Card >
	  </MLink>



	  <MLink href="/apps/local_storage_interface">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Local Storage Interface </Typography>
		  <p>User Interface for editing the LocalStorage object of your devices browser</p>
	      </Card >
	  </MLink>

	  
	  <MLink href="/apps/console_ui">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Console Interface </Typography>
		  <p>User Interface for interacting with browser console (useful for debugging mobile apps)</p>
	      </Card >
	  </MLink>

	  <MLink href="/apps/device_orientation">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Orientation Sensor </Typography>
		  <p>User Interface for visualizing the device orientation</p>
	      </Card >
	  </MLink>

	  <MLink href="/apps/mimi">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">MIMI </Typography>
		  <p>Modular Interface for Midi Input</p>
	      </Card >
	  </MLink>

	  

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

        <Box >
	  <AllLinks />
        </Box>

    </>
  )
}

export default Component
