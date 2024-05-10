'use client';

import type { NextPage } from 'next'

import {useEffect, useState } from 'react' ;
import React from 'react' ; 
import styles from '../styles/Default.module.css'
import { Button, ButtonGroup,Textarea, Spinner, Box, useToast, useDisclosure, Select, Flex, Icon} from '@chakra-ui/react'
import { PhoneIcon, AddIcon, WarningIcon, SettingsIcon, HamburgerIcon } from '@chakra-ui/icons'
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Card
} from '@chakra-ui/react'


import {theme,
	secondary,
	primary,
	grey } from "../app/theme" 



import * as tsw from "tidyscripts_web"  ; 
const log = tsw.common.logger.get_logger({id:"drawer"}) ;

import {toast_toast} from "./Toast" ; 

declare var window : any ;

const card_style : any  = {
  padding : "10px" ,
  marginBottom : "10px" ,
  cursor : 'pointer' , 
} 


export default function Component(props : any) {

  const { isOpen, onOpen, onClose } = useDisclosure()
  const btnRef : any  = React.useRef()

  let drawerToast = function() {
    toast_toast({
      title : 'Welcome!' ,
      description : 'Explore Tidysripts further and customize your experience' ,
      duration : 3000 , 
      status : 'info' ,
      isClosable : true, 
    }) 
  }


  
  let dev_1 = async function() {
    toast_toast({
      title: 'Feedback' , 
      description: 'For now, please contact sheun.aluko@wustl.edu (We will deploy a feedback interface soon)' , 
      status: 'info',
      duration: 6000,
      isClosable: true,
    }) 
    
  } 
  
  return (

    <Box> 
    <Drawer
    isOpen={isOpen}
    placement='right'
    onClose={onClose}
      finalFocusRef={btnRef}
    >
    <DrawerOverlay />
    <DrawerContent>
      <DrawerCloseButton />
      <DrawerHeader>Menu</DrawerHeader>

      <DrawerBody>

	  <Card style={card_style}>
	    <h2>Feedback</h2>
	    <p onClick={
	    dev_1
	    }> Tell us how we can improve</p>
	  </Card >
	
	
      </DrawerBody>

      
    </DrawerContent>
    </Drawer>

    <Button
	style={{
	    backgroundColor : grey[50] , 
	    color : primary 
	}}

	ref={btnRef} size="sm"  onClick={function(){onOpen();  drawerToast()}} >
      <Icon as={HamburgerIcon} boxSize={4} />
    </Button>

    
    </Box>

  )
} 





