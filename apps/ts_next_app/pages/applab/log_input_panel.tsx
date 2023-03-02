import React, { useState, useEffect, useRef } from "react";

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
    Flex, 
    Image,
    Avatar,
    Text, 
    shouldForwardProp,
    Container ,
    Grid,
    GridItem, 
    Divider, 
    Progress,
    CircularProgress, 
    List,
    ListItem, 
} from "@chakra-ui/react";

import {
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
} from '@chakra-ui/react'

import { chakra } from '@chakra-ui/react'
import { motion, isValidMotionProp } from 'framer-motion'
import * as tsw from "tidyscripts_web"

import RL from './RotatingLogo' ;



export default function Component() { 
    

    let log = tsw.common.logger.get_logger({id:'lip'}) ; 
    
    const [state ,setState ] = useState({} as any)

    var init = async function(){

	//init script 
	let ready = function() { 
	    return true ; 
	}
	await tsw.common.asnc.wait_until(ready, 3000, 500 ) ; 
	log(`Init script started...`) ; 

	tsw.apis.local_storage.set_storage_header("tidyscripts")
    } 

    useEffect( () => {

	init() 
	
	return function result_cleanup() {
	    //window.removeEventListener('tidyscripts_web_speech_recognition_result' , voice_result_handler)
	}
	
    }, [])

    const dm = "10px" 
    
    return ( 
	
	<Container > 
	    <Flex
		direction="column" 
		padding="20px">

		<Flex direction="row" justifyContent="space-between">
		    <Text fontSize="2xl"> Log Input Panel </Text>
		    <RL/>
		</Flex>

		<Divider marginTop={dm} marginBottom={dm} />

		<Text marginTop={0} marginBottom={dm}> Section 1    </Text>

	

		<Divider marginTop={dm} marginBottom={dm} />		
		
		<Box >
		    
		    <Text marginTop={0} marginBottom={dm}> Section 2      </Text>
		    
		    
		</Box>	    
		

	    </Flex> 
	    
	</Container> 
    )

}



