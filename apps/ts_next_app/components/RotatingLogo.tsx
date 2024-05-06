'use client' ; 

import React, { useState, useEffect } from "react";

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
    shouldForwardProp,
    Link, 
} from "@chakra-ui/react";

import { chakra } from '@chakra-ui/react'
import { motion, isValidMotionProp } from 'framer-motion'


const RL = (props: any) => {

    const ChakraBox = chakra(motion.div, {
	/**
	 * Allow motion props and non-Chakra props to be forwarded.
	 */
	shouldForwardProp: (prop) => isValidMotionProp(prop) || shouldForwardProp(prop),
    });


    
    let [logo_dims,set_logo_dims] = useState( { x : "30px" , y : "30px" } )  ;

    
    useEffect(() => {

	if (props.logo_dims) {
	    set_logo_dims(props.logo_dims) 
	} 


    }, []);

    return (
		<ChakraBox
		    animate={{
			rotate: (true ? [0, 90, 180, 270, 360]  : 0 ) 
		    }}

		    // @ts-ignore no problem in operation, although type error appears.
		    transition={{
			duration: 5,
			ease: "easeInOut",
			repeat: Infinity,
			repeatType: "loop",
		    }}

		    display="flex"
		    justifyContent="center"
		    alignItems="center"
		    marginLeft="10px"
		    marginRight="10px"
		>
		<Image id="logo_img" src="/tidyscripts_logo.png" alt="Tidyscripts Logo" width={logo_dims.x} height={logo_dims.y} borderRadius="full" />
		</ChakraBox>
    );
};

export default RL;
