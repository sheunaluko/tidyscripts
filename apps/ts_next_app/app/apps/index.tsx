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
	  
	  <MLink href="/apps/automate_care">
	      <Card style={card_style}>
		  <Typography variant="h5" color="primary">Automate.Care</Typography>
		  <p>
		      AI-Powerered Clinical Decision Support Tool 
		  </p>
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
