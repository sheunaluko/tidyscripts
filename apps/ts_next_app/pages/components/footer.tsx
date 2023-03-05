import type { NextPage } from 'next'
import {useEffect, Fragment} from 'react' ;

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

function Footer() { 

  return (
	  <footer className={styles.footer}>
              <Link
		  href="/"

              >
	      <Flex style={{"cursor":"pointer"}}
	      	    direction="row"  >
		  Tidyscripts {' '}
		  <RL /> 
		  {'   '}     Copyright © 2023 Sheun Aluko, MD. All rights reserved.    		  </Flex> 
              </Link>
	  </footer>
	    )
}


export default Footer  ; 
