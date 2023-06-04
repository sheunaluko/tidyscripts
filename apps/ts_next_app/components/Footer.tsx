'use client';

import type { NextPage } from 'next'
import { Fragment} from 'react' ;

import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Layout.module.css'
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
  Show
} from "@chakra-ui/react";

import RL from './RotatingLogo' ;
import AuthWidget from './AuthWidget' 


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
	  Copyright © 2023 Sheun Aluko, MD
	</span>
	</Show>
	
	{'   '}
	<div style={{marginLeft : "5px"}}>
	  <AuthWidget />
	</div>
	
      </Flex> 

      
    </footer>
  )
}


export default Footer  ; 
