'use client';

import type { NextPage } from 'next'
import { Fragment} from 'react' ;

import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Footer.module.css'
import Link from 'next/link' ; 

import Drawer from '../components/Drawer' ; 

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
  Show
} from "@chakra-ui/react";

import RL from './RotatingLogo' ;
import AuthWidget from './AuthWidget'

declare var window : any ; 

const Home = (
    <Button size="sm" onClick={function(){
	if (typeof window != "undefined") { 
	window.location.href="/" }
    }}>
    Home
  </Button>
  
)

function Footer() { 

  return (
    <footer className={styles.footer}>
      <Flex 
	direction="row"
	  alignItems="center"
      >

	<Link
	  href="/"

	>

	  Tidyscripts
	  {' '}
	  <RL /> 
	  {'   '}

	</Link>


	<Show above="sm">
	  <span>
	    Copyright © 2024 Sheun Aluko, MD
	  </span>
	</Show>
	
	{'   '}
	<div style={{marginLeft : "5px"}}>
	  <AuthWidget />
	</div>
	<div style={{marginLeft : "5px"}}>
	  {Home}
	</div>
	<div style={{marginLeft : "5px"}}>
	  <Drawer /> 
	</div>
	

	
      </Flex> 

      
    </footer>
  )
}


export default Footer  ; 
